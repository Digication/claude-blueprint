#!/usr/bin/env node
/**
 * run-baseline.mjs
 *
 * Baseline comparison for skill-dev: runs each test case twice —
 * once with the skill active, once without — and compares the results.
 *
 * This answers: "Does this skill actually help?"
 *
 * Usage:
 *   node run-baseline.mjs <skill-path> [--cases N]
 *
 * Options:
 *   --cases N    Run only the first N test cases (default: all)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Reuse from run-eval.mjs ──────────────────────────────────────────────────

// Import shared utilities
const runEvalPath = join(__dirname, 'run-eval.mjs');
const { parseYaml, checkAssertion } = await import(runEvalPath);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadSkill(skillPath) {
  const skillMd = readFileSync(join(skillPath, 'SKILL.md'), 'utf8');
  // Load all reference files too
  let refs = '';
  try {
    const refDir = join(skillPath, 'references');
    const refFiles = execSync(`ls "${refDir}" 2>/dev/null || true`).toString().trim().split('\n').filter(Boolean);
    for (const f of refFiles) {
      refs += `\n\n## Reference: ${f}\n\n` + readFileSync(join(refDir, f), 'utf8');
    }
  } catch {}
  return skillMd + refs;
}

function deriveNaturalPrompt(command) {
  // Convert "/skill-dev review commit" → "Review the commit skill for quality issues"
  const stripped = command.replace(/^\/\w[\w-]*\s*/, '').trim();
  const words = stripped.split(' ');
  const mode = words[0] || '';
  const target = words.slice(1).join(' ');

  const mapping = {
    review: `Review the ${target} skill and report any quality issues`,
    test: `Test the ${target} skill and show me the results`,
    integration: `Plan integration tests for the ${target} skill`,
    baseline: `Compare the ${target} skill output with and without the skill`,
    triggers: `Check if the ${target} skill description triggers correctly`,
  };
  return mapping[mode] || `${stripped} — do this task without using any skill`;
}

async function runAgentWithSkill(testCase, skillContent) {
  const prompt = `You have access to this skill:

${skillContent}

---

Now complete this task:
${testCase.inputs.command}

State:
${JSON.stringify(testCase.inputs.state || {}, null, 2)}
`;
  return runAgent(prompt, testCase.name + '-with-skill');
}

async function runAgentWithoutSkill(testCase) {
  const naturalPrompt = testCase.inputs.natural_prompt || deriveNaturalPrompt(testCase.inputs.command);
  const prompt = `Complete this task:
${naturalPrompt}

Context:
${JSON.stringify(testCase.inputs.state || {}, null, 2)}
`;
  return runAgent(prompt, testCase.name + '-without-skill');
}

function runAgent(prompt, label) {
  // Write prompt to temp file
  const tmpFile = `/tmp/baseline-${label}-${Date.now()}.txt`;
  writeFileSync(tmpFile, prompt);

  const result = spawnSync('claude', [
    '-p', readFileSync(tmpFile, 'utf8'),
    '--allowedTools', 'Read,Glob,Grep',
    '--output-format', 'text',
    '--no-cache',
  ], { encoding: 'utf8', timeout: 120000 });

  return {
    label,
    output: result.stdout || '',
    error: result.stderr || '',
    exitCode: result.status,
  };
}

function scoreRun(run, assertions) {
  let passed = 0;
  const results = [];
  for (const assertion of assertions) {
    // Skip llm-rubric assertions (too expensive for baseline)
    if (assertion.type === 'llm-rubric') continue;
    const result = checkAssertion(assertion, run.output);
    results.push({ assertion, passed: result.passed, evidence: result.evidence });
    if (result.passed) passed++;
  }
  const deterministic = assertions.filter(a => a.type !== 'llm-rubric');
  return {
    passed,
    total: deterministic.length,
    passRate: deterministic.length > 0 ? passed / deterministic.length : null,
    details: results,
  };
}

