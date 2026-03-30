# Research: Skill Sharing and Drift

> Research for [RFC #1: How should skill improvements flow back to the blueprint?](https://github.com/Digication/claude-blueprint/issues/1)
>
> Date: 2026-03-30

## Problem Statement

When a team forks the blueprint to start a new project, they get a snapshot of all skills. If someone improves a skill in their fork, the improvement stays trapped there. Other projects never see it. Over time, every fork drifts apart with divergent skill versions.

---

## Options Evaluated

### Option 1: PR Discipline

*Manually open PRs back to the blueprint when you improve a skill.*

| Aspect | Detail |
|---|---|
| **How it works** | Developer improves a skill → remembers to open a PR → maintainer merges → other forks pull |
| **Pros** | Zero tooling. Standard GitHub workflow. |
| **Cons** | Relies on people remembering. Manual processes that depend on discipline erode over time. |
| **Best for** | Teams of 1–2 highly disciplined developers |
| **Verdict** | Weakest option. |

### Option 2: Git Remote / Cherry-Pick

*Add the blueprint as a second Git remote. Cherry-pick skill changes between repos.*

| Aspect | Detail |
|---|---|
| **How it works** | Each fork adds blueprint as `upstream` remote. Use `git cherry-pick` to move individual skill commits. |
| **Pros** | Precise control over which changes flow. No extra tooling beyond Git. |
| **Cons** | Requires solid Git skills. High barrier for guided/supported tier users. Error-prone. |
| **Best for** | Expert-tier teams comfortable with advanced Git |
| **Verdict** | Too technical for the blueprint's target audience. |

### Option 3: Git Submodules

*Extract skills into a separate repo. Include via `git submodule add`.*

| Aspect | Detail |
|---|---|
| **How it works** | `.claude/skills/` lives in its own repo. Each project includes it as a submodule. |
| **Pros** | Clean separation. Explicit version pinning per project. |
| **Cons** | Notorious friction: requires `git submodule update --init` after clone. Detached HEAD confusion. CI/CD needs extra steps. Two-step commit workflow. |
| **Best for** | Teams already using submodules |
| **Verdict** | High friction outweighs benefits. |

### Option 4: Git Subtree

*Merge the skills repo directly into the project via `git subtree`.*

| Aspect | Detail |
|---|---|
| **How it works** | Skills repo is merged into the project. Files are "real" (no symlinks, no pointers). Update with `git subtree pull`. |
| **Pros** | Zero friction for consumers — clone and everything is there. Works in Docker. No special commands for daily work. |
| **Cons** | Pushing changes back is awkward (`git subtree push`). Repo history bloats. Easy to mix project and skill changes in commits. |
| **Best for** | One-way distribution (blueprint → projects) where forks rarely push back |
| **Verdict** | Decent but one-directional. Doesn't fully solve the return-path problem. |

### Option 5: npm Package + Postinstall Symlinks

*Publish skills as an npm package. Postinstall script symlinks them into `.claude/skills/`.*

| Aspect | Detail |
|---|---|
| **How it works** | `pnpm add @myorg/claude-skills` → postinstall creates symlinks from `node_modules/` → `.claude/skills/` |
| **Pros** | Familiar workflow. Semantic versioning. Lockfile version pinning. Private registry support. |
| **Cons** | **Three critical blockers:** |
| | 1. **pnpm 10 blocks postinstall by default** — consumers must explicitly allowlist in `pnpm.onlyBuiltDependencies` |
| | 2. **Claude Code has incomplete symlink support** — [open bug #14836](https://github.com/anthropics/claude-code/issues/14836): symlinked skill dirs don't show in `/skills` autocomplete |
| | 3. **Docker volumes break symlinks** — mounted host dirs contain symlinks pointing to host paths that don't exist in the container |
| | Also: postinstall scripts are increasingly a security concern after the 2025 npm supply chain attacks. |
| **Best for** | Projects not using Docker and not using pnpm 10 |
| **Verdict** | Not viable for this project due to the three blockers. |

### Option 6: npm Package + Explicit CLI (Husky-style)

*npm package with a manual init command instead of postinstall.*

| Aspect | Detail |
|---|---|
| **How it works** | `pnpm add -D @myorg/claude-skills` then `npx claude-skills init` → copies (not symlinks) into `.claude/skills/`. Update: `npx claude-skills update`. |
| **Pros** | No postinstall security concerns. No symlinks (copies work in Docker). Semantic versioning. Can diff local vs package version. |
| **Cons** | Requires manual re-run on updates. Copied files can be locally modified, creating "which version is truth?" ambiguity. Requires `package.json`. No automatic update notification. |
| **Best for** | Teams wanting npm versioning without symlink/postinstall issues |
| **Verdict** | Viable but awkward. Solves distribution but re-introduces drift on the copies. |

### Option 7: Automated Retrospective Enhancement

*Enhance `/retrospective` to detect skill changes and prepare PRs back to the blueprint.*

| Aspect | Detail |
|---|---|
| **How it works** | After work, retrospective detects `.claude/skills/` changes → asks "Send this improvement back?" → prepares a PR. |
| **Pros** | Works with existing workflow. Low friction. Catches improvements at the moment they're made. |
| **Cons** | Only handles "push back" direction. Doesn't help projects receive updates. Requires blueprint repo access. Can produce noisy PRs. **Has a critical provenance gap** (see below). |
| **Best for** | Complementing another distribution mechanism |
| **Verdict** | Good accelerator, not a complete solution on its own. |

### Option 8: Claude Code Plugin System (Official Mechanism)

*Package skills as a Claude Code plugin. Distribute via marketplace or Git repo.*

| Aspect | Detail |
|---|---|
| **How it works** | Add `.claude-plugin/plugin.json` manifest. Consumers install via `/plugin add github:Digication/claude-blueprint-skills`. Skills namespaced as `blueprint:skill-name`. |
| **Pros** | Purpose-built by Anthropic for this problem. No symlinks. No postinstall. Supports Git repos, npm packages, private registries. Version pinning (ref/sha). Built-in marketplace. Enterprise features (managed marketplaces, allowlists, server-managed settings). Works in Docker. Auto-update polling. Follows the open [Agent Skills standard](https://agentskills.io) adopted by Microsoft, OpenAI, Cursor, GitHub. |
| **Cons** | Skills get namespaced (`blueprint:commit` vs `commit`). Requires restructuring to add plugin manifest. Plugin system is relatively new. All-or-nothing per plugin (can't easily override individual skills). |
| **Best for** | Any team size, especially organizations with many projects |
| **Verdict** | Strongest option. |

---

## Side-by-Side Comparison

| Criteria | PR Discipline | Git Remote | Submodule | Subtree | npm+Symlink | npm+CLI | Retrospective | **Plugin** |
|---|---|---|---|---|---|---|---|---|
| Setup friction | None | Medium | High | Medium | Medium | Low | None | **Low** |
| Daily friction | High | High | Medium | Low | None | Low | None | **None** |
| Works in Docker | Yes | Yes | Yes | Yes | **No** | Yes | Yes | **Yes** |
| Works with pnpm 10 | N/A | N/A | N/A | N/A | **No** | Yes | N/A | **Yes** |
| Versioning | None | Git SHAs | Git SHAs | Git SHAs | Semver | Semver | None | **Git ref/SHA** |
| Push back | Manual | Manual | Manual | Awkward | Manual | Manual | **Auto** | Manual |
| Receive updates | Manual | Manual | Manual | Manual | pnpm update | npx update | N/A | **Auto-update** |
| Guided-tier friendly | No | No | No | Mostly | No | Somewhat | Yes | **Yes** |
| Officially supported | N/A | N/A | N/A | N/A | N/A | N/A | N/A | **Yes** |

---

## Recommendation

**Primary: Plugin System (Option 8)** — for distributing skills from the blueprint to consuming projects.

**Complementary: Automated Retrospective (Option 7)** — for flowing improvements back from projects to the blueprint.

Together they create a complete cycle:

```
Blueprint repo (plugin source)
    ↓  Plugin system distributes skills to projects
Project forks
    ↓  Developer improves a skill during work
Retrospective detects change
    ↓  Prepares PR back to blueprint
Blueprint repo merges improvement
    ↓  Plugin auto-update pushes to all projects
```

---

## Critical Gap: Retrospective Provenance Awareness

For the retrospective to route improvements correctly, it needs to know where a skill came from. Currently it does not.

### Skill storage hierarchy

| Level | Path | Owner |
|---|---|---|
| Enterprise | Server-managed settings | Organization admin |
| Personal | `~/.claude/skills/` | Individual user |
| Project | `.claude/skills/` | Project repo |
| Plugin | `<plugin>/skills/` | Plugin author / marketplace |

### Current behavior

The retrospective's [SKILL_IMPROVEMENT.md](../.claude/skills/retrospective/references/SKILL_IMPROVEMENT.md) says:

```
1. Locate skill files in .claude/skills/[skill-name]/
2. Propose the specific edit
3. Ask for approval before applying
```

It looks in one place and assumes it can edit whatever it finds. No awareness of origin, editability, or upstream repos.

### Required provenance routing

| Skill origin | What retrospective should do | Where the change goes |
|---|---|---|
| **Project skill** with no upstream | Edit directly | Local project |
| **Project skill** overriding a plugin | Ask: update local override or PR to plugin source? | Local or upstream PR |
| **Plugin skill** (no local override) | Cannot edit — offer to create local override OR prepare PR to plugin repo | Local override or upstream PR |
| **Personal skill** (`~/.claude/skills/`) | Warn: "This affects all your projects. Continue?" | User's home directory |
| **Enterprise/managed skill** | Cannot edit — inform user to contact admin | Nowhere (read-only) |

### What needs to be built

1. **Provenance detection** — check if a skill file is in `.claude/skills/`, `~/.claude/skills/`, or a plugin directory
2. **Editability check** — is this file writable or managed/plugin-sourced?
3. **Upstream routing** — if a skill came from `github:Digication/claude-blueprint-skills`, the PR should target that repo
4. **Override awareness** — detect when a local skill shadows a plugin skill

This provenance logic is a prerequisite for the retrospective to participate in the skill-sharing cycle.

---

## External Ecosystem Context

### Official Anthropic resources

- [anthropics/skills](https://github.com/anthropics/skills) — Anthropic's public skill repository (106k+ stars)
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) — Official plugin directory
- Plugin submission portal at `claude.ai/settings/plugins/submit`
- [Agent Skills open standard](https://agentskills.io) — adopted by Microsoft, OpenAI, Cursor, GitHub, Figma

### Community ecosystem

| Resource | Description |
|---|---|
| [sickn33/antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) | 1,326+ skills with installer CLI |
| [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 1,000+ skills from official and community |
| [runkids/skillshare](https://github.com/runkids/skillshare) | Cross-tool skill sync utility |
| [SkillsMP](https://skillsmp.com/) | Community marketplace |
| [LiteLLM plugin marketplace](https://docs.litellm.ai/docs/tutorials/claude_code_plugin_marketplace) | Enterprise gateway with plugin governance |

### How Anthropic uses Claude Code internally

Per [their blog post](https://claude.com/blog/how-anthropic-teams-use-claude-code): teams work autonomously with Claude Code via CLAUDE.md files in each codebase. No formal inter-team skill registry was described — documentation and context live within codebases rather than centralized systems.

### Key technical findings

- **pnpm 10 blocks lifecycle scripts by default** — any npm postinstall approach requires explicit allowlisting
- **Claude Code symlink bug [#14836](https://github.com/anthropics/claude-code/issues/14836)** — symlinked skill directories don't appear in `/skills` autocomplete (open as of 2026-03-30)
- **Docker volumes break symlinks** — host-path symlinks inside mounted directories point to paths that don't exist in the container
- **MCP complements skills but doesn't replace them** — MCP handles external system connectivity; skills handle procedural knowledge. "Skills over MCP" is experimental.
