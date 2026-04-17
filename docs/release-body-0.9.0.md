# oh-my-gemini v0.9.0

<p align="center">
  <img src="https://raw.githubusercontent.com/Yeachan-Heo/oh-my-gemini/v0.9.0/docs/shared/omg-character-spark-initiative.jpg" alt="OMX character sparked for the Spark Initiative" width="720">
</p>

`0.9.0` is the Spark Initiative release: OMX now has a stronger native fast path for repository discovery, shell-native inspection, and cross-platform native distribution.

## Highlights

### `omg explore`

- adds a dedicated read-only exploration entrypoint
- uses a Rust-backed explore harness
- keeps shell-native exploration constrained, allowlisted, and read-only
- supports packaged native resolution plus source/repo-local fallback paths

### `omg sparkshell`

- adds an operator-facing native shell sidecar
- supports direct command execution
- summarizes long output into compact sections
- supports explicit tmux-pane summarization:

```bash
omg sparkshell --tmux-pane %12 --tail-lines 400
```

### Explore ↔ sparkshell integration

- qualifying read-only shell-native `omg explore` prompts can route through `omg sparkshell`
- fallback behavior remains explicit and hardened
- guidance/docs/tests were aligned around this contract

### Worker follow-through polish

- worker mailbox guidance now asks for concrete progress updates without implying work should stop after replying
- inbox/mailbox trigger wording now tells workers to continue assigned or next feasible work after reporting status
- runtime/bootstrap wording and associated tests were aligned around this behavior

### Release pipeline upgrades

- cross-platform native publishing for:
  - `omg-explore-harness`
  - `omg-sparkshell`
- native release manifest generation with per-target metadata
- packed-install smoke verification in the release workflow
- `build:full` validated as the one-shot release-oriented build path

## Important Spark Initiative notes

- Users can install OMX normally with `npm install -g oh-my-gemini`.
- The npm tarball intentionally excludes staged cross-platform native binaries.
- Tagged releases publish verified native archives for `omg-explore-harness` and `omg-sparkshell`.
- Packaged installs hydrate the matching native binary through `native-release-manifest.json`.
- CI now hardens the Rust path with explicit toolchain setup, `cargo fmt --all --check`, and `cargo clippy --workspace --all-targets -- -D warnings`.

## Upgrade note

If you use project-scoped OMX installs, rerun:

```bash
omg setup --force --scope project
```

after upgrading so managed config/native-agent paths are refreshed.

## Local release verification summary

Validated locally on `dev` before tagging:

- `node scripts/check-version-sync.mjs --tag v0.9.0`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run check:no-unused`
- `npm test`
- `npm run build:full`
- `npm run test:explore`
- `npm run test:sparkshell`
- `node bin/omg.js doctor`
- `node bin/omg.js setup --dry-run`
- `npm pack --dry-run`

## Notable PRs

- [#782](https://github.com/Yeachan-Heo/oh-my-gemini/pull/782) — explore routes qualifying read-only shell tasks via sparkshell
- [#784](https://github.com/Yeachan-Heo/oh-my-gemini/pull/784) — cross-platform native publishing and release-pipeline follow-through
- [#785](https://github.com/Yeachan-Heo/oh-my-gemini/pull/785) — team runtime lifecycle and cleanup hardening
- [#786](https://github.com/Yeachan-Heo/oh-my-gemini/pull/786) — nested help routing cleanup
- [#787](https://github.com/Yeachan-Heo/oh-my-gemini/pull/787) — centralized OMX default model resolution
- [#788](https://github.com/Yeachan-Heo/oh-my-gemini/pull/788) — HUD branch/config loading hardening
- [#789](https://github.com/Yeachan-Heo/oh-my-gemini/pull/789) — distribute generated aspect tasks across workers
- [#793](https://github.com/Yeachan-Heo/oh-my-gemini/pull/793) — Windows Gemini command shim probing fix
- [#794](https://github.com/Yeachan-Heo/oh-my-gemini/pull/794) — merge `experimental/dev` into `dev`
- [#805](https://github.com/Yeachan-Heo/oh-my-gemini/pull/805) — keep workers running after mailbox replies

## Related issues

- [#781](https://github.com/Yeachan-Heo/oh-my-gemini/pull/781) — sparkshell summary reasoning hardening
- [#744](https://github.com/Yeachan-Heo/oh-my-gemini/issues/744) — lifecycle profile persistence
- [#745](https://github.com/Yeachan-Heo/oh-my-gemini/issues/745) — cleanup policy hardening
- [#746](https://github.com/Yeachan-Heo/oh-my-gemini/issues/746) — governance split follow-through
- [#741](https://github.com/Yeachan-Heo/oh-my-gemini/issues/741) — linked Ralph/team runtime follow-up
- [#732](https://github.com/Yeachan-Heo/oh-my-gemini/issues/732) — related team lifecycle follow-up
