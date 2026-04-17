---
name: omg-setup
description: Setup and configure oh-my-gemini using current CLI behavior
---

# OMG Setup

Use this skill when users want to install or refresh oh-my-gemini for the **current project plus user-level OMG directories**.

## Command

```bash
omg setup [--force] [--dry-run] [--verbose] [--scope <user|project>]
```

If you only want lightweight `GEMINI.md` scaffolding for an existing repo or subtree, use `omg agents-init [path]` instead of full setup.

Supported setup flags (current implementation):
- `--force`: overwrite/reinstall managed artifacts where applicable
- `--dry-run`: print actions without mutating files
- `--verbose`: print per-file/per-step details
- `--scope`: choose install scope (`user`, `project`)

## What this setup actually does

`omg setup` performs these steps:

1. Resolve setup scope:
   - `--scope` explicit value
   - else persisted `./.omg/setup-scope.json` (with automatic migration of legacy values)
   - else interactive prompt on TTY (default `user`)
   - else default `user` (safe for CI/tests)
2. Create directories and persist effective scope
3. Install prompts, native agent configs, skills, and merge config.toml (scope determines target directories)
4. Verify Team CLI API interop markers exist in built `dist/cli/team.js`
5. Generate project-root `./GEMINI.md` from `templates/GEMINI.md` (or skip when existing and no force)
6. Configure notify hook references and write `./.omg/hud-config.json`

## Important behavior notes

- `omg setup` only prompts for scope when no scope is provided/persisted and stdin/stdout are TTY.
- Local project orchestration file is `./GEMINI.md` (project root).
- If `GEMINI.md` exists and `--force` is not used, interactive TTY runs ask whether to overwrite. Non-interactive runs preserve the file.
- Scope targets:
  - `user`: user directories (`~/.gemini`, `~/.gemini/skills`, `~/.omg/agents`)
  - `project`: local directories (`./.gemini`, `./.gemini/skills`, `./.omg/agents`)
- Migration hint: in `user` scope, if historical `~/.agents/skills` still exists alongside `${GEMINI_HOME:-~/.gemini}/skills`, current setup prints a cleanup hint. **Why the paths differ**: `${GEMINI_HOME:-~/.gemini}/skills/` is the path current Gemini CLI natively loads as its skill root; `~/.agents/skills/` was the skill root in an older Gemini CLI release before `~/.gemini` became the standard home directory. OMG writes only to the canonical `${GEMINI_HOME:-~/.gemini}/skills/` path. When both directories exist simultaneously, Gemini discovers skills from both trees and may show duplicate entries in Enable/Disable Skills. Archive or remove `~/.agents/skills/` to resolve this.
- If persisted scope is `project`, `omg` launch automatically uses `GEMINI_HOME=./.gemini` unless user explicitly overrides `GEMINI_HOME`.
- With `--force`, AGENTS overwrite may still be skipped if an active OMG session is detected (safety guard).
- Legacy persisted scope values (`project-local`) are automatically migrated to `project` with a one-time warning.

## Recommended workflow

1. Run setup:

```bash
omg setup --force --verbose
```

2. Verify installation:

```bash
omg doctor
```

3. Start Gemini with OMG in the target project directory.

## Expected verification indicators

From `omg doctor`, expect:
- Prompts installed (scope-dependent: user or project)
- Skills installed (scope-dependent: user or project)
- GEMINI.md found in project root
- `.omg/state` exists
- OMG MCP servers configured in scope target `config.toml` (`~/.gemini/config.toml` or `./.gemini/config.toml`)

## Troubleshooting

- If using local source changes, run build first:

```bash
npm run build
```

- If your global `omg` points to another install, run local entrypoint:

```bash
node bin/omg.js setup --force --verbose
node bin/omg.js doctor
```

- If GEMINI.md was not overwritten during `--force`, stop active OMG session and rerun setup.
