# Release Readiness Follow-up (Team state root guard)

## Local verification commands

Run from repository root:

```bash
npm run build   # TypeScript build
node --test dist/team/__tests__/state.test.js
node --test dist/mcp/__tests__/state-server-team-tools.test.js
npm test
```

## OMG_TEAM_* environment caveat and cleanup

Team/path resolution now supports explicit `OMG_TEAM_STATE_ROOT` across worker worktrees.  
When running local tests manually, clear worker-specific env after each run to avoid cross-test contamination:

```bash
unset OMG_TEAM_STATE_ROOT OMG_TEAM_WORKER OMG_TEAM_LEADER_CWD
```

If a test needs these vars, save/restore them inside the test (`const prev = process.env...` + `finally` cleanup).
