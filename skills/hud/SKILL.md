---
name: "hud"
description: "Show or configure the OMX HUD (two-layer statusline)"
role: "display"
scope: ".omg/**"
---

# HUD Skill

The OMX HUD uses a two-layer architecture:

1. **Layer 1 - Gemini built-in statusLine**: Real-time TUI footer showing model, git branch, and context usage. Configured via `[tui] status_line` in `~/.gemini/config.toml`. Zero code required.

2. **Layer 2 - `omg hud` CLI command**: Shows OMX-specific orchestration state (ralph, ultrawork, autopilot, team, pipeline, ecomode, turns). Reads `.omg/state/` files.

## Quick Commands

| Command | Description |
|---------|-------------|
| `omg hud` | Show current HUD (modes, turns, activity) |
| `omg hud --watch` | Live-updating display (polls every 1s) |
| `omg hud --json` | Raw state output for scripting |
| `omg hud --preset=minimal` | Minimal display |
| `omg hud --preset=focused` | Default display |
| `omg hud --preset=full` | All elements |

## Presets

### minimal
```
[OMX] ralph:3/10 | turns:42
```

### focused (default)
```
[OMX] ralph:3/10 | ultrawork | team:3 workers | turns:42 | last:5s ago
```

### full
```
[OMX] ralph:3/10 | ultrawork | autopilot:execution | team:3 workers | pipeline:exec | turns:42 | last:5s ago | total-turns:156
```

## Setup

`omg setup` automatically configures both layers:
- Adds `[tui] status_line` to `~/.gemini/config.toml` (Layer 1)
- Writes `.omg/hud-config.json` with default preset (Layer 2)
- Default preset is `focused`; if HUD/statusline changes do not appear, restart Gemini CLI once.

## Layer 1: Gemini Built-in StatusLine

Configured in `~/.gemini/config.toml`:
```toml
[tui]
status_line = ["model-with-reasoning", "git-branch", "context-remaining"]
```

Available built-in items (Gemini CLI v0.101.0+):
`model-name`, `model-with-reasoning`, `current-dir`, `project-root`, `git-branch`, `context-remaining`, `context-used`, `five-hour-limit`, `weekly-limit`, `codex-version`, `context-window-size`, `used-tokens`, `total-input-tokens`, `total-output-tokens`, `session-id`

## Layer 2: OMX Orchestration HUD

The `omg hud` command reads these state files:
- `.omg/state/ralph-state.json` - Ralph loop iteration
- `.omg/state/ultrawork-state.json` - Ultrawork mode
- `.omg/state/autopilot-state.json` - Autopilot phase
- `.omg/state/team-state.json` - Team workers
- `.omg/state/pipeline-state.json` - Pipeline stage
- `.omg/state/ecomode-state.json` - Ecomode active
- `.omg/state/hud-state.json` - Last activity (from notify hook)
- `.omg/metrics.json` - Turn counts

## Configuration

HUD config stored at `.omg/hud-config.json`:
```json
{
  "preset": "focused"
}
```

## Color Coding

- **Green**: Normal/healthy
- **Yellow**: Warning (ralph >70% of max)
- **Red**: Critical (ralph >90% of max)

## Troubleshooting

If the TUI statusline is not showing:
1. Ensure Gemini CLI v0.101.0+ is installed
2. Run `omg setup` to configure `[tui]` section
3. Restart Gemini CLI

If `omg hud` shows "No active modes":
- This is expected when no workflows are running
- Start a workflow (ralph, autopilot, etc.) and check again
