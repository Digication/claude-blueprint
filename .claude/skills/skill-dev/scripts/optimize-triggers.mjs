#!/usr/bin/env node
/**
 * optimize-triggers.mjs
 *
 * Tests and improves a skill's `description` field for trigger accuracy.
 * Measures precision, recall, and F1 against a set of should/should-not trigger queries.
 * Iteratively improves the description using Claude with extended thinking.
 *
 * Usage:
 *   node optimize-triggers.mjs <skill-path> [--max-rounds N] [--dry-run]
 *
 * Options:
 *   --max-rounds N   Max optimization iterations (default: 5)
 *   --dry-run        Generate query set and score, but don't optimize
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── YAML frontmatter parser (reuse pattern from run-eval.mjs) ────────────────

function parseSkillMd(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error('No YAML frontmatter found in SKILL.md');
  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*([\s\S]*?)(?=\n\w|\n$)/m);
  return {
    name: nameMatch?.[1]?.trim() || '',
    description: descMatch?.[1]?.trim().replace(/^\||\s*\n\s*/g, ' ').trim() || '',
    raw: content,
  };
}

// ─── Query generation ─────────────────────────────────────────────────────────

async function generateQuerySet(skillName, skillContent, otherSkillNames) {
  const prompt = `You are designing test queries for a Claude Code skill trigger evaluation.

Skill name: ${skillName}
Skill content:
${skillContent.slice(0, 3000)}

Other skills that exist (and should NOT be confused with this one):
${otherSkillNames.join(', ')}

Generate exactly 20 test queries — 10 should trigger this skill, 10 should NOT.

Rules for SHOULD-TRIGGER queries:
- Realistic phrases a Claude Code user would actually type
- Mix of formal and casual, short and long
- Include uncommon use cases and edge cases where the skill SHOULD fire
- Some should be indirect ("I need to..." not just the skill name)

Rules for SHOULD-NOT-TRIGGER queries:
- Near-misses that share keywords with this skill but need something different
- Adjacent domains, ambiguous phrasing
- NOT obviously irrelevant — "write fibonacci" is useless as a negative test

Format as JSON:
{
  "queries": [
    {"query": "...", "should_trigger": true, "reason": "..."},
    {"query": "...", "should_trigger": false, "reason": "..."}
  ]
}`;

  const result = spawnSync('claude', ['-p', prompt, '--output-format', 'text'],
    { encoding: 'utf8', timeout: 60000 });
  const output = result.stdout || '';
  const jsonMatch = output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse query set from Claude response');
  return JSON.parse(jsonMatch[0]).queries;
}

// ─── Trigger testing ──────────────────────────────────────────────────────────

function testTrigger(query, description, skillName, runs = 3) {
  const prompt = `You are a Claude Code assistant. You have access to one skill:

Skill name: ${skillName}
Skill description: ${description}

A user has sent this message:
"${query}"

Would you invoke this skill to help with this request? Answer with ONLY "yes" or "no".`;

  let triggered = 0;
  for (let i = 0; i < runs; i++) {
    const result = spawnSync('claude', ['-p', prompt, '--output-format', 'text'],
      { encoding: 'utf8', timeout: 30000 });
    const output = (result.stdout || '').toLowerCase().trim();
    if (output.startsWith('yes')) triggered++;
  }
  return { triggered, total: runs, rate: triggered / runs };
}

