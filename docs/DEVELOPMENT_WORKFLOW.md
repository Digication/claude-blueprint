# Development Workflow Guide

How Claude manages your development work — from starting a new feature to switching between tasks to picking up where you left off.

This guide covers what happens behind the scenes so you understand the flow, but you don't need to memorize any of this. Just talk to Claude naturally and it handles the rest.

---

## Two Skills, One Workflow

Claude uses two skills internally to manage your work:

| Skill | What it does | Analogy |
|---|---|---|
| **Task** | Keeps your workspace safe — saves work, switches branches, restores previous work | Like saving your game before starting a new level |
| **Implement** | Plans and builds things — evaluates complexity, creates plans, writes code | Like having a builder who checks the blueprints before picking up tools |

You never need to call these by name. Claude detects the situation and uses the right one. Here's how they work together:

```
You say what you want
        │
        ▼
┌─────────────────┐
│  Task            │  ← "Is the workspace safe?"
│  - dirty state?  │     Saves or stashes uncommitted work
│  - need branch?  │     Creates a branch if needed
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Implement       │  ← "What are we building?"
│  - how complex?  │     Small → builds directly
│  - need a plan?  │     Large → creates a plan, then builds phase by phase
└─────────────────┘
```

---

## Workflow 1: Build Something Small

**When it applies:** The change touches 1–3 files with a clear scope — a bug fix, a UI tweak, adding a small feature.

### Chat example

```
You:  Fix the typo in the footer — it says "Copyrigth"

Claude: Fixed the typo in Footer.tsx line 42. Want me to save this with a commit?

You:  Yes

Claude: Saved — "fix(ui): correct typo in footer"
```

### What happens internally

1. Claude checks for unsaved work → clean, nothing to do
2. Evaluates complexity → trivial (1 file) → Direct mode
3. Doesn't create a branch (too small to bother)
4. Makes the fix
5. Offers to commit

---

## Workflow 2: Build Something Big

**When it applies:** The work touches many files, involves multiple areas of the codebase, or is a brand new app.

### Chat example

```
You:  Build me a user dashboard with analytics charts, activity feed,
      and notification preferences

Claude: This is a bigger piece of work — it touches several areas.
        Let me put together a step-by-step plan first.

        Here's what I'm thinking:
        1. Database schema + API endpoints
        2. Analytics charts component
        3. Activity feed component
        4. Notification preferences
        5. Integration + testing

        [links to detailed plan docs]

        When you're ready, start a new chat and tell me to
        continue building the dashboard.
```

### What happens internally

1. Claude checks for unsaved work → clean
2. Creates a `feat/user-dashboard` branch
3. Evaluates complexity → large (10+ files) → Plan mode
4. Creates plan documents in `docs/implementation-plan/user-dashboard/`
5. Shows you the plan for review
6. Waits for you to start a new chat to begin building (keeps the context fresh)

---

## Workflow 3: Continue Planned Work

**When it applies:** You previously created a plan and want to continue building it in a new chat session.

### Chat example

```
You:  Continue building the dashboard

Claude: I found the dashboard plan. Phases 1 and 2 are done.
        Picking up at phase 3 — the activity feed component.

        [... builds phase 3, commits, moves to phase 4 ...]
```

### What happens internally

1. Claude finds the plan at `docs/implementation-plan/user-dashboard/`
2. Checks git history to see which phases are already committed
3. Resumes from the first incomplete phase
4. Builds each phase, runs verification, commits after each one

---

## Workflow 4: Switch to Something Urgent

**When it applies:** You're in the middle of work and need to drop everything for a bug or a different task.

### Chat example

```
You:  Hey, there's a bug in the login page — can you look at it?

Claude: Before we switch — you have unsaved work on the dashboard.
        Want me to save it so nothing gets lost?

You:  Yes

Claude: Saved. Now on a fresh branch for the login fix. What's the bug?

You:  Users get a blank screen after submitting the login form

Claude: [... investigates and fixes the bug ...]
        Fixed — the form handler wasn't awaiting the API response.
        Want me to save this?
```

### What happens internally

1. Claude detects: uncommitted changes + new topic → needs to save first
2. Stashes current work with a descriptive label:
   `"task: feat/user-dashboard - phase 3 activity feed in progress"`
3. Creates `fix/login-bug` branch from main
4. Switches to the new work

---

## Workflow 5: Pick Up Where You Left Off

**When it applies:** You previously saved or paused work and want to go back to it.

### Chat example

