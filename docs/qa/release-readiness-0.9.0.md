# Release Readiness Draft - 0.9.0

Date: **2026-03-12**
Target version: **0.9.0**
Verdict: **GO** ✅

`0.9.0` has now been version-bumped locally and the post-bump release gate was rerun successfully on `dev`.

## Scope reviewed

- unreleased `dev` work since `v0.8.15`
- Spark Initiative surfaces:
  - `omg explore`
  - `omg sparkshell`
  - explore-to-sparkshell routing for qualifying read-only shell tasks
- native release pipeline work:
  - cross-platform native publishing
  - release manifest generation
  - packed-install smoke gate
  - `build:full` workflow validation
- release-note and QA draft creation for `0.9.0`

## Validation evidence completed

| Check | Command | Result |
|---|---|---|
| Full source build | `npm run build:full` | PASS |
| CLI help smoke | `node bin/omg.js --help` | PASS |
| Version smoke | `node bin/omg.js version` | PASS (`oh-my-gemini v0.9.0`) |
| Version sync | `node scripts/check-version-sync.mjs --tag v0.9.0` | PASS |
| Ask help smoke | `node bin/omg.js ask --help` | PASS |
| HUD help smoke | `node bin/omg.js hud --help` | PASS |
| Doctor smoke | `node bin/omg.js doctor` | PASS (`10 passed, 0 warnings, 0 failed`) |
| Status smoke | `node bin/omg.js status` | PASS |
| Setup dry-run smoke | `node bin/omg.js setup --dry-run` | PASS |
| Explore help smoke | `node bin/omg.js explore --help` | PASS |
| Explore prompt-file smoke | `node bin/omg.js explore --prompt-file /tmp/omg-explore-smoke.txt` | PASS |
| Explore→sparkshell routing smoke | `OMG_SPARKSHELL_LINES=1 node bin/omg.js explore --prompt 'git log --oneline -10'` | PASS (summary output emitted) |
| Sparkshell help smoke | `node bin/omg.js sparkshell --help` | PASS |
| Sparkshell direct smoke | `node bin/omg.js sparkshell git --version` | PASS (`git version 2.34.1`) |
| Sparkshell summary smoke | `OMG_SPARKSHELL_LINES=1 node bin/omg.js sparkshell git log --oneline -10` | PASS (summary output emitted) |
| Sparkshell tmux-pane smoke | `node bin/omg.js sparkshell --tmux-pane %2141 --tail-lines 120` | PASS |
| Full test suite | `npm test` | PASS (`2375` pass / `0` fail) |
| Packed tarball dry run | `npm pack --dry-run` | PASS (`oh-my-gemini-0.9.0.tgz`) |
| Explore verification lane | `npm run test:explore` | PASS (`39` pass / `0` fail) |
| Sparkshell verification lane | `npm run test:sparkshell` | PASS (Rust suites passed: `32 + 11 + 5`, `0` fail) |

## Current release-shape evidence

- current package version: `0.9.0`
- latest existing git tag in repo: `v0.8.15`
- current branch: `dev`
- unreleased head vs tag: **55 non-merge commits**
- unreleased diff vs tag: **149 files changed, +12,325 / -254**

## Remaining release actions

- tag `v0.9.0` and verify GitHub Actions release jobs complete:
  - native asset publishing
  - native asset manifest verification
  - packed install smoke verification
  - npm publish
- publish the GitHub release using `docs/release-notes-0.9.0.md`

## Risk notes

- Primary regression surface is the new native distribution contract: hydration, fallback ordering, and cross-platform asset resolution.
- `omg explore` is intentionally constrained; release validation should keep checking that shell-only/read-only boundaries stay intact while sparkshell routing is enabled.
- `omg sparkshell --tmux-pane` is operator-critical for team debugging, so pane summarization behavior should be treated as a release-facing feature, not a hidden internal detail.
- `npm pack --dry-run` remaining green is important because packaged installs intentionally exclude staged native binaries; the release workflow must supply those binaries through GitHub Release assets instead.
- Cross-platform Windows-specific fixes landed in the release window, but this Linux smoke pass cannot validate Windows runtime behavior directly; that still depends on CI/release-matrix confirmation.

## Final local verdict

Release **0.9.0** is **ready to tag and publish** based on the successful local post-bump verification above.
