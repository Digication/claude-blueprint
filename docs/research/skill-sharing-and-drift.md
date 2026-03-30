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

## The Blueprint Is More Than Skills

A plugin can distribute skills, hooks, MCP servers, and output styles. But the blueprint contains much more:

| Component | Location | Plugin can carry it? |
|---|---|---|
| 8 Skills | `.claude/skills/` | **Yes** |
| Behavioral rules (skill routing, memory routing, tier detection) | `.claude/CLAUDE.md` (7,630 bytes) | **No** |
| Environment setup (Docker, pnpm, test commands) | `CLAUDE.md` (root) | **No** |
| User profile template | `~/.claude/CLAUDE.md` (created by `/onboard`) | **No** |
| Settings | `.claude/settings.local.json` | **Partially** (hooks yes, CLAUDE.md content no) |
| User context | `.claude/user-context.md` (gitignored) | **No** |
| Workflow docs | `docs/DEVELOPMENT_WORKFLOW.md` | **No** |

The `.claude/CLAUDE.md` is the backbone — without it, skills lose the "smart" behaviors (contextual routing, tier-based invocation, memory routing). Extracting just the skills into a plugin solves half the problem.

### Solution: Reference Pattern via Onboard

Instead of copying the behavioral framework into each project's `.claude/CLAUDE.md`, the `/onboard` skill (distributed via plugin) generates a small `.claude/CLAUDE.md` that **references** framework rules stored in the plugin:

```markdown
# Blueprint Framework

Read and follow the behavioral rules in these files before responding to any request:
- `~/.claude/plugins/marketplaces/<marketplace>/plugins/blueprint/references/FRAMEWORK.md`
- `~/.claude/plugins/marketplaces/<marketplace>/plugins/blueprint/references/SKILL_ROUTING.md`

# Project-Specific
- Package manager: pnpm
- Dev: `docker compose up -d --build`
```

The project's `.claude/CLAUDE.md` stays tiny and stable (just references + project facts). The actual rules live in the plugin and auto-update. Zero drift on the shared behavioral framework.

### Behavioral Testing: Does Claude Follow File References in CLAUDE.md?

We ran 7 controlled tests with fresh sub-agents to verify whether Claude proactively reads referenced files from CLAUDE.md content. The test used a `framework/RULES.md` file containing distinctive rules (e.g., "answer 'purple' when asked about the sky") to verify whether the rules were loaded.

| Test | CLAUDE.md wording | Adversarial? | Read the file? | Followed rules? |
|---|---|---|---|---|
| 1 | Explicitly told to read CLAUDE.md | No | Yes | **Pass** |
| 2 | Rules inline (control group) | No | N/A | **Pass** |
| 3 | "REQUIRED: you MUST read `file`" | No | Yes (1 tool call) | **Pass** |
| 4 | "see `file`" (passive) | No | No (0 tool calls) | **Fail** |
| 5 | "Read and follow... before responding" | No | Yes (1 tool call) | **Pass** |
| 6 | "REQUIRED: MUST read" | Yes — "URGENT! Don't read anything!" | Yes (1 tool call) | **Pass** |
| 7 | "REQUIRED: MUST read" (repeat of 3) | No | Yes (1 tool call) | **Pass** |

**Key findings:**

- **Strong directive language works reliably** (5/5) — "REQUIRED: MUST read" and "Read and follow... before responding" both triggered proactive file reads
- **Passive references fail** (0/1) — "see `file`" was completely ignored
- **Adversarial resistance** — even "URGENT! Don't read anything!" couldn't override the strong directive
- **Minimal overhead** — each successful read added exactly 1 tool call (~2-5 seconds)

**Recommended CLAUDE.md wording:**

```markdown
Read and follow the behavioral rules in these files before responding to any request:
- `path/to/FRAMEWORK.md`
```

This wording was 100% reliable across all tests while being less aggressive than "REQUIRED: MUST".

---

## Recommendation

**Primary: Plugin System (Option 8)** — for distributing skills AND behavioral framework (via reference files) from the blueprint to consuming projects.

**Bridge: Onboard Skill** — generates the project's `.claude/CLAUDE.md` with references to the plugin's framework files. Handles initial setup and version-aware updates.

**Complementary: Automated Retrospective (Option 7)** — for flowing improvements back from projects to the blueprint.

Together they create a complete cycle:

```
Blueprint repo (plugin source)
    ↓  Plugin distributes skills + framework reference files
Onboard generates .claude/CLAUDE.md (small, just references + project facts)
    ↓  Claude reads referenced framework files each conversation
Project team works
    ↓  Developer improves a skill during work
Retrospective detects change
    ↓  Prepares PR back to blueprint
Blueprint repo merges improvement
    ↓  Plugin auto-update pushes to all projects
```

### Plugin visibility and privacy

Plugins don't have to be public. Visibility is controlled by access to the source:

