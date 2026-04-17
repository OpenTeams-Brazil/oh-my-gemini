# Contributing to oh-my-gemini

Thanks for contributing.

## Development setup

- Node.js >= 20
- npm

```bash
npm install
npm run lint
npm run build
npm test
```

For local CLI testing:

```bash
npm link
omg setup
omg doctor
```

### Team/state coverage gate (issue #454)

CI enforces minimum coverage for critical team orchestration modules:

```bash
npm run coverage:team-critical
```

This command checks coverage for `dist/team/**` and `dist/state/**` and writes reports to `coverage/team/`.

### Release-readiness local verification

When validating team/state changes, run this sequence locally:

```bash
npm run build
node --test dist/team/__tests__/state.test.js dist/hooks/__tests__/notify-hook-cross-worktree-heartbeat.test.js
npm test
```

If you were recently in a team worker session, clear team env vars first so tests do not inherit worker-specific state roots:

```bash
unset OMG_TEAM_WORKER OMG_TEAM_STATE_ROOT OMG_TEAM_LEADER_CWD OMG_TEAM_WORKER_CLI OMG_TEAM_WORKER_CLI_MAP OMG_TEAM_WORKER_LAUNCH_ARGS
```

## Project structure

- `src/` -- TypeScript source (CLI, config, agents, MCP servers, hooks, modes, team, verification)
- `prompts/` -- 30 agent prompt markdown files (installed to `~/.gemini/prompts/`)
- `skills/` -- 39 skill directories with `SKILL.md` (installed to `~/.gemini/skills/`)
- `templates/` -- `GEMINI.md` orchestration brain template

### Adding a new agent prompt

1. Create `prompts/my-agent.md` with the agent's system prompt
2. Run `omg setup --force` to install it to `~/.gemini/prompts/`
3. Use `/prompts:my-agent` in Gemini CLI

### Prompt guidance contract

Before changing `GEMINI.md`, `templates/GEMINI.md`, `prompts/*.md`, or the generated `developer_instructions` text in `src/config/generator.ts`, read [`docs/prompt-guidance-contract.md`](./docs/prompt-guidance-contract.md).

That document defines the GPT-5.4 behavior contract contributors should preserve across prompt surfaces and explains how it differs from posture-aware routing metadata.

### Adding a new skill

1. Create `skills/my-skill/SKILL.md` with the skill workflow
2. Run `omg setup --force` to install it to `~/.gemini/skills/`
3. Use `$my-skill` in Gemini CLI

## Workflow

1. Create a branch from `dev` for normal contributions.
2. Make focused changes.
3. Run lint, build, and tests locally.
4. Open a pull request targeting `dev` using the provided template. Use `main` only for maintainer-directed exceptions.

## Commit style

Use concise, intent-first commit messages. Existing history uses prefixes like:

- `feat:`
- `fix:`
- `docs:`
- `chore:`

Example:

```text
docs: clarify setup steps for Gemini CLI users
```

## Pull request checklist

- [ ] Scope is focused and clearly described
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] Documentation updated when behavior changed
- [ ] No unrelated formatting/refactor churn

## Reporting issues

Use the GitHub issue templates for bug reports and feature requests, including reproduction steps and expected behavior.
