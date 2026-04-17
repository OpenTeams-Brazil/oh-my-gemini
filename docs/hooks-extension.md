# Hooks Extension (Custom Plugins)

OMX supports an additive hooks extension point for user plugins under `.omg/hooks/*.mjs`.

Native Gemini hook ownership is documented separately in
[Gemini native hook mapping](./codex-native-hooks.md). In short:

- `.gemini/hooks.json` = native Gemini hook registrations installed by `omg setup`
- `.omg/hooks/*.mjs` = OMX plugin hooks dispatched by runtime/native events
- `omg tmux-hook` / notify-hook / derived watcher = tmux/runtime fallback surfaces

`omg setup` treats `.gemini/hooks.json` as a shared-ownership file: it refreshes only the OMX-managed
wrapper entries that invoke `dist/scripts/codex-native-hook.js` and preserves user hook entries in the
same file. `omg uninstall` removes only those OMX-managed wrappers and leaves `.gemini/hooks.json` in
place when user hooks remain.

> Compatibility guarantee: `omg tmux-hook` remains fully supported and unchanged.
> The new `omg hooks` command group is additive and does **not** replace tmux-hook workflows.

## Quick start

```bash
omg hooks init
omg hooks status
omg hooks validate
omg hooks test
```

This creates a scaffold plugin at:

- `.omg/hooks/sample-plugin.mjs`

## Enablement model

Plugins are **enabled by default**.

Disable plugin dispatch explicitly:

```bash
export OMX_HOOK_PLUGINS=0
```

Optional timeout tuning (default: 1500ms):

```bash
export OMX_HOOK_PLUGIN_TIMEOUT_MS=1500
```

## Native event pipeline (v1)

Native/derived plugin events come from two places:

1. Existing lifecycle/notify paths
2. Native Gemini hook entrypoint dispatch (`dist/scripts/codex-native-hook.js`)

Current event vocabulary exposed to OMX plugins:

- `session-start`
- `keyword-detector`
- `pre-tool-use`
- `post-tool-use`
- `stop`
- `session-end`
- `turn-complete`
- `session-idle`

OMX keeps this existing event vocabulary rather than exposing raw Gemini hook names directly.
That lets native Gemini hooks and fallback/derived paths feed one shared plugin/runtime surface.

For clawhip-oriented operational routing, see [Clawhip Event Contract](./clawhip-event-contract.md).

Envelope fields include:

- `schema_version: "1"`
- `event`
- `timestamp`
- `source` (`native` or `derived`)
- `context`
- optional IDs: `session_id`, `thread_id`, `turn_id`, `mode`

## Derived signals (opt-in)

Best-effort derived events are gated and disabled by default.

```bash
export OMX_HOOK_DERIVED_SIGNALS=1
```

Derived signals include:

- `needs-input`
- `pre-tool-use`
- `post-tool-use`

Derived events are labeled with:

- `source: "derived"`
- `confidence`
- parser-specific context hints

## Team-safety behavior

In team-worker sessions (`OMX_TEAM_WORKER` set), plugin side effects are skipped by default.
This keeps the lead session as the canonical side-effect emitter and avoids duplicate sends.

## Plugin contract

Each plugin must export:

```js
export async function onHookEvent(event, sdk) {
  // handle event
}
```

SDK surface includes:

- `sdk.tmux.sendKeys(...)`
- `sdk.log.info|warn|error(...)`
- `sdk.state.read|write|delete|all(...)` (plugin namespace scoped)
- `sdk.omg.session.read()`
- `sdk.omg.hud.read()`
- `sdk.omg.notifyFallback.read()`
- `sdk.omg.updateCheck.read()`

`sdk.omg` is intentionally narrow and read-only in pass one. These helpers read the
repo-root `.omg/state/*.json` runtime files for the current workspace.

Compatibility notes:

- `omg tmux-hook` remains a CLI/runtime workflow, not `sdk.omg.tmuxHook.*`
- pass one does not add `sdk.omg.tmuxHook.*`; tmux plugin behavior stays on `sdk.tmux.sendKeys(...)`
- pass one does not add generic `sdk.omg.readJson(...)`, `sdk.omg.list()`, or `sdk.omg.exists()`
- pass one does not add `sdk.pluginState`; keep using `sdk.state`

## Logs

Plugin dispatch and plugin logs are written to:

- `.omg/logs/hooks-YYYY-MM-DD.jsonl`
