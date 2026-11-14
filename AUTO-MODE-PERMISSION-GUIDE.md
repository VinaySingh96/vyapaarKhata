# Coding-agent permissions and auto mode — macOS-safe setup

The exact setting names depend on the coding-agent product. Use this as a permission policy, not as a guessed click path.

## Recommended access scope

1. Put the repository in a dedicated folder such as `~/Projects/vyapaarkhata`.
2. Open that folder as the agent's workspace/project.
3. Grant read/write access to that workspace only.
4. Allow the agent to run project-local terminal commands and tests.
5. Allow package-manager network access when dependencies must be installed.
6. Keep credentials, SSH keys, Keychain, browser profiles and unrelated folders outside the workspace.
7. Use `.env.example` with placeholders. Keep real `.env` files out of Git and out of agent prompts.

## Safe operations to auto-approve (workspace-scoped)

- Read/search/list files under the repository.
- Create/edit files under the repository.
- Run formatter, lint, typecheck, unit and integration tests.
- Run code generators using checked-in config.
- Install declared dependencies using the project's one package manager.
- Start/stop project-local development processes.
- Run migrations against explicitly named disposable local development/test databases.
- Create local Git branches/worktrees and inspect diffs.

## Operations that should still require approval

- `sudo`, administrator/root access or system-wide installation.
- Full Disk Access or broad macOS privacy/security permission changes.
- Reading Keychain, SSH private keys, cloud credentials or unrelated personal folders.
- Deleting files outside the workspace or broad destructive cleanup such as `rm -rf`.
- Dropping databases, deleting backups or running migrations against staging/production.
- Force-push, rewriting shared history, deleting remote branches or merging protected branches.
- Firewall/network/security settings, external deployment or release publication.
- Uploading files or logs that could contain customer data/secrets.

## Do not do this

- Do not disable macOS Gatekeeper, SIP or other OS security protections.
- Do not grant unrestricted root/admin or whole-disk access merely to avoid prompts.
- Do not use an unrestricted “skip all permissions/sandbox” mode for a long-running unattended job.
- Do not place production credentials in the repository or agent chat.

## Practical auto mode

Use the agent's most permissive **workspace-scoped** mode, with automatic approval for routine reads/writes/build/test/package tasks. Keep approval gates for destructive, external, privileged or production operations. For a long project, ask the agent to work task-by-task, checkpoint frequently and maintain a task ledger; do not let it execute an unbounded plan with unrestricted machine access.

If the tool provides only a single all-or-nothing permission mode, prefer the safer mode and allow routine operations as they are requested. The precise toggle names and available modes must be checked against the actual product/version.
