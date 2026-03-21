# Skill Creation Protocol

> Create new skills from successful workflows.

## When This Applies

- **No existing skill** for the task
- Approach worked well and is **generalizable**

For updating existing skills -> See [SKILL_IMPROVEMENT](SKILL_IMPROVEMENT.md)

## Triggers

| Signal            | Example                                 |
| ----------------- | --------------------------------------- |
| No skill exists   | Complex task succeeded without guidance |
| User asks         | "Save this as a skill"                  |
| Repeated pattern  | Third time doing same complex task      |

## Evaluate Before Creating

| Question                  | If No                                       |
| ------------------------- | ------------------------------------------- |
| Is it generalizable?      | Skip (one-off)                              |
| Did it work well?         | Refine first                                |
| Does similar skill exist? | -> [SKILL_IMPROVEMENT](SKILL_IMPROVEMENT.md)|

## How to Propose

```markdown
I didn't have a skill for this. The approach worked:

1. [Key step]
2. [Key step]
3. [Key step]

Save as a new skill?
```

## Skill Structure

```
.claude/skills/[skill-name]/
├── SKILL.md              # Required: main instructions
└── references/           # Optional: if >500 lines needed
    └── [topic].md
```

### SKILL.md Template

```yaml
---
name: [skill-name]
description: [Third-person description]. Use when [trigger phrases].
metadata:
  allowed-tools: [comma-separated tools needed]
---

## Instructions

[Core instructions]

## Workflow

1. [Step]
2. [Step]

## Rules

- [Constraint]
```

## Naming Rules

- Lowercase only: `data-export` yes, `Data-Export` no
- Hyphens for spaces: `setup-env` yes, `setup_env` no
- Use verbs: `fix`, `review`, `generate`, `check`

## After Creation

1. Confirm: "Created `/[skill-name]` skill"
2. State location: `.claude/skills/[name]/SKILL.md`