function scoreQuerySet(queries, description, skillName) {
  const threshold = 0.5; // majority of runs must agree
  let tp = 0, fp = 0, fn = 0, tn = 0;
  const results = [];

  for (const q of queries) {
    const { rate } = testTrigger(q.query, description, skillName);
    const didTrigger = rate >= threshold;
    const shouldTrigger = q.should_trigger;

    if (shouldTrigger && didTrigger) tp++;
    else if (!shouldTrigger && didTrigger) fp++;
    else if (shouldTrigger && !didTrigger) fn++;
    else tn++;

    results.push({ ...q, trigger_rate: rate, triggered: didTrigger });
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  return { precision, recall, f1, tp, fp, fn, tn, results };
}

// ─── Description improvement ──────────────────────────────────────────────────

async function improveDescription(currentDesc, scoreResult, history, skillContent) {
  const failed = scoreResult.results.filter(r => r.should_trigger && !r.triggered);
  const falsePositives = scoreResult.results.filter(r => !r.should_trigger && r.triggered);

  const historyStr = history.map((h, i) =>
    `Attempt ${i + 1} (F1: ${h.f1.toFixed(2)}): "${h.description}"`
  ).join('\n');

  const prompt = `You are improving a Claude Code skill's description field for trigger accuracy.

Current description (F1: ${scoreResult.f1.toFixed(2)}):
"${currentDesc}"

Queries that SHOULD trigger but DON'T (missed):
${failed.map(q => `- "${q.query}" (reason: ${q.reason})`).join('\n') || '(none)'}

Queries that SHOULD NOT trigger but DO (false positives):
${falsePositives.map(q => `- "${q.query}" (reason: ${q.reason})`).join('\n') || '(none)'}

Previous attempts (to avoid repeating):
${historyStr || '(first attempt)'}

Skill content (for context):
${skillContent.slice(0, 2000)}

Write an improved description. It must:
- Be under 1024 characters
- Start with a third-person action statement
- Include "Use when..." or "Trigger on..." with specific trigger phrases
- Include "Do NOT trigger when..." if false positives are an issue
- Be meaningfully different from previous attempts

Return ONLY the new description text between <new_description> tags.`;

  const result = spawnSync('claude', ['-p', prompt, '--output-format', 'text'],
    { encoding: 'utf8', timeout: 90000 });
  const output = result.stdout || '';
  const match = output.match(/<new_description>([\s\S]*?)<\/new_description>/);
  if (!match) throw new Error('Could not parse improved description from response');
  return match[1].trim().slice(0, 1024);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error('Usage: node optimize-triggers.mjs <skill-path> [--max-rounds N] [--dry-run]');
    process.exit(1);
  }

  const skillPath = resolve(args[0]);
  const maxRoundsIdx = args.indexOf('--max-rounds');
  const maxRounds = maxRoundsIdx !== -1 ? parseInt(args[maxRoundsIdx + 1], 10) : 5;
  const dryRun = args.includes('--dry-run');

  const skillContent = readFileSync(join(skillPath, 'SKILL.md'), 'utf8');
  const { name: skillName, description: currentDesc } = parseSkillMd(skillContent);

  // Find other skill names for negative test context
  const skillsDir = resolve(skillPath, '../../');
  const otherSkills = execSync(`ls "${skillsDir}" 2>/dev/null || true`)
    .toString().trim().split('\n').filter(s => s && s !== skillName);

  console.log(`Optimizing triggers for: ${skillName}`);
  console.log(`Current description (${currentDesc.length} chars):\n"${currentDesc}"\n`);

  // Generate query set
  console.log('Generating query set...');
  const allQueries = await generateQuerySet(skillName, skillContent, otherSkills);

  // Train/test split (60/40, stratified by should_trigger)
  const shouldTrigger = allQueries.filter(q => q.should_trigger);
  const shouldNot = allQueries.filter(q => !q.should_trigger);
  const trainSize = Math.floor(shouldTrigger.length * 0.6);
  const trainQueries = [...shouldTrigger.slice(0, trainSize), ...shouldNot.slice(0, Math.floor(shouldNot.length * 0.6))];
  const testQueries = [...shouldTrigger.slice(trainSize), ...shouldNot.slice(Math.floor(shouldNot.length * 0.6))];

  console.log(`Query set: ${trainQueries.length} train, ${testQueries.length} test\n`);

  if (dryRun) {
    console.log('Query set (dry run):');
    for (const q of allQueries) {
      console.log(`  [${q.should_trigger ? 'SHOULD' : 'NOT   '}] ${q.query}`);
    }
    return;
  }

  // Initial score on train set
  console.log('Scoring current description on train set...');
  let bestDesc = currentDesc;
  let bestScore = scoreQuerySet(trainQueries, currentDesc, skillName);
  let bestTestScore = scoreQuerySet(testQueries, currentDesc, skillName);
  console.log(`  Train F1: ${bestScore.f1.toFixed(2)}  Test F1: ${bestTestScore.f1.toFixed(2)}\n`);

  const history = [];

  for (let round = 1; round <= maxRounds; round++) {
    if (bestScore.f1 >= 0.95) {
      console.log(`F1 >= 0.95 on train set. Stopping early.`);
      break;
    }

    console.log(`Round ${round}/${maxRounds}: improving description...`);
    const newDesc = await improveDescription(bestDesc, bestScore, history, skillContent);
    const trainScore = scoreQuerySet(trainQueries, newDesc, skillName);
    const testScore = scoreQuerySet(testQueries, newDesc, skillName);

    console.log(`  Train F1: ${trainScore.f1.toFixed(2)}  Test F1: ${testScore.f1.toFixed(2)}`);
    console.log(`  New description: "${newDesc.slice(0, 80)}..."\n`);

    history.push({ description: newDesc, f1: trainScore.f1, test_f1: testScore.f1 });

    if (testScore.f1 > bestTestScore.f1) {
      bestDesc = newDesc;
      bestScore = trainScore;
      bestTestScore = testScore;
    }
  }

  // Report
  console.log('\n── Results ─────────────────────────────────────────────────────');
  console.log(`Original description F1:  train=${scoreQuerySet(trainQueries, currentDesc, skillName).f1.toFixed(2)}`);
  console.log(`Best description F1:      train=${bestScore.f1.toFixed(2)}  test=${bestTestScore.f1.toFixed(2)}`);
  if (bestDesc !== currentDesc) {
    console.log('\nBest description:');
    console.log(`"${bestDesc}"`);
    console.log('\nTo apply this, update the description field in SKILL.md.');
  } else {
    console.log('\nNo improvement found. Current description may already be optimal.');
  }

  // Save results
  const outputPath = join(skillPath, '.plugin-data', `triggers-${Date.now()}.json`);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify({
    skillName, originalDescription: currentDesc,
    bestDescription: bestDesc,
    scores: { original: { f1: scoreQuerySet(trainQueries, currentDesc, skillName).f1 }, best: { train_f1: bestScore.f1, test_f1: bestTestScore.f1 } },
    history, queries: allQueries,
  }, null, 2));
  console.log(`\nFull results saved to: ${outputPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
