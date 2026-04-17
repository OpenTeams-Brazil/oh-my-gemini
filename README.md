# oh-my-gemini (OMX)

<p align="center">
  <img src="https://yeachan-heo.github.io/oh-my-gemini-website/omg-character-nobg.png" alt="oh-my-gemini character" width="280">
  <br>
  <em>Start Gemini stronger, then let oh-my-gemini add better prompts, workflows, and runtime help when the work grows.</em>
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-gemini)](https://www.npmjs.com/package/oh-my-gemini)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Discord](https://img.shields.io/discord/1452487457085063218?color=5865F2&logo=discord&logoColor=white&label=Discord)](https://discord.gg/PUwSMR9XNk)

**Website:** https://yeachan-heo.github.io/oh-my-gemini-website/
**Docs:** [Getting Started](./docs/getting-started.html) · [Agents](./docs/agents.html) · [Skills](./docs/skills.html) · [Integrations](./docs/integrations.html) · [Demo](./DEMO.md) · [OpenClaw guide](./docs/openclaw-integration.md)
**Community:** [Discord](https://discord.gg/PUwSMR9XNk) — shared OMX/community server for oh-my-gemini and related tooling.

OMX is a workflow layer for [OpenAI Gemini CLI](https://github.com/openai/gemini).

<table>
<tr>
<td><strong>🚨 CAUTION — RECOMMENDED DEFAULT ONLY: macOS or Linux with Gemini CLI.</strong><br><br><strong>OMX is primarily designed and actively tuned for that path.</strong><br><strong>Native Windows and Gemini App are not the default experience, may break or behave inconsistently, and currently receive less support.</strong></td>
</tr>
</table>

It keeps Gemini as the execution engine and makes it easier to:
- start a stronger Gemini session by default
- run one consistent workflow from clarification to completion
- invoke the canonical skills with `$deep-interview`, `$ralplan`, `$team`, and `$ralph`
- leverage **native subagents** for independent parallel subtasks
- utilize **better Socratic questions** via `$deep-interview` for high-leverage clarification
- keep project guidance, plans, logs, and state in `.omg/`

## Core Maintainers

| Role | Name | GitHub |
| --- | --- | --- |
| Creator & Lead | Yeachan Heo | [@Yeachan-Heo](https://github.com/Yeachan-Heo) |
| Maintainer | HaD0Yun | [@HaD0Yun](https://github.com/HaD0Yun) |

## Ambassadors

| Name | GitHub |
| --- | --- |
| Sigrid Jin | [@sigridjineth](https://github.com/sigridjineth) |

## Top Collaborators

| Name | GitHub |
| --- | --- |
| HaD0Yun | [@HaD0Yun](https://github.com/HaD0Yun) |
| Junho Yeo | [@junhoyeo](https://github.com/junhoyeo) |
| JiHongKim98 | [@JiHongKim98](https://github.com/JiHongKim98) |
| Lor | — |
| HyunjunJeon | [@HyunjunJeon](https://github.com/HyunjunJeon) |

## Recommended default flow

If you want the default OMX experience, start here:

```bash
npm install -g @openai/gemini oh-my-gemini
omg setup
omg --madmax --high
```

Then work normally inside Gemini:

```text
$deep-interview "clarify the authentication change"
$ralplan "approve the auth plan and review tradeoffs"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

That is the main path.
Start OMX strongly, clarify first when needed, approve the plan, then choose `$team` for coordinated parallel execution or `$ralph` for the persistent completion loop.

## What OMX is for

Use OMX if you already like Gemini and want a better day-to-day runtime around it:
- a standard workflow built around `$deep-interview`, `$ralplan`, `$team`, and `$ralph`
- specialist roles and supporting skills when the task needs them
- project guidance through scoped `GEMINI.md`
- durable state under `.omg/` for plans, logs, memory, and mode tracking

If you want plain Gemini with no extra workflow layer, you probably do not need OMX.

## Quick start

### Requirements

- Node.js 20+
- Gemini CLI installed: `npm install -g @openai/gemini`
- Gemini auth configured
- `tmux` on macOS/Linux if you want the recommended durable team runtime
- `psmux` on native Windows only if you intentionally want the less-supported Windows team path

### A good first session

Launch OMX the recommended way:

```bash
omg --madmax --high
```

This starts the interactive leader session directly by default.
If you explicitly want the leader session in tmux, use:

```bash
omg --tmux --madmax --high
```

Then try the canonical workflow:

```text
$deep-interview "clarify the authentication change"
$ralplan "approve the safest implementation path"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

Use `$team` when the approved plan needs coordinated parallel work, or `$ralph` when one persistent owner should keep pushing to completion.

## A simple mental model

OMX does **not** replace Gemini.

It adds a better working layer around it:
- **Gemini** does the actual agent work
- **OMX role keywords** make useful roles reusable
- **OMX skills** make common workflows reusable
- **`.omg/`** stores plans, logs, memory, and runtime state

Most users should think of OMX as **better task routing + better workflow + better runtime**, not as a command surface to operate manually all day.

## Start here if you are new

1. Run `omg setup`
2. Launch with `omg --madmax --high`
3. Use `$deep-interview "..."` when the request or boundaries are still unclear
4. Use `$ralplan "..."` to approve the plan and review tradeoffs
5. Choose `$team` for coordinated parallel execution or `$ralph` for persistent completion loops

## Recommended workflow

1. `$deep-interview` — clarify scope when the request or boundaries are still vague.
2. `$ralplan` — turn that clarified scope into an approved architecture and implementation plan.
3. `$team` or `$ralph` — use `$team` for coordinated parallel execution, or `$ralph` when you want a persistent completion loop with one owner.

## Common in-session surfaces

| Surface | Use it for |
| --- | --- |
| `$deep-interview "..."` | clarifying intent, boundaries, and non-goals |
| `$ralplan "..."` | approving the implementation plan and tradeoffs |
| `$ralph "..."` | persistent completion and verification loops |
| `$team "..."` | coordinated parallel execution when the work is big enough |
| `/skills` | browsing installed skills and supporting helpers |

## Advanced / operator surfaces

These are useful, but they are not the main onboarding path.

### Team runtime

Use the team runtime when you specifically need durable tmux/worktree coordination, not as the default way to begin using OMX.

```bash
omg team 3:executor "fix the failing tests with verification"
omg team status <team-name>
omg team resume <team-name>
omg team shutdown <team-name>
```

### Setup, doctor, and HUD

These are operator/support surfaces:
- `omg setup` installs prompts, skills, AGENTS scaffolding, `.gemini/config.toml`, and OMX-managed native Gemini hooks in `.gemini/hooks.json`
  - setup refresh preserves non-OMX hook entries in `.gemini/hooks.json` and only rewrites OMX-managed wrappers
  - `omg uninstall` removes OMX-managed wrappers from `.gemini/hooks.json` but keeps the file when user hooks remain
- `omg doctor` verifies the install when something seems wrong
- `omg hud --watch` is a monitoring/status surface, not the primary user workflow

For non-team sessions, native Gemini hooks are now the canonical lifecycle surface:
- `.gemini/hooks.json` = native Gemini hook registrations
- `.omg/hooks/*.mjs` = OMX plugin hooks
- `omg tmux-hook` / notify-hook / derived watcher = tmux + runtime fallback paths

See [Gemini native hook mapping](./docs/gemini-native-hooks.md) for the current native / fallback matrix.

### Explore and sparkshell

- `omg explore --prompt "..."` is for read-only repository lookup
- `omg sparkshell <command>` is for shell-native inspection and bounded verification
- when `.omg/wiki/` exists, `omg explore` can inject wiki-first context before falling back to broader repository search

Examples:

```bash
omg explore --prompt "find where team state is written"
omg sparkshell git status
omg sparkshell --tmux-pane %12 --tail-lines 400
```

### Wiki

- `omg wiki` is the CLI parity surface for the OMX wiki MCP server
- wiki data lives locally under `.omg/wiki/`
- the wiki is markdown-first and search-first, not vector-first

Examples:

```bash
omg wiki list --json
omg wiki query --input '{"query":"session-start lifecycle"}' --json
omg wiki lint --json
omg wiki refresh --json
```

### Platform notes for team mode

`omg team` works best on macOS/Linux with `tmux`.
Native Windows remains a secondary path, and WSL2 is generally the better choice if you want a Windows-hosted setup.
On native Windows, OMX accepts `psmux` as the tmux-compatible binary for the existing tmux-backed paths it already uses.

| Platform | Install |
| --- | --- |
| macOS | `brew install tmux` |
| Ubuntu/Debian | `sudo apt install tmux` |
| Fedora | `sudo dnf install tmux` |
| Arch | `sudo pacman -S tmux` |
| Windows | `winget install psmux` |
| Windows (WSL2) | `sudo apt install tmux` |

## Known issues

### Intel Mac: high `syspolicyd` / `trustd` CPU during startup

On some Intel Macs, OMX startup — especially with `--madmax --high` — can spike `syspolicyd` / `trustd` CPU usage while macOS Gatekeeper validates many concurrent process launches.

If this happens, try:
- `xattr -dr com.apple.quarantine $(which omg)`
- adding your terminal app to the Developer Tools allowlist in macOS Security settings
- using lower concurrency (for example, avoid `--madmax --high`)

## Documentation

- [Getting Started](./docs/getting-started.html)
- [Demo guide](./DEMO.md)
- [Wiki feature](./docs/wiki-feature.md)
- [Agent catalog](./docs/agents.html)
- [Skills reference](./docs/skills.html)
- [Gemini native hook mapping](./docs/gemini-native-hooks.md)
- [Integrations](./docs/integrations.html)
- [OpenClaw / notification gateway guide](./docs/openclaw-integration.md)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

## Languages

- [English](./README.md)
- [한국어](./docs/readme/README.ko.md)
- [日本語](./docs/readme/README.ja.md)
- [简体中文](./docs/readme/README.zh.md)
- [繁體中文](./docs/readme/README.zh-TW.md)
- [Tiếng Việt](./docs/readme/README.vi.md)
- [Español](./docs/readme/README.es.md)
- [Português](./docs/readme/README.pt.md)
- [Русский](./docs/readme/README.ru.md)
- [Türkçe](./docs/readme/README.tr.md)
- [Deutsch](./docs/readme/README.de.md)
- [Français](./docs/readme/README.fr.md)
- [Italiano](./docs/readme/README.it.md)
- [Ελληνικά](./docs/readme/README.el.md)
- [Polski](./docs/readme/README.pl.md)
- [Українська](./docs/readme/README.uk.md)

## Contributors

| Role | Name | GitHub |
| --- | --- | --- |
| Creator & Lead | Yeachan Heo | [@Yeachan-Heo](https://github.com/Yeachan-Heo) |
| Maintainer | HaD0Yun | [@HaD0Yun](https://github.com/HaD0Yun) |

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Yeachan-Heo/oh-my-gemini&type=date&legend=top-left)](https://www.star-history.com/#Yeachan-Heo/oh-my-gemini&type=date&legend=top-left)

## License

MIT
