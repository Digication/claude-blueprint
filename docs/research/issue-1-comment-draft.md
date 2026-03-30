# Draft Comment for Issue #1

> Copy everything below this line into the GitHub comment.

---

Did some research on this — evaluated all four options from the RFC plus a few additional approaches. Full write-up: [`docs/research/skill-sharing-and-drift.md`](../research/skill-sharing-and-drift.md)

## TL;DR

**Recommended: Claude Code Plugin System + Automated Retrospective**

The plugin system is Anthropic's official distribution mechanism — purpose-built for sharing skills across projects. It avoids every technical blocker found in the other approaches (symlinks, postinstall scripts, Docker volumes). Pairing it with an enhanced `/retrospective` creates a full cycle: plugins push skills out, retrospective flows improvements back.

## Options evaluated

| Option | Verdict |
|---|---|
| 1. PR discipline | Too manual — erodes over time |
| 2. Git remote / cherry-pick | Too technical for guided/supported tier users |
| 3. Git submodules | High friction (forgotten `--init`, detached HEAD confusion) |
| 4. Git subtree | Decent for one-way distribution, but push-back is awkward |
| **5. npm + postinstall symlinks** | **Not viable** — three blockers: pnpm 10 blocks postinstall by default, Claude Code symlink bug ([#14836](https://github.com/anthropics/claude-code/issues/14836)), and Docker volumes break symlinks |
| 6. npm + explicit CLI (Husky-style) | Viable but creates copy-drift — local copies diverge from package |
| 7. Automated retrospective | Good accelerator but only handles push-back, not distribution |
| **8. Plugin system** | **Best fit** — official, no symlinks, versioned, auto-updates, works in Docker, enterprise-ready |

## Critical gap: retrospective provenance

For the retrospective to prepare PRs back to the blueprint, it needs to know **where a skill came from**. Currently it doesn't — it just looks in `.claude/skills/` and assumes everything is editable.

Skills can live in four places (project, personal `~/.claude/skills/`, plugin, enterprise-managed), and the correct action differs for each:

| Origin | What retrospective should do |
|---|---|
| Project skill (no upstream) | Edit directly |
| Project skill overriding a plugin | Ask: update local or PR upstream? |
| Plugin skill | Can't edit — offer local override or upstream PR |
| Personal skill | Warn: "this affects all your projects" |
| Enterprise-managed | Can't edit — tell user to contact admin |

This provenance detection is a prerequisite before Option 7 (automated retrospective) can work reliably in a plugin-based setup.

## On the "Immediate Skill Improvement" (/implement Direct Mode)

Evaluated all five proposed changes against the current 4-step Direct Mode. All are defensible as false positives — the current mode is intentionally lightweight and the proposed additions add ceremony appropriate for Plan/Execute Mode but counterproductive for Direct Mode's "just do it" scope:

- **"Analyze" (add UI screenshots)** → current step 1 already reads code; screenshots add overhead disproportionate to small changes
- **"Plan" (one-sentence plan)** → the user's request IS the plan; Plan Mode exists for when planning matters
- **"Implement"** → identical to current
- **"Verify" (browser checks)** → Execute Mode already has this; for small changes, the developer's own eyes are faster
- **"Report" (expanded format)** → already happens naturally via Claude's default behavior

The one to watch is browser verification — if real bugs start slipping through because Direct Mode didn't check, that's the first place to reconsider.

## Suggested next steps

1. **Prototype the plugin structure** — add `.claude-plugin/plugin.json` to this repo and test the distribution flow
2. **Add provenance detection to retrospective** — teach it to identify skill origin before proposing changes
3. **Defer the /implement Direct Mode changes** — current behavior is adequate; revisit if evidence of real gaps emerges
