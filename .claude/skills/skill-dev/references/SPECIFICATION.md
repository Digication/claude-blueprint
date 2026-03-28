# Skill Specification Quick Reference

## Directory Structure

```
skill-name/
├── SKILL.md          # Required: Main instructions
├── scripts/          # Optional: Executable code
├── references/       # Optional: Additional documentation
└── assets/           # Optional: Static resources
```

## YAML Frontmatter

| Field | Required | Max Length | Notes |
|-------|----------|------------|-------|
| `name` | Yes | 64 chars | Lowercase, hyphens, numbers only |
| `description` | Recommended | 1024 chars | Third person, includes triggers |
| `argument-hint` | No | - | Hint shown in autocomplete (e.g., `[issue-number]`) |
| `disable-model-invocation` | No | - | `true` to prevent Claude auto-loading |
| `user-invocable` | No | - | `false` to hide from `/` menu |
| `allowed-tools` | No | - | Comma-separated tool list |
| `model` | No | - | Model override when skill is active |
| `effort` | No | - | `low`, `medium`, `high`, `max` |
| `context` | No | - | `fork` to run in a subagent |
| `agent` | No | - | Subagent type when `context: fork` |
| `hooks` | No | - | Hooks scoped to skill lifecycle |
| `paths` | No | - | Glob patterns limiting activation |
| `shell` | No | - | `bash` (default) or `powershell` |

### Formatting Rules

- Use plain unquoted YAML values — no quotes around strings unless the value contains special YAML characters (`:`, `{`, `}`, `[`, `]`)

### Known IDE False Positives

The VS Code extension (as of v2.1.86) only recognizes the base Agent Skills standard fields: `argument-hint`, `compatibility`, `description`, `disable-model-invocation`, `license`, `metadata`, `name`, `user-invocable`. It will show warnings for valid Claude Code extensions like `hooks`, `model`, `context`, `agent`, `allowed-tools`, `effort`, `paths`, `shell`. These warnings are safe to ignore — the fields work correctly with Claude Code.

## name Rules

- Only `a-z`, `0-9`, `-`
- No leading/trailing/consecutive hyphens
- Must match parent directory name

## description Rules

- Third person ("Extracts...", not "I can...")
- Include what it does and when to use it
- No quotes around YAML values — use plain unquoted strings

## Body Content

- Keep under 500 lines
- Split longer content into reference files
- Use relative paths with forward slashes
- Keep references one level deep
