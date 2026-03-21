# Skill Improvement Protocol

> Update a specific skill based on usage and feedback.

## When This Applies

- Feedback is **specific to one skill**
- Examples: "The commit skill should ask for scope", "review skill should check for tests"

For cross-cutting preferences -> See [GENERAL_IMPROVEMENT](GENERAL_IMPROVEMENT.md)

## Triggers

| Type       | Examples                                     |
| ---------- | -------------------------------------------- |
| Correction | "No, use X instead", "That's wrong"          |
| Preference | "I prefer...", "Always do X for this"        |
| Failure    | Skill approach failed, alternative worked    |
| Explicit   | "Update this skill", "Remember this"         |

## Evaluate Before Updating

| Question                          | If No                                            |
| --------------------------------- | ------------------------------------------------ |
| Is it correct? (no security/bugs) | Push back                                        |
| Is it skill-specific?             | -> [GENERAL_IMPROVEMENT](GENERAL_IMPROVEMENT.md) |
| Is it general? (helps most users) | -> [GENERAL_IMPROVEMENT](GENERAL_IMPROVEMENT.md) |

## How to Propose

```markdown
I noticed a potential improvement to the `/[skill]` skill:

**[Title]**: [Description of preference/correction]

Should I update the skill?
```

## Update Process

1. Locate skill files in `.claude/skills/[skill-name]/`
2. Propose the specific edit with file, section, change, and reason
3. Ask for approval before applying

### Where Changes Go

| Change Type | Location |
|-------------|----------|
| Core behavior | `SKILL.md` main instructions |
| Detailed rules | `references/[topic].md` |
| New workflow step | `SKILL.md` workflow section |

## Quality Filter

Capture: Specific errors, platform differences, workflow issues
Skip: One-off flukes, temporary issues, fails evaluation

**Test**: "Would this help in future conversations with this skill?"
