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

## Intent Capture

Before drafting, ask these questions. Skip any that are already obvious from the conversation:

| Question | Why it matters |
|---|---|
| What exact phrases would trigger this skill? | Determines the `description` field |
| What inputs does it need? (files, context, arguments) | Determines allowed-tools and arguments |
| What does it produce? (file, message, side effect) | Determines output format |
| When should it NOT trigger? | Prevents false activations |
| Is it one step or a multi-step workflow? | Determines whether it needs a Workflow section |

Wait for answers before drafting — a few questions upfront avoids rewriting the skill twice.

## Writing the Description

The `description` field in the frontmatter is what triggers skill activation. Write it as **trigger phrases**, not a summary.

**Bad** (summary of what it does):
```
"A tool for reviewing and improving commit messages."
```

**Good** (trigger phrases + action statement):
```
"Review and improve commit messages. Use when the user wants to write a commit, craft a commit
message, review a commit, or commit changes. Trigger on: commit, write commit message, how should
I word this commit, review my changes."
```

Rules:
- Start with a third-person action statement ("Review...", "Generate...", "Check...")
- Follow with "Use when..." or "Trigger on..." with exact phrases a user would type
- Include negative triggers if the skill is easily confused with another: "Do NOT trigger when..."
- Keep under 1024 characters

## Output Format Guidance

Choose the right structure based on what the skill does:

| If the skill... | Use this pattern |
|---|---|
| Produces a file | Show the exact file template in the workflow |
| Makes decisions with branches | Use a decision table |
| Has named modes (review / test / plan) | Use an Arguments section with mode descriptions |
| Touches external systems or global state | Add a `hooks.PreToolUse` safety guard |
| Has content >500 lines | Split details into `references/[topic].md` files |

## Skill Structure

```
.claude/skills/[skill-name]/
├── SKILL.md              # Required: main instructions
└── references/           # Optional: when SKILL.md would exceed ~500 lines
    └── [topic].md
```

### SKILL.md Template

```yaml
---
name: [skill-name]
description: [Third-person action statement]. Use when [trigger phrases].
metadata:
  allowed-tools: [comma-separated tools — only what's actually needed]
---

## Instructions

[Core instructions — what this skill does and why]

## Workflow

1. [Step]
2. [Step]

## Rules

- [Constraint with reason]
```

## Naming Rules

- Lowercase only: `data-export` yes, `Data-Export` no
- Hyphens for spaces: `setup-env` yes, `setup_env` no
- Use verbs: `fix`, `review`, `generate`, `check`
- Max 64 characters

## After Creation

1. Confirm: "Created `/[skill-name]` skill"
2. State location: `.claude/skills/[name]/SKILL.md`
3. Run structural validation:
   ```bash
   node .claude/skills/skill-dev/scripts/validate-skill.mjs .claude/skills/[name]/
   ```
   If validation fails, fix the errors immediately before proceeding.
4. Suggest: "Want me to run `/skill-dev review [name]` to check the quality of this skill?"
