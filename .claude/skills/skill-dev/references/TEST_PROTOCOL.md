# Test Protocol

> Agent prompt template for simulating skill execution.

## Agent Prompt Template

```
You are testing the `{skill_name}` skill by simulating execution with specific inputs.

THIS IS A DRY-RUN. You only have Read, Glob, and Grep tools. Report all output — do not write anything.

## Files to Read
1. {skill_path}/SKILL.md
2. All files in {skill_path}/references/
3. Any files referenced by the skill (output styles, settings, etc.)

## Simulated Inputs
{simulated_inputs}

## Instructions
1. Follow the skill's workflow step by step with inputs above
2. At each decision point, show: Input → Rule matched → Result
3. Generate exact output the skill would produce
4. Flag: ambiguous instructions, multiple rule matches, no rule matches, inconsistencies

## Report Format

### Inputs
[List each input]

### Decision Trace
[Input → Rule → Result for each decision]

### Generated Output
[Exact file content that would be written]

### Settings Changes
[Key-value pairs]

### Issues Found
[Severity: Bug / Ambiguity / Gap — or "None"]

### Verdict
[PASS / FAIL / AMBIGUOUS]
```

## Review-Type Cases

When the test case simulates a **review** command (e.g., `/skill-dev review <skill>`), the agent must produce a realistic review report — not just trace the workflow. The standard template above is not sufficient for review cases.

**Additional instructions for review-type agents:**

```
## IMPORTANT: Review Simulation Rules

You are simulating a REVIEW of a real skill. You MUST:

1. READ the target skill file at {skill_path}/SKILL.md and all its references BEFORE writing any findings
2. Every finding MUST reference specific content from the file — cite the line, section, or exact text
3. NEVER use conditional language ("if the skill has...", "if this uses...") — you have the file, check it
4. Walk through EVERY section of CHECKLIST.md and state the result:
   - Metadata Validation: [each item — PASS/FAIL with evidence]
   - Structure: [each item]
   - Content Quality: [each item]
   - Decision Logic: [each item, or N/A if no decision tables]
   - Scripts: [each item, or N/A if no scripts]
   - Effectiveness: [each item]
5. For items that PASS, a one-line note is fine. For items that FAIL, explain what's wrong and how to fix it.

A review that says "could be improved" without saying how, or flags issues without verifying them, will FAIL the quality rubric.
```

**How to detect review-type cases:** If the test case's `inputs.command` contains the word `review`, or if the case's `assert` includes an `llm-rubric` with rubric name "Review Quality", use the review-specific prompt above in addition to the standard template.

## Spawning

- Run independent scenarios in parallel (up to 4)
- Run state-dependent scenarios sequentially
- Each agent gets fresh context — no shared history

## Input Format

Be explicit: `Q1 (Role): "Designer / PM"` not `"test with a beginner"`

Include existing state when relevant: `~/.claude/CLAUDE.md exists: yes/no`

## Scenario Naming

Use descriptive names: `happy-path-beginner`, `override-communication-style`, `boundary-designer-expert`
