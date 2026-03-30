---
name: fact-check
description: Independent fact-checker that verifies claims made during the conversation. Use when the user questions a response ("are you sure?", "is that right?"), when Claude hedges ("I think", "usually"), or when a response contains specific factual assertions about code behavior, libraries, APIs, or project structure. Can also be invoked directly to audit the full conversation.
metadata:
  allowed-tools: Read, Glob, Grep, Agent, TodoWrite, Bash(git log:*), Bash(git diff:*), Bash(git status:*)
---

# Fact-Check — Independent Claim Verification

A two-stage fact-checker that watches for verifiable claims and spawns fresh-context sub-agents to verify them against real evidence. Designed to catch mistakes without slowing down routine work.

## Arguments

- `(no args)`: Audit the most recent exchange (last user message + last Claude response)
- `all`: Audit all claims across the full conversation
- `<quote or topic>`: Verify a specific claim or topic

## Core Principle

> **Assume all claims are correct by default.**
> For each claim, attempt to find supporting evidence first.
> Only flag a claim when evidence actively contradicts it or no supporting evidence can be found.

This prevents over-correction — the fact-checker should catch real mistakes, not nitpick correct statements.

---

## Stage 1 — Triage (Lightweight, Always Runs)

Scan the target messages and extract every **verifiable claim** — a statement that can be confirmed or denied by examining code, files, documentation, or external sources.

### What counts as a verifiable claim

> **Evaluation order**: When a claim matches multiple types, use the **first match** in the table below (top to bottom). A claim about what a function does at a specific path is **Code behavior** (row 1), not Code existence or Project structure. A claim that a file exists at a path is **Code existence** (row 2). A claim about directory layout or naming conventions is **Project structure** (row 4).

| Type | Example | How to verify |
|---|---|---|
| **Code behavior** | "This function returns null when..." | Read the actual code |
| **Code existence** | "The config is defined in `src/config.ts`" | Search the filesystem |
| **API / library fact** | "React 19 changed how context works" | Web search |
| **Project structure** | "Tests are in the `__tests__` folder" | Glob the project |
| **Git history** | "This was changed in the last commit" | Check git log |
| **CI / runtime artifact** | "Test coverage is 85%", "The build takes 3 minutes" | Check CI logs, coverage reports, or runtime output |
| **Standard / spec** | "HTTP 204 means no content" | Web search or documentation |

### What is NOT a verifiable claim (skip these)

| Type | Example | Why skip |
|---|---|---|
| **Opinion / recommendation** | "I'd suggest using approach A" | Subjective — no right answer. But if an opinion sentence embeds a verifiable sub-claim ("use vitest — it's faster"), extract the factual part ("vitest is faster") as a separate claim. |
| **Planning / next steps** | "Next, I'll update the tests" | Intent, not fact |
| **Code being written** | New function the agent is creating | Testable by running, not by fact-checking |
| **User statements** | Anything the user said — including Claude echoing it ("as you mentioned…", "based on your description…") | Not the fact-checker's job to correct the user. Attribution to the user = user's claim, regardless of who typed it. |
| **Hedged uncertainty** | "I'm not sure, but maybe..." | Already flagged as uncertain |

### Triage output

For each verifiable claim found, record:

- **Claim**: The specific assertion (quote or close paraphrase)
- **Type**: Code behavior / Code existence / API-library / Project structure / Git history / CI-runtime / Standard-spec
- **Source**: Who made it (user or Claude)
- **Confidence signal**: Did the source hedge, or state it definitively?
- **Decomposition**: If a single sentence contains multiple independently verifiable sub-claims (e.g., "The config is in `src/config.ts` and it exports a `DatabaseConfig` type"), split it into separate claims — one per verifiable assertion. Each sub-claim gets its own type assignment and verdict.

If **zero verifiable claims** are found, output this format and stop (do not proceed to Stage 2):

```markdown
# Fact-Check Report

## Summary
0 verifiable claims found — nothing to verify.

**Scanned**: [what was scanned, e.g., "last exchange (1 user message + 1 Claude response)"]
**Why nothing to verify**: [e.g., "Response contained only opinions and planning statements."]
```

---

## Stage 2 — Verification (Per-Claim, Fresh-Context Sub-Agents)

For each claim from Stage 1, spawn a **fresh-context sub-agent** to verify it independently.

### Why fresh context matters

The sub-agent must NOT see the original conversation. If it reads Claude's reasoning, it will be biased toward agreeing (the "echo chamber" effect). Give it only:
1. The **specific claim** to verify
2. The **claim type** (so it knows which tools to use)
3. The **file paths or topics** involved (so it knows where to look)

### Verification by claim type

Refer to [CLAIM_ROUTING.md](references/CLAIM_ROUTING.md) for the sub-agent prompt template and tool assignment per claim type.

**Summary of routing:**

