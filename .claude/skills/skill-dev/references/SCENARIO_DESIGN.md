# Scenario Design Guide

> Choosing the right test type and isolation strategy for each scenario.

## Test Type: Dry-Run vs. Integration

| Use dry-run when... | Use integration when... |
|---|---|
| Skill only traces logic and reports what it WOULD do | Skill runs actual git commands |
| Skill writes to `~/.claude/` (global state — use fake HOME instead) | Skill writes to the project directory |
| Testing decision tables, safety derivation, template rendering | Testing multi-step workflows with real state |
| Skill behavior is deterministic from inputs alone | Output depends on actual file/git state |

A single skill often needs BOTH types — dry-run for the logic, integration for the git/file ops.

### Classification Decision Tree

For each workflow or command in the skill:

1. Does it run git write operations (commit, stash, branch, checkout, push)? → **Integration** (use temp clone)
2. Does it write to `~/.claude/` or other global paths? → **Integration** (use fake HOME)
3. Does it write to the project directory? → **Integration** (use temp clone)
4. Does it only read files/git state and make decisions? → **Dry-run**
5. Does it use `AskUserQuestion` or other interactive tools? → Can be **either** (user choice becomes a simulated input in dry-run, or a real prompt in integration)

If a single command mixes read-only logic with write operations, split the test: dry-run for decision tracing, integration for verifying the actual writes.

## Isolation Strategy

### Fake HOME (for global writes)
Use when skill writes to `~/.claude/CLAUDE.md`, `~/.claude/settings.json`, or `~/.claude/output-styles/`.

```bash
FAKE_HOME=$(mktemp -d)
mkdir -p "$FAKE_HOME/.claude/output-styles"
# Tell agents: use $FAKE_HOME in place of ~ for all global paths
```

### Temp Clone (for git operations)
Use when skill runs git commands that modify branch state, stashes, or commits.

```bash
TEMP_DIR=$(mktemp -d)/test-repo
git clone /path/to/original "$TEMP_DIR"
cd "$TEMP_DIR"
```

### Combined (most realistic)
Use when skill writes global config AND runs git ops — e.g., `onboard` writes `~/.claude/CLAUDE.md` AND `task` creates branches.

### No isolation
Acceptable for read-only operations (`status`, `show`, `list`) that only observe state.

## Parallelism Rules

Run in **parallel** when:
- Scenarios don't share git state
- Each scenario starts from a clean/defined state
- No scenario depends on output of another

Run **sequentially** when:
- Scenario B requires the git state left by Scenario A
- Multi-part scenarios (pause → resume, onboard → level-up)
- Cleanup between scenarios is mandatory

## Cleanup Requirements

### Per-scenario cleanup (integration tests)
Reset to a known state before the next scenario:
```bash
git checkout main 2>/dev/null || true
git stash clear
git branch -l 'task/*' | xargs -r git branch -D 2>/dev/null || true
git reset --hard HEAD
git clean -fd
```

### After-all cleanup
Remove all temp artifacts after all scenarios complete:
```bash
rm -rf "$TEMP_DIR"
rm -rf "$FAKE_HOME"
```

Always run after-all cleanup even if some scenarios fail.

## Reverse-Lookup Challenges

When a skill stores data as behavior bullets (e.g., purpose as "Prioritize speed / Suggest throwaway branches") and later needs to show it as a label ("Prototyping"), there's a reverse-lookup problem. Flag these as scenarios to explicitly test — they are common sources of ambiguity.
