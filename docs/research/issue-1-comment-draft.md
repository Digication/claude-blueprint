# Draft Comment for Issue #1

> Copy everything below this line into the GitHub comment.

---

Did some research on this — evaluated all four options from the RFC plus a few additional approaches. Full write-up: [`docs/research/skill-sharing-and-drift.md`](../research/skill-sharing-and-drift.md)

## TL;DR

**Recommended: Plugin System + Onboard-as-Bridge + Automated Retrospective**

The plugin system is Anthropic's official distribution mechanism — purpose-built for sharing skills across projects. But the blueprint is more than skills: the `.claude/CLAUDE.md` behavioral framework (7,630 bytes of skill routing, memory routing, tier detection) can't be distributed via plugin directly.

The solution: the `/onboard` skill (distributed via plugin) generates a small `.claude/CLAUDE.md` that **references** framework rules stored in the plugin. The actual rules auto-update with the plugin; the project file stays tiny and stable.

We verified this reference pattern with 7 controlled tests — strong directive wording ("Read and follow these files before responding") was **100% reliable** across all tests, including adversarial prompts trying to bypass the read.

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

## The blueprint is more than skills

A plugin can carry skills but NOT `.claude/CLAUDE.md` content. The behavioral framework (contextual skill routing, memory routing, tier detection) would be lost if we only extracted skills. The reference pattern solves this:

```
Plugin carries:  skills + framework reference files (auto-updated)
Onboard creates: .claude/CLAUDE.md with references to plugin files (tiny, stable)
Claude reads:    referenced framework files each conversation (verified reliable)
```

## Reference pattern test results

| Wording in CLAUDE.md | Followed rules? |
|---|---|
| "REQUIRED: MUST read `file`" | **Yes** (5/5 tests, including adversarial) |
| "Read and follow... before responding" | **Yes** (1/1) |
| "see `file`" (passive) | **No** — completely ignored |

Strong directive language is required. Passive references don't work.

## Critical gap: retrospective provenance

For the retrospective to prepare PRs back to the blueprint, it needs to know **where a skill came from**. Currently it doesn't — it just looks in `.claude/skills/` and assumes everything is editable. Skills can live in four places (project, personal, plugin, enterprise-managed), and the correct action differs for each. This provenance detection is a prerequisite for the automated return-path.

## On the "Immediate Skill Improvement" (/implement Direct Mode)

Evaluated all five proposed changes against the current 4-step Direct Mode. All are defensible as false positives — the current mode is intentionally lightweight. The one to watch is browser verification — if real bugs start slipping through, that's the first place to reconsider.

## Suggested next steps

1. **Prototype the plugin structure** — add `.claude-plugin/plugin.json` to this repo, move behavioral framework into plugin reference files, test the reference pattern end-to-end
2. **Update `/onboard`** — teach it to generate `.claude/CLAUDE.md` with references to plugin framework files (version-stamped, updatable)
3. **Add provenance detection to `/retrospective`** — teach it to identify skill origin before proposing changes
4. **Defer the /implement Direct Mode changes** — current behavior is adequate; revisit if evidence of real gaps emerges