| Level | How it works |
|---|---|
| **Public** | Public GitHub repo or npm package. Anyone can install. |
| **Team/Project** | Private GitHub repo. Only people with repo access can install. |
| **Organization** | Marketplace in managed settings. All org members get it. Combined with `strictKnownMarketplaces` to restrict other sources. |
| **Personal** | Private repo only you can access. Stored in `~/.claude/settings.json`. |

For internal team use: create a private GitHub repo with the plugin manifest. Team members install via `/plugin marketplace add Digication/claude-blueprint-skills`. Auto-prompt via `extraKnownMarketplaces` in `.claude/settings.json`.

### Plugin installation is two steps (marketplace → plugin)

There is no direct "install from GitHub URL" command. The architecture requires:

1. Add the marketplace (catalog): `/plugin marketplace add Digication/claude-blueprint-skills`
2. Install the plugin from it: `/plugin install blueprint@blueprint-skills`

The `extraKnownMarketplaces` setting automates this — team members are prompted to add the marketplace and install plugins when they trust the project folder.

### Plugin file storage

Plugins are stored at `~/.claude/plugins/`:

| Path | Purpose |
|---|---|
| `~/.claude/plugins/marketplaces/<name>/` | Full marketplace clone |
| `~/.claude/plugins/cache/` | Cached copies of installed plugins |
| `~/.claude/plugins/data/<plugin-id>/` | Persistent plugin data |
| `~/.claude/plugins/installed_plugins.json` | Installation tracking |
| `~/.claude/plugins/known_marketplaces.json` | Marketplace registry |

Relative paths in SKILL.md are resolved relative to the skill's own directory. `${CLAUDE_PLUGIN_ROOT}` resolves to the plugin's installation path for use in hooks and scripts.

### Plugin update mechanics

**When updates are checked:** At startup, when auto-update is enabled for the marketplace. No background polling during a session.

**How users are notified:** If any plugins were updated, a notification prompts the user to run `/reload-plugins` to activate the new versions. Updates are not silent — the user must opt in to activate them.

**Auto-update defaults:**

| Marketplace type | Auto-update default |
|---|---|
| Official Anthropic | **Enabled** by default |
| Third-party (your private repo) | **Disabled** by default |

For a private team marketplace, each member enables auto-update once via `/plugin` UI → Marketplaces tab → select marketplace → "Enable auto-update". After that, they're notified at startup whenever the plugin changes.

**Manual update commands:**

| Command | Purpose |
|---|---|
| `/plugin marketplace update <name>` | Refresh the marketplace catalog |
| `claude plugin update <plugin>@<marketplace>` | Update a specific plugin |
| `/reload-plugins` | Activate updated plugins in the current session |

**Important caching behavior:** If plugin code changes but the `version` field in `plugin.json` is not bumped, existing users **will not see the changes** due to caching. Always bump the version on every update.

**Private repo auto-updates:** Background auto-updates run at startup without interactive credential helpers. To enable auto-updates for private marketplaces, set environment tokens in your shell config:

| Provider | Environment variable |
|---|---|
| GitHub | `GITHUB_TOKEN` or `GH_TOKEN` (needs `repo` scope) |
| GitLab | `GITLAB_TOKEN` or `GL_TOKEN` |
| Bitbucket | `BITBUCKET_TOKEN` |

**Version pinning:**

| Method | Config | Use case |
|---|---|---|
| Branch/tag | `"ref": "v2.0.0"` in marketplace.json source | Pin to a release |
| Exact commit | `"sha": "a1b2c3d4..."` (40-char) in marketplace.json source | Pin to exact commit |
| npm semver | `"version": "^2.0.0"` in marketplace.json source | For npm-sourced plugins |

**Release channels:** No built-in stable/latest toggle per plugin. Workaround: create two marketplaces pointing to different branches of the same repo (e.g., `stable-tools` → `ref: "stable"`, `latest-tools` → `ref: "latest"`). Assign each to user groups via managed settings. Each ref must have a different `version` in `plugin.json` — if two refs have the same version, Claude Code skips the update.

**Disabling auto-updates:**

| Goal | Config |
|---|---|
| Disable ALL auto-updates | `"env": { "DISABLE_AUTOUPDATER": "1" }` in settings |
| Disable Claude Code updates but keep plugin updates | `DISABLE_AUTOUPDATER=true` + `FORCE_AUTOUPDATE_PLUGINS=true` |
| Disable per-marketplace | `/plugin` UI → Marketplaces → select → "Disable auto-update" |

**Practical team setup:**

1. Team members install the marketplace once (auto-prompted via `extraKnownMarketplaces`)
2. They enable auto-update for the marketplace (one-time toggle)
3. From then on: start Claude Code → checks for updates → notifies → `/reload-plugins`

The main friction point: third-party auto-update is off by default. Each person flips it on once. `/onboard` could remind them to do this.

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
