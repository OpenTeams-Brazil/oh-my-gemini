# Release notes — 0.13.1

## Summary

`0.13.1` is a focused hotfix release after `0.13.0` that restores detached interactive Gemini startup.

## Fixed

- **Detached tmux startup no longer drops Gemini stdin** — the detached leader wrapper now preserves stdin while backgrounding Gemini, so interactive detached launches like `omg --madmax --high` no longer exit immediately on startup. (PR [#1631](https://github.com/Yeachan-Heo/oh-my-gemini/pull/1631), issues [#1627](https://github.com/Yeachan-Heo/oh-my-gemini/issues/1627), [#1628](https://github.com/Yeachan-Heo/oh-my-gemini/issues/1628))
- **Detached-launch regression coverage** — CLI regression tests now assert that the detached leader command keeps stdin open for the Gemini child while preserving leader cleanup semantics.

## Verification evidence

Release verification evidence is recorded in `docs/qa/release-readiness-0.13.1.md`.

- `npm run build` ✅
- `npx biome lint src/cli/index.ts src/cli/__tests__/index.test.ts` ✅
- `node --test dist/cli/__tests__/index.test.js dist/cli/__tests__/launch-fallback.test.js` ✅

## Remaining risk

- This is a narrow local hotfix pass, not a full GitHub Actions matrix rerun.
- The strongest evidence is focused regression coverage plus the exact detached wrapper diff; this cut was not revalidated in a separate packaged macOS install before release.
