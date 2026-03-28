---
name: skill-dev
description: Review, test, and validate Claude skills. Trigger on review skill, test skill, audit skill, validate SKILL.md, check skill quality, is this skill good, improve this skill, skill pipeline, skill QA. Combines static review, behavioral dry-run testing, and real-world integration testing.
metadata:
  allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/guard-integration.sh"
          timeout: 10
          statusMessage: "Checking command safety for integration tests..."
---

# Skill Development — Review, Test, Validate

Unified skill for the skill quality pipeline. Three modes, run in order:

```
/skill-dev review <skill> → /skill-dev test <skill> → /skill-dev integration <skill>
```

## Available skills
!`ls .claude/skills/`

## Arguments

- `review <skill-name>`: Static quality review against checklist
- `test <skill-name>`: Behavioral dry-run with fresh-context agents
- `test <skill-name> <scenario>`: Run a single named scenario only (skip scenario design, run one agent, produce abbreviated report with no cross-scenario analysis)
- `integration plan <skill-name>`: Create real-world integration test plan
- `integration evaluate`: Read test results and propose fixes
- `<skill-name>`: Auto-detect — review first, then offer to test (see Auto-Detect Flow below)
- (no args): List available skills and ask which to work on (see No-Args Flow below)

### Skill Name Validation

Before any mode runs, validate the skill name: check that `.claude/skills/<skill-name>/SKILL.md` exists. If not, show:

```
Skill '{name}' not found. Available skills:
{bulleted list from ls .claude/skills/}

Which skill would you like to work on?
```

After the user picks a valid skill, continue with the originally requested mode (e.g., if user ran `review badname`, ask for a skill then proceed to review).

### Auto-Detect Flow

When the argument is a bare skill name (no mode keyword):

1. Run Mode 1 (Review) in full
2. After the review report, ask: "Review complete. Want me to test this skill with dry-run scenarios? (yes/no)"
3. If **yes** → proceed to Mode 2 (Test) for the same skill
4. If **no** → done, save review to log and exit

### No-Args Flow

When no arguments are provided:

1. Show the available skills list (populated by the `!`\`ls .claude/skills/\`` injection)
2. Ask: "Which skill would you like to work on?"
3. After the user names a skill, ask: "What would you like to do? (review / test / integration plan)"
4. If the user just names a skill without picking a mode, follow the Auto-Detect Flow above

---

## Mode 1: Review

Static quality review of a skill's structure, metadata, and content.

### Workflow

1. **Check Review History first** — see the Review History section below. If a recent review exists with no changes, offer to skip/re-review/cancel before proceeding.

2. **Run the automated validator** (`node <skill-base-dir>/scripts/validate-skill.mjs /path/to/skill/`), then review against [CHECKLIST.md](references/CHECKLIST.md) — covering metadata, structure, content quality, and effectiveness. See [ALLOWED_TOOLS.md](references/ALLOWED_TOOLS.md) for tool safety guidelines.

Generate a feedback report:

```markdown
# Skill Review: [skill-name]
## Summary — [1-2 sentence assessment]
## Critical Issues (must fix)
## Recommendations (should fix)
## Suggestions (nice to have)
## Strengths
```

Finish with self-critique per [SELF_CRITIQUE.md](references/SELF_CRITIQUE.md) — check if the checklist caught everything or if you relied on intuition.

---

## Mode 2: Test (Dry-Run)

Spawn fresh-context agents to simulate skill execution with defined test scenarios. Each agent reads the skill from scratch and traces through the logic.

### Workflow

1. **Identify the skill** — locate `.claude/skills/<skill-name>/SKILL.md`, read it and all references

2. **Design test scenarios** covering:

   | Category | What to test |
   |---|---|
   | Happy path | Most common expected usage |
   | Boundary cases | Edge of each decision branch |
   | Override logic | User choice overriding a default |
   | Combination gaps | Inputs that might fall through decision tables |
   | Freeform input | "Other" or custom text responses |
   | Idempotency | Running the skill twice with same inputs |

   Scenario count: simple skills 2–3, decision-heavy 4–6, complex 6–8. Present scenarios for approval before running, using this format:

   ```
   | # | Name | Category | What it tests |
   |---|---|---|---|
   | 1 | {name} | {category} | {one-line description} |
   ```

   Ask: "Ready to run these {N} scenarios? (yes/no)"

3. **Run test agents** — for each scenario, spawn an Agent with:
   - **Fresh context** — no conversation history
   - **Read-only tools only** — `Read, Glob, Grep` (enforced via tool restriction, not just instruction)
   - **Structured output** — require the format from [REPORT_FORMAT.md](references/REPORT_FORMAT.md)
   - See [TEST_PROTOCOL.md](references/TEST_PROTOCOL.md) for the agent prompt template

4. **Collect and analyze** — parse reports, cross-check consistency, identify issues:
   - **Bug**: Wrong output
   - **Ambiguity**: Agent had to guess
   - **Gap**: Input combination not covered

5. **Generate test report** — consolidated report with scenarios, detailed results, cross-scenario analysis, issues summary, verdict (PASS/FAIL/PARTIAL)

