# oh-my-gemini (OMX)

<p align="center">
  <img src="https://yeachan-heo.github.io/oh-my-gemini-website/omg-character-nobg.png" alt="oh-my-gemini character" width="280">
  <br>
  <em>Dein Gemini ist nicht allein.</em>
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-gemini)](https://www.npmjs.com/package/oh-my-gemini)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

> **[Website](https://yeachan-heo.github.io/oh-my-gemini-website/)** | **[Documentation](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** | **[CLI Reference](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** | **[Workflows](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** | **[OpenClaw-Integrationsleitfaden](../openclaw-integration.de.md)** | **[GitHub](https://github.com/Yeachan-Heo/oh-my-gemini)** | **[npm](https://www.npmjs.com/package/oh-my-gemini)**

Multi-Agenten-Orchestrierungsschicht für [OpenAI Gemini CLI](https://github.com/openai/codex).

## Neu in v0.9.0 — Spark Initiative

Spark Initiative ist das Release, das den nativen Pfad für Exploration und Inspektion in OMX stärkt.

- **Nativer Harness für `omg explore`** — führt Read-only-Repository-Exploration über einen schnelleren und strengeren Rust-Pfad aus.
- **`omg sparkshell`** — native Operator-Oberfläche für Inspektion mit Zusammenfassungen langer Ausgaben und expliziter tmux-Pane-Erfassung.
- **Plattformübergreifende native Release-Artefakte** — der Hydration-Pfad für `omg-explore-harness`, `omg-sparkshell` und `native-release-manifest.json` ist jetzt Teil der Release-Pipeline.
- **Gehärtetes CI/CD** — ergänzt ein explizites Rust-Toolchain-Setup im `build`-Job sowie `cargo fmt --check` und `cargo clippy -- -D warnings`.

Siehe auch die [Release Notes zu v0.9.0](../release-notes-0.9.0.md) und den [Release-Text](../release-body-0.9.0.md).

## Erste Sitzung

Innerhalb von Gemini:

```text
$deep-interview "clarify the auth change"
$ralplan "approve the auth plan and review tradeoffs"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

Vom Terminal:

```bash
omg team 4:executor "parallelize a multi-module refactor"
omg team status <team-name>
omg team shutdown <team-name>
```

## Empfohlener Workflow

1. `$deep-interview` — wenn Scope oder Grenzen noch unklar sind.
2. `$ralplan` — um daraus einen abgestimmten Architektur- und Umsetzungsplan zu machen.
3. `$team` oder `$ralph` — nutzen Sie `$team` für koordinierte parallele Ausführung oder `$ralph` für einen hartnäckigen Abschluss-/Verifikations-Loop mit einer verantwortlichen Instanz.

## Kernmodell

OMX installiert und verbindet diese Schichten:

```text
User
  -> Gemini CLI
    -> GEMINI.md (Orchestrierungs-Gehirn)
    -> ~/.gemini/prompts/*.md (Agenten-Prompt-Katalog)
    -> ~/.gemini/skills/*/SKILL.md (Skill-Katalog)
    -> ~/.gemini/config.toml (Features, Benachrichtigungen, MCP)
    -> .omg/ (Laufzeitzustand, Speicher, Pläne, Protokolle)
```

## Hauptbefehle

```bash
omg                # Gemini starten (+ HUD in tmux wenn verfügbar)
omg setup          # Prompts/Skills/Config nach Bereich installieren + Projekt-.omg + bereichsspezifische GEMINI.md
omg doctor         # Installations-/Laufzeitdiagnose
omg doctor --team  # Team/Swarm-Diagnose
omg team ...       # tmux-Team-Worker starten/Status/fortsetzen/herunterfahren
omg status         # Aktive Modi anzeigen
omg cancel         # Aktive Ausführungsmodi abbrechen
omg reasoning <mode> # low|medium|high|xhigh
omg tmux-hook ...  # init|status|validate|test
omg hooks ...      # init|status|validate|test (Plugin-Erweiterungs-Workflow)
omg hud ...        # --watch|--json|--preset
omg help
```

## Hooks-Erweiterung (Additive Oberfläche)

OMX enthält jetzt `omg hooks` für Plugin-Gerüstbau und -Validierung.

- `omg tmux-hook` wird weiterhin unterstützt und ist unverändert.
- `omg hooks` ist additiv und ersetzt keine tmux-hook-Workflows.
- Plugin-Dateien befinden sich unter `.omg/hooks/*.mjs`.
- Plugins sind standardmäßig deaktiviert; aktivieren mit `OMX_HOOK_PLUGINS=1`.

Siehe `docs/hooks-extension.md` für den vollständigen Erweiterungs-Workflow und das Ereignismodell.

## Start-Flags

```bash
--yolo
--high
--xhigh
--madmax
--force
--dry-run
--verbose
--scope <user|project>  # nur bei setup
```

`--madmax` entspricht Gemini `--dangerously-bypass-approvals-and-sandbox`.
Nur in vertrauenswürdigen/externen Sandbox-Umgebungen verwenden.

### MCP workingDirectory-Richtlinie (optionale Härtung)

Standardmäßig akzeptieren MCP-Zustand/Speicher/Trace-Tools das vom Aufrufer bereitgestellte `workingDirectory`.
Um dies einzuschränken, setzen Sie eine Erlaubnisliste von Wurzelverzeichnissen:

```bash
export OMX_MCP_WORKDIR_ROOTS="/path/to/project:/path/to/another-root"
```

Wenn gesetzt, werden `workingDirectory`-Werte außerhalb dieser Wurzeln abgelehnt.

## Gemini-First Prompt-Steuerung

Standardmäßig injiziert OMX:

```text
-c model_instructions_file="<cwd>/GEMINI.md"
```

Dies kombiniert `GEMINI.md` aus `CODEX_HOME` mit dem Projekt-`GEMINI.md` (falls vorhanden) und legt dann die Laufzeit-Überlagerung darüber.
Es erweitert das Gemini-Verhalten, ersetzt/umgeht aber nicht die Gemini-Kernsystemrichtlinien.

Steuerung:

```bash
OMX_BYPASS_DEFAULT_SYSTEM_PROMPT=0 omg     # GEMINI.md-Injektion deaktivieren
OMX_MODEL_INSTRUCTIONS_FILE=/path/to/instructions.md omg
```

## Team-Modus

Verwenden Sie den Team-Modus für umfangreiche Arbeiten, die von parallelen Workern profitieren.

Lebenszyklus:

```text
start -> assign scoped lanes -> monitor -> verify terminal tasks -> shutdown
```

Operationelle Befehle:

```bash
omg team <args>
omg team status <team-name>
omg team resume <team-name>
omg team shutdown <team-name>
```

Wichtige Regel: Fahren Sie nicht herunter, während Aufgaben noch `in_progress` sind, es sei denn, Sie brechen ab.

### Team shutdown policy

Use `omg team shutdown <team-name>` after the team reaches a terminal state.
Team cleanup now follows one standalone path; legacy linked-Ralph shutdown handling is no longer a separate public workflow.

Worker-CLI-Auswahl für Team-Worker:

```bash
OMX_TEAM_WORKER_CLI=auto    # Standard; verwendet claude wenn Worker --model "claude" enthält
OMX_TEAM_WORKER_CLI=codex   # Gemini-CLI-Worker erzwingen
OMX_TEAM_WORKER_CLI=claude  # Claude-CLI-Worker erzwingen
OMX_TEAM_WORKER_CLI_MAP=codex,codex,claude,claude  # CLI-Mix pro Worker (Länge=1 oder Worker-Anzahl)
OMX_TEAM_AUTO_INTERRUPT_RETRY=0  # optional: adaptiven Queue->Resend-Fallback deaktivieren
```

Hinweise:
- Worker-Startargumente werden weiterhin über `OMX_TEAM_WORKER_LAUNCH_ARGS` geteilt.
- `OMX_TEAM_WORKER_CLI_MAP` überschreibt `OMX_TEAM_WORKER_CLI` für Worker-spezifische Auswahl.
- Trigger-Übermittlung verwendet standardmäßig adaptive Wiederholungsversuche (Queue/Submit, dann sicherer Clear-Line+Resend-Fallback bei Bedarf).
- Im Claude-Worker-Modus startet OMX Worker als einfaches `claude` (keine zusätzlichen Startargumente) und ignoriert explizite `--model` / `--config` / `--effort`-Überschreibungen, sodass Claude die Standard-`settings.json` verwendet.

## Was `omg setup` schreibt

- `.omg/setup-scope.json` (persistierter Setup-Bereich)
- Bereichsabhängige Installationen:
  - `user`: `~/.gemini/prompts/`, `~/.gemini/skills/`, `~/.gemini/config.toml`, `~/.omg/agents/`, `~/.gemini/GEMINI.md`
  - `project`: `./.gemini/prompts/`, `./.gemini/skills/`, `./.gemini/config.toml`, `./.omg/agents/`, `./GEMINI.md`
- Startverhalten: Wenn der persistierte Bereich `project` ist, verwendet `omg` automatisch `CODEX_HOME=./.gemini` (sofern `CODEX_HOME` nicht bereits gesetzt ist).
- Startanweisungen kombinieren `~/.gemini/GEMINI.md` (bzw. `CODEX_HOME/GEMINI.md`, wenn überschrieben) mit dem Projekt-`./GEMINI.md` und hängen anschließend die Runtime-Überlagerung an.
- Vorhandene `GEMINI.md`-Dateien werden nie stillschweigend überschrieben: Interaktive TTY-Läufe fragen vor dem Ersetzen, nicht-interaktive Läufe überspringen das Ersetzen ohne `--force` (aktive Sitzungs-Sicherheitsprüfungen gelten weiterhin).
- `config.toml`-Aktualisierungen (für beide Bereiche):
  - `notify = ["node", "..."]`
  - `model_reasoning_effort = "high"`
  - `developer_instructions = "..."`
  - `[features] multi_agent = true, child_agents_md = true`
  - MCP-Server-Einträge (`omg_state`, `omg_memory`, `omg_code_intel`, `omg_trace`, `omg_wiki`)
  - `[tui] status_line`
- Bereichsspezifische `GEMINI.md`
- `.omg/`-Laufzeitverzeichnisse und HUD-Konfiguration

## Agenten und Skills

- Prompts: `prompts/*.md` (installiert nach `~/.gemini/prompts/` für `user`, `./.gemini/prompts/` für `project`)
- Skills: `skills/*/SKILL.md` (installiert nach `~/.gemini/skills/` für `user`, `./.gemini/skills/` für `project`)

Beispiele:
- Agenten: `architect`, `planner`, `executor`, `debugger`, `verifier`, `security-reviewer`
- Skills: `deep-interview`, `ralplan`, `team`, `ralph`, `plan`, `cancel`

## Projektstruktur

```text
oh-my-gemini/
  bin/omg.js
  src/
    cli/
    team/
    mcp/
    hooks/
    hud/
    config/
    modes/
    notifications/
    verification/
  prompts/
  skills/
  templates/
  scripts/
```

## Entwicklung

```bash
git clone https://github.com/Yeachan-Heo/oh-my-gemini.git
cd oh-my-gemini
npm install
npm run build
npm test
```

## Dokumentation

- **[Vollständige Dokumentation](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** — Kompletter Leitfaden
- **[CLI-Referenz](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** — Alle `omg`-Befehle, Flags und Tools
- **[Benachrichtigungs-Leitfaden](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#notifications)** — Discord, Telegram, Slack und Webhook-Einrichtung
- **[Empfohlene Workflows](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** — Praxiserprobte Skill-Ketten für häufige Aufgaben
- **[Versionshinweise](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#release-notes)** — Neuheiten in jeder Version

## Hinweise

- Vollständiges Änderungsprotokoll: `CHANGELOG.md`
- Migrationsleitfaden (nach v0.4.4 mainline): `docs/migration-mainline-post-v0.4.4.md`
- Abdeckungs- und Paritätsnotizen: `COVERAGE.md`
- Hook-Erweiterungs-Workflow: `docs/hooks-extension.md`
- Setup- und Beitragsdetails: `CONTRIBUTING.md`

## Danksagungen

Inspiriert von [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode), angepasst für Gemini CLI.

## Lizenz

MIT
