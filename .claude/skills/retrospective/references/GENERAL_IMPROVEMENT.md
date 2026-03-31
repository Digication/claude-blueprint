# General Improvement Protocol

> Capture cross-cutting preferences in the project root `CLAUDE.md`.

## When This Applies

- Feedback applies **across multiple skills** or **no specific skill**
- Examples: "Always use TypeScript", "Ask before deleting", "We use pnpm"

For skill-specific updates -> See [SKILL_IMPROVEMENT](SKILL_IMPROVEMENT.md)

## Triggers

| Type              | Examples                                 |
| ----------------- | ---------------------------------------- |
| Global preference | "I always want...", "Never do X"         |
| Workflow pattern  | "Always ask before...", "Check first"    |
| Style preference  | "Use prose not bullets", "Keep it brief" |
| Environment       | "We use pnpm", "TypeScript only"         |

## Evaluate Before Saving

| Question                          | If No                                       |
| --------------------------------- | ------------------------------------------- |
| Is it cross-cutting?              | -> [SKILL_IMPROVEMENT](SKILL_IMPROVEMENT.md)|
| Is it correct? (no security/bugs) | Push back                                   |
| Is it persistent? (not one-off)   | Skip                                        |

## How to Propose

```markdown
I noticed a general preference:

**[Preference Title]**: [Description of preference and correct usage].

I'll add this to the project CLAUDE.md. Proceed?
```

## Save Process

1. Check if `CLAUDE.md` exists at the project root
2. **Search for duplicates** — before proposing, scan existing `CLAUDE.md` content for:
   - **Exact match**: same rule already stated → inform user ("This is already in CLAUDE.md: [quote]") and skip
   - **Semantic match**: same intent, different wording → inform user and skip (or offer to consolidate)
   - **Contradiction**: opposite instruction exists → surface both versions, ask which to keep
3. If not found (and no contradiction), propose the addition with section, content, and reason
4. Ask for approval before applying

### Example Project CLAUDE.md Structure

```markdown
# Claude Instructions

## Environment
- Package manager: pnpm
- Language: TypeScript

## Workflow
- Ask before deleting files
- Run tests after code changes

## Style
- No emojis unless requested
- Keep responses concise
```

## Quality Filter

Capture: Repeated preferences, workflow patterns, environment facts
Skip: One-time requests, contradicts best practices

**Test**: "Will this improve future conversations?"
