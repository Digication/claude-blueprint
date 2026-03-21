# Safety Defaults by Posture

> Recommendations shown to user after profile generation. Adapt language to the user's tier.

## All Postures

- **Token-saving tip:** Use `!` prefix to run commands directly without AI processing: `! git status`, `! npm test`. This saves tokens and runs instantly — useful for checking files, running tests, or any command you don't need Claude to interpret.

## Maximum Safety

Sandbox: **strongly recommended** — enable with `/sandbox`
```json
{"sandbox":{"enabled":true,"autoAllowBashIfSandboxed":true,"allowUnsandboxedCommands":false,"filesystem":{"denyRead":["~/.aws","~/.ssh","~/.gnupg"],"denyWrite":["/etc","/usr","/bin","/sbin"]}}}
```
- Explain to user: "Commands can only affect your project folder. Passwords and keys are protected."
- Warn: never use `--dangerously-skip-permissions`
- Git: commit frequently as safety net

## Balanced

Sandbox: **suggested** for unfamiliar projects — `/sandbox`
```json
{"sandbox":{"enabled":true,"autoAllowBashIfSandboxed":true,"filesystem":{"denyRead":["~/.aws","~/.ssh"]}}}
```
- Permission mode: default is fine
- Git: suggest committing before risky changes

## Speed Mode

- Sandbox: optional, useful for unfamiliar projects
- `--enable-auto-mode` acceptable in isolated environments
- Use throwaway branches: `git checkout -b prototype/experiment-name`
- Avoid `--dangerously-skip-permissions` with production credentials

## Minimal

- Configure permissions via `settings.json` allow rules
- Sandbox recommended for unfamiliar codebases
- `--enable-auto-mode` reasonable
- Avoid `--dangerously-skip-permissions` unless inside container/VM
