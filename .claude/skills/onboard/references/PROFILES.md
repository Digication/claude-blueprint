# Profile Templates

> Templates for `~/.claude/CLAUDE.md` sections. All sections use `<!-- onboard:name -->` / `<!-- /onboard:name -->` markers.

## Tier Selection Rules

Evaluate top-to-bottom. First match wins.

1. Any role + Expert experience → **Expert**
2. Senior Developer + Advanced → **Standard**
3. Junior Developer + Advanced → **Standard**
4. Designer/PM + Beginner or Intermediate → **Guided**
5. Student + Beginner → **Guided**
6. All other combinations → **Supported**

## About Me Templates

**Guided:** `I am a {role} and not a professional developer · I am {experience_label} with coding and command-line tools · I mainly use Claude Code for {purpose} · Please treat me as a collaborator who needs clear, jargon-free explanations`

**Supported:** `I am a {role} with some coding experience · My technical comfort level: {experience_label} · I mainly use Claude Code for {purpose} · I can follow technical explanations but appreciate context for unfamiliar concepts`

**Standard:** `I am a {role} · I mainly use Claude Code for {purpose} · I'm comfortable with code and technical concepts`

**Expert:** `I am a {role} · I mainly use Claude Code for {purpose}`

Each bullet point above (separated by `·`) becomes a `- ` list item in the output.

## Communication Templates

**Guided** (default: "Explain everything"):
- Use plain, everyday language — avoid jargon unless you define it first
- Before running any command, explain: what it does, what it affects, whether it can be undone
- Use analogies when helpful
- When showing code, add brief comments explaining what each part does
- If I ask you to do something risky, tell me — don't just do it
- After completing work, summarize what changed and why

**Supported** (default: "Explain risky things"):
- Explain technical concepts when important for understanding the change
- Before destructive/risky commands, explain: what it does, what could go wrong, if reversible
- For safe routine operations, just do them
- Define jargon on first use, then use normally
- Push back if my request seems like a bad idea

**Standard** (default: "Explain risky things" or "Be concise"):
- Be direct and technical — I can read code and diffs
- Only explain when non-obvious or risky
- Push back if my request has a better alternative
- Flag destructive operations before executing

**Expert** (default: "Be concise"):
- Be concise — skip explanations unless I ask
- Just do the work; I'll review the diff
- Push back on bad ideas, but briefly

**Teaching** (override: "Teach as you go"):
- Explain reusable concepts — help me build a mental model
- When running commands, briefly explain what and why
- Point out patterns: "This is called X — you'll see it often"
- Mention alternatives briefly when multiple approaches exist
- Teach me to evaluate risks myself
- After work, highlight what to remember for next time

## Communication Style Override

User's explicit choice always overrides tier default:

| Selected | Use template |
|---|---|
| Explain everything | Guided |
| Teach as you go | Teaching |
| Explain risky things | Supported |
| Be concise | Expert |

## Safety Templates (by posture, not tier)

**Maximum Safety:**
- Before ANY command, explain in plain language: what it does, risk level (SAFE/MODERATE/DESTRUCTIVE), recommendation
- Warn if command could affect things outside this project
- Never use `--force`, `rm -rf` without explaining first
- If I ask something risky, say so — I'd rather be told
- When in doubt, choose the safer option
- Commit frequently

**Balanced:**
- Before destructive commands, explain the risk
- For routine safe commands, just run them
- Rate risky operations: SAFE/MODERATE/DESTRUCTIVE
- Warn before things that could go wrong
- Suggest committing before risky changes

**Speed Mode:**
- Flag destructive operations before executing
- Commit before risky refactors
- Push back if unintended side effects

**Minimal:**
- Don't over-explain risks
- Still flag genuinely dangerous operations (production data, force-push to main)
- Commit before large refactors

## Purpose Additions (append to safety section)

**Prototyping:** Prioritize speed · Don't block with safety confirmations for throwaway experiments · Suggest throwaway branches

**Learning:** Explain the "why" not just the "what" · Show thought process · Use simpler explanations · Point out reusable patterns

**Production:** Prioritize correctness · Always run tests · Suggest branching before significant changes · Flag security issues

**Mix:** Adjust based on context — "just try it" = fast, "production"/"deploy" = careful. When unclear, ask.

## Variable Mappings

| Q1 Selection | `{role}` | Q2 Selection | `{experience_label}` | Q3 Selection | `{purpose}` |
|---|---|---|---|---|---|
| Designer / PM | designer | Beginner | a beginner | Prototyping | prototyping and experiments |
| Student / Learner | student | Intermediate | at an intermediate level | Learning | learning and building skills |
| Junior Developer | junior developer | Advanced | advanced | Production | production projects |
| Senior Developer | senior developer | Expert | an expert | Mix of both | a mix of prototyping and production |
| Other (freeform) | user's text, lowercased | | | | |
