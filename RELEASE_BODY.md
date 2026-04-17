# oh-my-gemini v0.13.1

## Summary

`0.13.1` is a focused hotfix release after `v0.13.0` that ships the detached tmux stdin-preservation fix for Gemini startup. It supersedes the `0.13.0` detached-launch regression where interactive detached starts could immediately exit because the Gemini child lost stdin when the leader shell backgrounded it.

## Fixed

- **Detached tmux startup regression** — the detached leader wrapper now preserves stdin for the Gemini child during background launch, restoring successful startup for real interactive paths like `omg --madmax --high`. (PR [#1631](https://github.com/Yeachan-Heo/oh-my-gemini/pull/1631), issues [#1627](https://github.com/Yeachan-Heo/oh-my-gemini/issues/1627), [#1628](https://github.com/Yeachan-Heo/oh-my-gemini/issues/1628))
- **Regression coverage** — release scope includes focused CLI regression coverage proving the detached leader command keeps stdin open for the Gemini child while preserving detached cleanup behavior.

## Verification

- `npm run build`
- `npx biome lint src/cli/index.ts src/cli/__tests__/index.test.ts`
- `node --test dist/cli/__tests__/index.test.js dist/cli/__tests__/launch-fallback.test.js`

## Contributors

Thanks to [@Arsture](https://github.com/Arsture) for the sharp detached-launch diagnosis and reproduction detail that made the hotfix path obvious.

**Full Changelog**: [`v0.13.0...v0.13.1`](https://github.com/Yeachan-Heo/oh-my-gemini/compare/v0.13.0...v0.13.1)
