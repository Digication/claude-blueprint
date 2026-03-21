---
name: onboard
description: Interactive onboarding wizard that sets up a personalized Claude Code environment. Use when a user wants to introduce themselves, configure communication preferences, set up safety guardrails, or run first-time setup. Guides non-technical users through selectable options.
metadata:
  allowed-tools: Read, Write, Edit, Glob
---

# Onboard — Personalized Claude Code Setup

Interactive wizard that configures Claude Code based on who you are and how you work. Generates `~/.claude/CLAUDE.md` with personalized instructions and sets the appropriate output style so every future conversation is tailored to you.

## Arguments

- (no args): Run the full onboarding wizard
- `reset`: Overwrite onboard sections in `~/.claude/CLAUDE.md` with fresh answers
- `show`: Display current profile without changes

## Workflow

### Step 0 — Check Existing Profile

1. Check if `~/.claude/CLAUDE.md` exists
2. If it exists and has an `## About Me` section:
   - Show the current profile summary
   - If `show` argument was passed, display and stop
   - Use **AskUserQuestion** to ask: "You already have a profile. What would you like to do?"
     - Header: "Profile"
     - Options:
       | Option | Description |
       |---|---|
       | Update it | Keep your existing content and re-run the wizard to update onboard sections |
       | Start fresh | Clear onboard sections and set up from scratch |
       | Keep it | No changes — exit onboarding |
3. If `reset` argument was passed, skip the question and proceed to Step 1

### Step 1 — Gather User Profile (Questions 1–2)

Ask these two questions in a **single AskUserQuestion call**:

**Question 1: "What best describes your role?"**
Header: "Role"

| Option | Description |
|---|---|
| Designer / PM | I work on product design or management, not daily coding |
| Student / Learner | I'm learning to code or exploring new technologies |
| Junior Developer | I code regularly but still building experience |
| Senior Developer | I'm experienced and prefer concise, technical communication |

**Question 2: "How comfortable are you with the command line and coding?"**
Header: "Experience"

| Option | Description |
|---|---|
| Beginner | Terminal commands and code look unfamiliar to me |
| Intermediate | I can read code and run commands but don't always know why |
| Advanced | I understand most code and commands, occasionally look things up |
| Expert | I'm deeply technical — skip the explanations, just do it |

### Step 2 — Gather Work Context (Questions 3–4)

Ask these two questions in a **single AskUserQuestion call**:

**Question 3: "What will you mainly use Claude Code for?"**
Header: "Purpose"

| Option | Description |
|---|---|
| Prototyping | Quick experiments and exploring ideas — speed over polish |
| Learning | Understanding code, following tutorials, building skills |
| Production | Real projects that need quality, testing, and reliability |
| Mix of both | Sometimes prototyping, sometimes production work |

**Question 4: "How should Claude communicate with you?"**
Header: "Style"

| Option | Description |
|---|---|
| Explain everything | Explain what you're doing, why, and what the risks are |
| Teach as you go | Explain concepts I can reuse — help me learn, not just get results |
| Explain risky things | Only explain when something could go wrong |
| Be concise | Short answers — I'll ask if I need more detail |

### Step 3 — Determine Safety Posture

Based on the answers from Steps 1–2, **auto-select** the safety posture. Do NOT ask a separate question — derive it from the profile.

**Evaluate top-to-bottom. First match wins.**

| # | Profile Signal | Safety Posture |
|---|---|---|
| 1 | Beginner experience (any role) | **Maximum safety** |
| 2 | Designer/PM or Student role (any experience) | **Maximum safety** |
| 3 | Expert experience AND Concise style | **Minimal** |
| 4 | Advanced+ experience AND Prototyping purpose | **Speed mode** |
| 5 | Advanced+ experience AND Production purpose | **Balanced** |
| 6 | All other combinations | **Balanced** (default fallback) |

See [SAFETY_DEFAULTS.md](references/SAFETY_DEFAULTS.md) for what each posture configures.