function generateReport(caseResults, skillName) {
  const lines = [
    `# Baseline Comparison: ${skillName}`,
    ``,
    `Compares skill-assisted vs. unassisted agent output for each test case.`,
    ``,
    `| Case | With Skill | Without Skill | Delta | Impact |`,
    `|---|---|---|---|---|`,
  ];

  let totalDelta = 0;
  let counted = 0;

  for (const r of caseResults) {
    const withRate = r.withSkill.passRate !== null ? `${Math.round(r.withSkill.passRate * 100)}%` : 'n/a';
    const withoutRate = r.withoutSkill.passRate !== null ? `${Math.round(r.withoutSkill.passRate * 100)}%` : 'n/a';
    const delta = r.withSkill.passRate !== null && r.withoutSkill.passRate !== null
      ? r.withSkill.passRate - r.withoutSkill.passRate
      : null;
    const deltaStr = delta !== null ? (delta >= 0 ? `+${Math.round(delta * 100)}%` : `${Math.round(delta * 100)}%`) : 'n/a';
    const impact = delta !== null
      ? (delta > 0.1 ? '✅ Helps' : delta < -0.1 ? '⚠️ Hurts' : '— Neutral')
      : '—';

    lines.push(`| ${r.name} | ${withRate} | ${withoutRate} | ${deltaStr} | ${impact} |`);
    if (delta !== null) { totalDelta += delta; counted++; }
  }

  if (counted > 0) {
    const avgDelta = totalDelta / counted;
    lines.push(``, `**Average delta:** ${avgDelta >= 0 ? '+' : ''}${Math.round(avgDelta * 100)}%`);
    lines.push(avgDelta > 0.1
      ? `**Verdict:** The skill demonstrably helps — agents produce better outputs with it.`
      : avgDelta < -0.1
        ? `**Verdict:** ⚠️ The skill may be hurting — agents perform worse with it than without.`
        : `**Verdict:** The skill has neutral impact. Consider whether it's adding real value.`
    );
  }

  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error('Usage: node run-baseline.mjs <skill-path> [--cases N]');
    process.exit(1);
  }

  const skillPath = resolve(args[0]);
  const casesLimitIdx = args.indexOf('--cases');
  const casesLimit = casesLimitIdx !== -1 ? parseInt(args[casesLimitIdx + 1], 10) : Infinity;

  // Load fixtures
  const fixtureFile = join(skillPath, 'tests', 'eval.yaml');
  let fixtures;
  try {
    fixtures = parseYaml(readFileSync(fixtureFile, 'utf8'));
  } catch {
    console.error(`No eval.yaml found at ${fixtureFile}. Run --explore first to create fixtures.`);
    process.exit(1);
  }

  const cases = (fixtures.evals || fixtures.cases || []).slice(0, casesLimit);
  if (cases.length === 0) {
    console.error('No test cases found in eval.yaml.');
    process.exit(1);
  }

  const skillContent = loadSkill(skillPath);
  const skillName = skillPath.split('/').pop();

  console.log(`Running baseline comparison for: ${skillName}`);
  console.log(`Test cases: ${cases.length}`);
  console.log('');

  const caseResults = [];

  for (const testCase of cases) {
    console.log(`  Running: ${testCase.name}...`);
    const [withRun, withoutRun] = await Promise.all([
      runAgentWithSkill(testCase, skillContent),
      runAgentWithoutSkill(testCase),
    ]);

    const assertions = testCase.assert || testCase.assertions || [];
    const withScore = scoreRun(withRun, assertions);
    const withoutScore = scoreRun(withoutRun, assertions);

    caseResults.push({
      name: testCase.name,
      withSkill: { ...withScore, output: withRun.output },
      withoutSkill: { ...withoutScore, output: withoutRun.output },
    });

    const delta = withScore.passRate !== null && withoutScore.passRate !== null
      ? withScore.passRate - withoutScore.passRate
      : null;
    const deltaStr = delta !== null ? (delta >= 0 ? `+${Math.round(delta * 100)}%` : `${Math.round(delta * 100)}%`) : '';
    console.log(`    With skill: ${withScore.passed}/${withScore.total}  Without: ${withoutScore.passed}/${withoutScore.total}  Delta: ${deltaStr}`);
  }

  const report = generateReport(caseResults, skillName);
  console.log('');
  console.log(report);

  // Write JSON results for viewer
  const outputPath = join(skillPath, '.plugin-data', `baseline-${Date.now()}.json`);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify({ skillName, cases: caseResults }, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
