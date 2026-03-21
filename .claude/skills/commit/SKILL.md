---
name: commit
description: Creates a Conventional Commits message and commits changes. Use when the user asks to commit, craft a commit message, or manage git commit/branching.
metadata:
  allowed-tools: Read, Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git checkout:*), Bash(git branch:*)
---

## Arguments
- `scope`: Optional. The commit scope. If not provided, infer from changed files.

## Workflow

1. Run `git status` to see all changes
2. If no changes, stop and tell the user the working tree is clean
3. Run `git diff` (unstaged) and `git diff --staged` (staged) to understand changes
4. Run `git log --oneline -5` to match the repo's existing commit style
5. Determine the commit type:
   - `feat`: New feature
   - `fix`: Bug fix
   - `refactor`: Code change that neither fixes a bug nor adds a feature
   - `docs`: Documentation only
   - `test`: Adding or updating tests
   - `chore`: Maintenance tasks
   - Optional: `perf`, `build`, `ci`, `style`, `revert`
6. If user requests a new branch:
   - Detect the default/base branch from git config/remote
   - Suggest a branch name: `type/short-description` (e.g., `feat/add-user-auth`)
7. Decide staging behavior:
   - If there are staged changes, confirm whether to commit only those or stage more
   - If nothing is staged, propose which files to stage and ask for approval
8. Present the proposed commit message (and branch name if applicable)
9. Ask the user for approval before proceeding
10. Stage the approved files and create the commit

## Rules

- Keep the description under 72 characters
- Use imperative mood ("add" not "added")
- No period at the end
- If changes span multiple areas, use the most relevant scope or omit scope
- Use lowercase with hyphens for branch names
