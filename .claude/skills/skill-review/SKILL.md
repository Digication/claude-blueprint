---
name: skill-review
description: Reviews and validates Claude skills against best practices. Use when asked to review a skill, audit skill quality, validate SKILL.md files, or improve existing skills.
metadata:
  allowed-tools: Read, Glob, Grep
---

# Skill Review Guide

Review skills in `.claude/skills/` for quality and correctness.

## Quick Start

1. **Run automated validation** (catches structural issues):
   ```bash
   node <skill-base-dir>/scripts/validate-skill.mjs /path/to/skill/
   ```
   Replace `<skill-base-dir>` with this skill's base directory.

2. **Perform manual review** using the workflow below

3. **Generate feedback report**

## Review Workflow

### Step 1: Automated Validation

Run the validation script to check YAML frontmatter, required fields, naming, and file structure.

### Step 2: Metadata Review

Validate YAML frontmatter:
- **name**: Lowercase, hyphens, numbers only; must match directory name
- **description**: Third person, includes "when to use" triggers
- **allowed-tools**: See [ALLOWED_TOOLS.md](references/ALLOWED_TOOLS.md) for safety guidelines

### Step 3: Structure Assessment

- **SKILL.md**: Under 500 lines, uses progressive disclosure
- **References**: One level deep from SKILL.md, focused on single topics

### Step 4: Content Quality

**Conciseness:**
- Every paragraph justifies its token cost
- Assumes the agent knows common concepts
- Minimal but sufficient explanations

**Clarity:**
- Single terminology throughout
- No vague options ("use X, Y, or Z...")
- Clear defaults recommended

**Workflows:**
- Complex tasks have step-by-step instructions
- Feedback loops for quality-critical operations

See [CHECKLIST.md](references/CHECKLIST.md) for the complete quality checklist.

### Step 5: Generate Feedback Report

```markdown
# Skill Review: [skill-name]

## Summary
[1-2 sentence assessment]

## Critical Issues (must fix)
[List blocking problems]

## Recommendations (should fix)
[List improvements]

## Suggestions (nice to have)
[List optional enhancements]

## Strengths
[What the skill does well]
```