| Claim type | Tools for sub-agent | Verification strategy |
|---|---|---|
| Code behavior | `Read, Glob, Grep` | Read the actual function, trace the logic |
| Code existence | `Glob, Grep` | Search for the file/symbol |
| API / library fact | `Read, Glob, Grep, WebSearch, WebFetch` | Check project dependencies, then search docs |
| Project structure | `Glob` | Pattern-match the filesystem |
| Git history | `Bash(git log:*), Bash(git diff:*)` | Check actual git history |
| CI / runtime artifact | `Glob, Grep, Read, Bash(git log:*)` | Check CI logs, coverage reports, or runtime output |
| Standard / spec | `Read, WebSearch, WebFetch` | Search authoritative sources |

### Sub-agent verdict (per claim)

Each sub-agent must return:

| Verdict | Meaning |
|---|---|
| **Supported** | Evidence confirms the claim |
| **Contradicted** | Evidence actively disproves the claim |
| **Unverifiable** | Cannot find evidence either way |

Along with:
- **Evidence**: What was found (file path + line, git commit, URL, etc.)
- **Explanation**: One sentence connecting the evidence to the verdict

### Parallelism

- Claims of **different types** can be verified in parallel (up to 4 concurrent sub-agents)
- Claims about the **same file** should be batched into one sub-agent to avoid redundant reads
- Claims about the **same git commit** should be batched into one sub-agent (use the commit-scoped batching template in CLAIM_ROUTING.md)
- Use `model: "sonnet"` for sub-agents — verification needs accuracy, not creativity

---

## Stage 3 — Report

After all sub-agents return, compile the results:

```markdown
# Fact-Check Report

## Summary
[X claims checked, S skipped. Y supported, Z contradicted, W unverifiable.]

## Findings

### ✓ Supported
| # | Claim | Evidence |
|---|---|---|
| 1 | [claim text] | [file:line or source] |

### ✗ Contradicted
| # | Claim | What's actually true | Evidence |
|---|---|---|---|
| 1 | [claim text] | [correct information] | [file:line or source] |

### ? Unverifiable
| # | Claim | Why |
|---|---|---|
| 1 | [claim text] | [what was searched, why nothing was found] |

### Skipped (budget cap)
| # | Claim | Why skipped |
|---|---|---|
| 1 | [claim text] | Budget cap reached — 10 claims verified, N remaining |
```

### After the report

- **If contradictions found**: Highlight them clearly and offer to correct the original response or code
- **If all supported**: Confirm briefly — "All claims check out"
- **If unverifiable items**: Note what couldn't be checked and why — don't present absence of evidence as confirmation

---

## Rules

- **Evidence over opinion** — every verdict must cite a specific source (file, line number, URL, git commit). "I believe this is correct" is not verification.
- **Fresh context is mandatory** — sub-agents must not see the conversation that produced the claim. This is the primary defense against echo-chamber confirmation.
- **No user fact-checking** — do not verify or challenge claims made by the user. The user is the authority on their own intent and context.
- **No opinion-checking** — recommendations, suggestions, and preferences are not facts. Skip them.
- **Budget discipline** — if triage produces more than 10 claims, apply this priority cascade to select which 10 to verify (unless `all` is specified):
  1. **Hedged claims** — "I think", "usually", "should work" — these are most likely to be wrong
  2. **High-specificity claims** — exact file paths, line numbers, version numbers, commit hashes — easy to check and high-value if wrong
  3. **Definitive assertions** — stated without hedging
  Within the same priority tier, prefer claims that appear **earlier in the response** (first-come order). List skipped claims in the report's "Skipped" section.
- **Transparency** — always show what was checked and what wasn't. Never silently skip a claim.
- **Humility** — the fact-checker is also an LLM. Present findings as "evidence suggests" not "this is definitively wrong." The user makes the final call.

---

## Gotchas

- **User restatements look like Claude claims** — When Claude writes "as you mentioned, the tests use Docker", the Docker claim belongs to the user. Look for attribution markers: "as you said", "as you mentioned", "based on your description", "you noted that". These are user claims and should be skipped.
- **Opinions can hide facts** — "You should use vitest — it's faster" contains a verifiable claim ("vitest is faster"). Extract the factual sub-claim; skip the recommendation wrapper.
- **File-path claims have type overlap** — "The config is in `src/config.ts`" could be Code existence or Project structure. Use the first-match rule: if the claim is about a specific file existing at a specific path, it is Code existence. If it is about organizational patterns ("tests live in `__tests__`"), it is Project structure.
- **Commit-scoped claims are not file-scoped** — "The last commit added X and removed Y" is two claims sharing a commit context, not a file context. Batch by commit, not by file.
- **CI and runtime claims need the right type** — Coverage percentages, build times, CI pass/fail status, and runtime measurements use the CI / runtime artifact type. If no local artifact exists, the verdict is Unverifiable.
- **Budget prioritization happens before verification** — You cannot know which claims are "contradicted" at triage time. Use the priority cascade (hedged → high-specificity → definitive) instead.