### Step 3b — Determine Output Style

Based on the profile tier (from [PROFILES.md](references/PROFILES.md)), auto-select the output style:

| Profile Tier | Output Style | settings.json value | Why |
|---|---|---|---|
| **Guided** | `Beginner-Friendly` | `"outputStyle": "Beginner-Friendly"` | System-prompt level plain language, risk explanations, analogies |
| **Supported** | `Explanatory` | `"outputStyle": "Explanatory"` | Educational insights woven into work |
| **Standard** | `Default` | Remove `outputStyle` key or set `""` | Standard concise engineering mode |
| **Expert** | `Default` | Remove `outputStyle` key or set `""` | CLAUDE.md "be concise" handles the rest |

The output style modifies Claude's **system prompt** — more effective than CLAUDE.md alone for changing communication behavior. Both work together: output style controls *how* Claude communicates, CLAUDE.md controls *what* Claude knows about you.

### Step 4 — Generate and Preview

1. Build the `~/.claude/CLAUDE.md` content using [PROFILES.md](references/PROFILES.md) templates
2. Build sandbox/safety recommendations using [SAFETY_DEFAULTS.md](references/SAFETY_DEFAULTS.md)
3. Present a **preview** showing the user exactly what will be written:

```
Here's your personalized Claude Code profile:

---
[Show the full generated CLAUDE.md content]
---

Safety recommendations:
- [List sandbox/settings recommendations based on posture]

Write this to ~/.claude/CLAUDE.md?
```

Ask for confirmation before writing.

### Step 5 — Write and Confirm

1. If `~/.claude/CLAUDE.md` exists:
   - Read existing content
   - **Preserve** any sections NOT generated by onboarding (sections without the `<!-- onboard -->` marker)
   - Replace only the onboard-generated sections
2. If it doesn't exist, create it
3. All onboard-generated sections must start with `<!-- onboard:section-name -->` HTML comment so future runs can identify and replace them
4. **Set the output style** in `~/.claude/settings.json`:
   - Read existing settings (if any) and merge — don't overwrite other settings
   - Set `"outputStyle"` to the value from Step 3b
   - Tell the user: "Output style set to [name]. This takes effect in your next session."
5. Display a summary of what was written and configured
6. If safety posture recommends sandbox, show the user how to enable it:
   - "To enable sandbox mode, run `/sandbox` in Claude Code"
   - Show recommended `settings.json` additions if applicable

## Section Markers

Every section generated by this skill must be wrapped with markers:

```markdown
<!-- onboard:about-me -->
## About Me
...
<!-- /onboard:about-me -->

<!-- onboard:communication -->
## How to Communicate With Me
...
<!-- /onboard:communication -->

<!-- onboard:safety -->
## Safety & Risk Communication
...
<!-- /onboard:safety -->
```

This allows future `/onboard` runs to update only these sections while preserving user-added content.

## Handling "Other" (Freeform) Answers

AskUserQuestion always provides an "Other" option for custom text. When a user types a freeform answer:

1. **Map it to the closest predefined option** based on semantic meaning
2. If the answer doesn't fit any option, **ask a brief follow-up** to clarify: "Thanks — to tailor your setup, which of these is closest to what you described?" and re-present the original options
3. For the **Role** question specifically: if the user describes a non-technical role, treat it as Designer/PM. If they describe a coding role, treat it as the closest developer level.
4. Always include the user's original freeform text in the `{role}` variable for a personalized About Me section

## Rules

- **Never overwrite user-added sections** in `~/.claude/CLAUDE.md` — only replace onboard-marked sections
- **Always preview before writing** — show the exact content and get confirmation
- **Derive safety posture automatically** — don't make non-technical users choose security settings they can't evaluate
- **Keep it to 2 AskUserQuestion calls** (4 questions total) — respect the user's time
- **Use plain language in all options** — no jargon in option labels or descriptions
- **Include the "Other" escape hatch** — AskUserQuestion always provides this automatically