```
You:  Go back to the dashboard work

Claude: Welcome back. You were building the activity feed
        (phase 3 of 5). Your unsaved changes are restored.
        Picking up where you left off.

        [... continues building phase 3 ...]
```

### What happens internally

1. Claude finds the stash matching `feat/user-dashboard`
2. Checks out the `feat/user-dashboard` branch
3. Restores the stashed changes
4. Detects the implementation plan and checks phase progress
5. Resumes building

---

## Workflow 6: "What's Going On?" — The Status Dashboard

**When it applies:** You're starting a new session and want to know the state of everything — what's in progress, what's done, what's stale.

### Chat example

```
You:  What's pending?

Claude: Here's what's going on across your project:

        IN PROGRESS
          feat/user-dashboard (3 days ago)
            Plan: phase 3/5 complete (activity feed is next)
            8 commits, not merged

          fix/login-bug (1 day ago) ← you are here
            Ready to merge — fix is committed and tested

        STASHED WORK
          "feat/user-dashboard - phase 3 activity feed" (3 days ago)

        POSSIBLY STALE
          feat/old-signup-flow (3 weeks ago, not merged)

        RECENTLY COMPLETED
          feat/dark-mode (merged to main 5 days ago)

        What would you like to work on?
```

### What happens internally

No database, no tracking files. Claude reads git on the spot:

| Information | Git command |
|---|---|
| All branches + last activity | `git branch --sort=-committerdate` |
| What each branch is about | Branch name + last commit message |
| Stashed work | `git stash list` |
| Plan progress | Phase commit messages + plan docs in repo |
| Completed work | `git log --merges` on main |
| Stale branches | Branches with no commits in 2+ weeks |

Git is the database. The dashboard is a reader, not a writer.

---

## Workflow 7: Brand New User, First Time

**When it applies:** First time using the project. No profile exists yet.

### Chat example

```
You:  I want to build a todo app

Claude: Welcome! Before we start building, let me learn a bit about
        you so I can work the way you prefer.

        [... onboarding questions ...]

        Great, you're all set. Now — a todo app has a few parts,
        so let me plan this out step by step before we start.

        Here's the plan:
        1. Project setup + database
        2. API endpoints
        3. UI components
        4. Testing

        When you're ready, start a new chat and tell me to
        build the todo app.
```

### What happens internally

1. No user profile found → triggers onboarding first
2. After onboarding → `implement` evaluates complexity → complex (new app) → Plan mode
3. Creates the plan

---

## How Complexity Is Evaluated

Claude doesn't always create a plan. It assesses the scope first:

| Scope | What Claude does |
|---|---|
| 1–3 files, single concern | Builds directly — no plan, no fuss |
| 4–10 files, moderate scope | Builds directly with step tracking |
| 10+ files, multiple areas, or a new app | Creates a phased plan first |
| You say "plan" or "create a plan" | Always plans, regardless of size |
| You say "just do it" | Always builds directly, regardless of size |

When in doubt, Claude asks: *"This looks like it touches a few areas. Want me to plan first or jump straight in?"*

---

## How Unsaved Work Is Handled

When Claude detects uncommitted changes and you're about to switch to something new, it asks before doing anything.

**What you see** depends on your comfort level:

| Your tier | What Claude asks |
|---|---|
| **Guided** | "You have unsaved work. Want me to save it first?" → Yes / No |
| **Supported** | Same, plus a one-line summary of what the unsaved work is |
| **Standard / Expert** | Full options: Stash, WIP commit, Keep (it's related), Discard |

Claude never throws away your work without asking twice.

---

## Key Principles

### Git is the single source of truth

There's no separate tracking file or database. Everything Claude needs to reconstruct your work state comes from git:

- **Branch names** tell Claude what each task is about
- **Commit messages** tell Claude what was done
- **Stash messages** include context for why work was paused
- **Plan docs** in the repo tell Claude what's planned and how far along it is
- **Merge history** tells Claude what's been completed

This means your work state is always accurate, never out of sync, and doesn't depend on any extra tooling.

### One conversation, one focus

Each chat session works best with a single focus. When you need to:
- **Continue planned work** → Start a new chat, say "continue building X"
- **Switch tasks** → Claude saves current work, starts fresh
- **Check status** → Ask "what's pending?" in any chat

### The user reviews, Claude builds

Claude handles the mechanics — branching, planning, building, testing, committing. Your job is to:
1. Say what you want
2. Review what Claude builds
3. Approve or redirect

You don't need to know git commands, file structures, or build tools. Just describe the outcome you want.
