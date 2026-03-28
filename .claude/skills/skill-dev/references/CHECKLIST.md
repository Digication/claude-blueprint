# Skill Review Checklist

## Metadata Validation

- [ ] **name**: Max 64 chars, lowercase/numbers/hyphens only, matches directory name
- [ ] **description**: Non-empty, max 1024 chars, third person, includes "when to use" triggers
- [ ] **description is trigger phrases, not a summary** — should read like a list of things a user might say, not a paragraph explaining the skill. Bad: "A comprehensive tool for monitoring..." Good: "Trigger on 'watch CI', 'babysit', 'make sure this lands'."
- [ ] **allowed-tools**: Follows safety guidelines (see [ALLOWED_TOOLS.md](ALLOWED_TOOLS.md))
- [ ] **YAML formatting follows spec** — plain unquoted values, correct field placement (see [SPECIFICATION.md](SPECIFICATION.md))

## Structure

- [ ] SKILL.md under 500 lines
- [ ] References one level deep from SKILL.md
- [ ] Descriptive file names
- [ ] Forward slashes in paths

## Content Quality

- [ ] No over-explaining common concepts
- [ ] Every paragraph justifies its token cost
- [ ] Consistent terminology
- [ ] Clear defaults recommended
- [ ] Step-by-step workflows for complex tasks
- [ ] No time-sensitive information
- [ ] **Gotchas section present** — real failure patterns Claude has hit, not generic warnings. Absence okay only for very simple skills (reviewer must justify)
- [ ] **Workflows aren't overly prescriptive** — gives intent + constraints, not rigid step-by-step for things Claude already knows (e.g., don't spell out how to resolve merge conflicts)
- [ ] **Hub dispatches clearly to spokes** — if reference files exist, SKILL.md has a clear routing table or lookup section, not just scattered inline links

## Decision Logic (if skill contains decision tables or matrices)

- [ ] Decision tables cover all valid input combinations (no gaps)
- [ ] Decision tables specify evaluation order (e.g., "first match wins")
- [ ] Variable/template references are authoritative mappings, not just examples
- [ ] Override logic is explicit (what overrides what, and when)
- [ ] Safety/posture/tier derived independently where appropriate (not coupled)
- [ ] "Other"/freeform input handling is specified

## Scripts (if present)

- [ ] Explicit error handling
- [ ] All constants documented
- [ ] Dependencies listed
- [ ] **Mechanical logic lives in scripts, not prose** — if skill describes a repetitive/deterministic process, it should be executable code, not instructions for Claude to reconstruct each time

## Effectiveness

- [ ] Description contains likely search terms
- [ ] Agent can follow instructions without ambiguity
- [ ] Error cases handled
- [ ] **Skill fits one category cleanly** — Library/API Reference, Product Verification, Data/Analysis, Business Automation, Scaffolding, Code Quality, CI/CD, Runbook, or Infra Ops. Skills straddling multiple may need splitting.
- [ ] **On-demand hooks for dangerous operations** — if skill runs destructive commands (git push, rm, kubectl delete), it registers a PreToolUse hook as a safety net, not just instructions
- [ ] **Persistent data uses `${CLAUDE_PLUGIN_DATA}`** — if skill logs results, stores config, or benefits from cross-session history, it uses stable storage (not its own directory, which gets overwritten on upgrades)
- [ ] **Referenced skills/files exist** — all markdown links to reference files and skill-name references resolve to real paths
- [ ] **First-run config handled** — if skill needs user-specific info, it checks for config on startup and asks on first run (doesn't fail silently or ask every time)
- [ ] **Uses dynamic content injection where appropriate** — if skill needs runtime context (git branch, environment state, available resources) to make decisions, uses `!`\`...\`` to inject it at load time instead of spending a turn running the command
- [ ] **Transition logic between modes/states is explicit** — if a skill has multiple modes, phases, or branches, the transition between them (prompts, user choices, what happens on accept/decline) is fully documented, not just "then offer to..."

## Scoring

**Pass**: All required metadata valid, no structural errors
**Fail**: Missing required fields, invalid format, or blocking errors