6. **Self-critique** — follow [SELF_CRITIQUE.md](references/SELF_CRITIQUE.md): check scenario coverage and protocol effectiveness

---

## Mode 3: Integration Testing

Two-phase workflow for skills that touch the real file system, git, or global config.

### `integration plan <skill-name>`

1. **Read the skill** — identify all file writes, git operations, and external state changes

2. **Check for existing plan** — if `.claude/tests/TEST_PLAN.md` exists, update it (don't overwrite other skills' scenarios)

3. **Design scenarios** covering:

   | Category | What to test |
   |---|---|
   | Happy path | Correct input, expected output |
   | Decision boundaries | Every row in every decision table |
   | Arguments/modes | Each named argument |
   | Idempotency | Re-run produces correct result |
   | Preservation | Re-run keeps user-added content |
   | Cross-session state | Pause in one session, resume in another |
   | Edge cases | Empty state, missing files, partial state |

   See [SCENARIO_DESIGN.md](references/SCENARIO_DESIGN.md) for test type and isolation strategy guidance.

4. **Write the test plan** to `.claude/tests/TEST_PLAN.md` — must be fully self-contained (a fresh session can execute it). See [PLAN_FORMAT.md](references/PLAN_FORMAT.md).

5. **Self-critique** — follow [SELF_CRITIQUE.md](references/SELF_CRITIQUE.md): check scenario coverage (every decision table row hit?), dry-run vs. integration classifications justified, and execution ordering complete.

6. Tell the user: "Open a fresh Claude Code session and say: 'Execute the test plan at `.claude/tests/TEST_PLAN.md` and save results to `.claude/tests/TEST_RESULTS.md`.'"

### `integration evaluate`

1. Read `.claude/tests/TEST_RESULTS.md`
2. Classify issues: Bug (fix immediately), Ambiguity (clarify spec), Gap (add rule or document)
3. For each Bug: identify exact line(s), propose specific edit, explain why
4. Ask for approval, then apply fixes
5. Suggest re-running the plan in a fresh session to verify

---

## Gotchas

- The validate script only checks metadata format — it does NOT check content quality. A passing validation is not a full review.
- Test agents sometimes "help" by inferring missing rules instead of flagging them as Gaps. The test prompt must explicitly say: flag ambiguity, don't fill in gaps yourself.
- Bare `Bash` (without command restriction) in allowed-tools is the #1 review finding — always flag it.
- Self-critique often produces generic "looks good" output. Push for specific checklist item references — "checklist item X was not covered" is useful, "review was thorough" is not.
- When testing decision-heavy skills, agents tend to skip "Other/freeform" inputs. Explicitly include them in scenarios.
- Skills that write to `~/.claude/` need a fake HOME in dry-run tests — agents forget this and report false passes.
- Dynamic content injection (`!`\`...\``) commands must be single operations — pipes and chained commands fail the shell permission check. Use one simple command.
- `${CLAUDE_PLUGIN_DATA}` resolves to `.plugin-data/` inside the skill's own directory (e.g., `.claude/skills/skill-dev/.plugin-data/`). Don't hardcode paths — use the variable. Test agents often fail to resolve this and report the log as missing.

---

## Review History

After each review or test, append a summary to `${CLAUDE_PLUGIN_DATA}/skill-dev/reviews.log`:

```
{date} | {mode} | {skill-name} | {verdict} | {issue-count} | {one-line summary}
```

On each run:
- Check the log: if skill was reviewed in the **last 7 calendar days** (< 7 days ago, using the date in the log entry) and hasn't changed, mention this and offer options. If multiple entries exist for the same skill, use the most recent one.
- Detect changes with: `git diff HEAD@{7.days.ago} -- .claude/skills/<skill-name>/` (checks the entire skill directory, not just SKILL.md)
- If recent review exists AND no changes detected, ask: "This skill was reviewed on {date} with verdict {verdict}. No changes since. Want to: (1) Re-review anyway, (2) Skip to testing, (3) Cancel?"
  - **Re-review** → proceed with Mode 1 normally
  - **Skip to testing** → jump directly to Mode 2 (Test) step 1 (Identify the skill). The previous passing review satisfies the "review before testing" rule — no re-validation needed. Design fresh scenarios (do not reuse previous test scenarios).
  - **Cancel** → exit, no action taken
- Surface patterns across skills: "This is the 3rd skill with bare Bash in allowed-tools"

---

## Rules

- **Review before testing** — test mode assumes the skill passes structural validation
- **Fresh context per test agent** — each agent starts with zero conversation history
- **Read-only dry-run testing** — enforce via tool restrictions (`Read, Glob, Grep` only), not just instructions
- **Deterministic inputs** — each scenario specifies exact answers, never "let the agent choose"
- **Cover decision tables exhaustively** — every row should be hit by at least one scenario
- **Never remove other skills' scenarios** — `integration plan task` only touches task scenarios
- **Test plans must be self-contained** — no references to "as we discussed" or current conversation
- **Dry-run for global state** — skills writing to `~/.claude/` should use a fake HOME
- **Integration for git ops** — skills with git commands should use a temp clone
- **Cleanup is mandatory** — every integration test must specify cleanup commands
