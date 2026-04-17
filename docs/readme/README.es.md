# oh-my-gemini (OMX)

<p align="center">
  <img src="https://yeachan-heo.github.io/oh-my-gemini-website/omg-character-nobg.png" alt="oh-my-gemini character" width="280">
  <br>
  <em>Tu gemini no está solo.</em>
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-gemini)](https://www.npmjs.com/package/oh-my-gemini)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

> **[Website](https://yeachan-heo.github.io/oh-my-gemini-website/)** | **[Documentation](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** | **[CLI Reference](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** | **[Workflows](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** | **[Guía de integración de OpenClaw](../openclaw-integration.es.md)** | **[GitHub](https://github.com/Yeachan-Heo/oh-my-gemini)** | **[npm](https://www.npmjs.com/package/oh-my-gemini)**

Capa de orquestación multiagente para [OpenAI Gemini CLI](https://github.com/openai/gemini).

## Novedades en v0.9.0 — Spark Initiative

Spark Initiative es la versión que refuerza la ruta nativa de exploración e inspección en OMX.

- **Harness nativo para `omg explore`** — ejecuta exploración de repositorio en modo solo lectura con una vía Rust más rápida y más estricta.
- **`omg sparkshell`** — superficie nativa para operadores, con resúmenes de salidas largas y captura explícita de paneles tmux.
- **Assets nativos multiplataforma** — la ruta de hidratación de `omg-explore-harness`, `omg-sparkshell` y `native-release-manifest.json` ya forma parte del pipeline de release.
- **CI/CD reforzado** — se añadió configuración explícita de Rust en el job `build`, además de `cargo fmt --check` y `cargo clippy -- -D warnings`.

Consulta también las [notas de lanzamiento v0.9.0](../release-notes-0.9.0.md) y el [release body](../release-body-0.9.0.md).

## Primera sesión

Dentro de Gemini:

```text
$deep-interview "clarify the auth change"
$ralplan "approve the auth plan and review tradeoffs"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

Desde la terminal:

```bash
omg team 4:executor "parallelize a multi-module refactor"
omg team status <team-name>
omg team shutdown <team-name>
```

## Flujo recomendado

1. `$deep-interview` — cuando el alcance o los límites aún no están claros.
2. `$ralplan` — para convertir ese alcance aclarado en un plan acordado de arquitectura e implementación.
3. `$team` o `$ralph` — usa `$team` para ejecución paralela coordinada, o `$ralph` para un bucle persistente de finalización/verificación con un solo responsable.

## Modelo central

OMX instala y conecta estas capas:

```text
User
  -> Gemini CLI
    -> GEMINI.md (cerebro de orquestación)
    -> ~/.gemini/prompts/*.md (catálogo de prompts de agentes)
    -> ~/.gemini/skills/*/SKILL.md (catálogo de skills)
    -> ~/.gemini/config.toml (características, notificaciones, MCP)
    -> .omg/ (estado en ejecución, memoria, planes, registros)
```

## Comandos principales

```bash
omg                # Lanzar Gemini (+ HUD en tmux cuando está disponible)
omg setup          # Instalar prompts/skills/config por alcance + .omg del proyecto + GEMINI.md específico del alcance
omg doctor         # Diagnósticos de instalación/ejecución
omg doctor --team  # Diagnósticos de Team/swarm
omg team ...       # Iniciar/estado/reanudar/apagar workers tmux del equipo
omg status         # Mostrar modos activos
omg cancel         # Cancelar modos de ejecución activos
omg reasoning <mode> # low|medium|high|xhigh
omg tmux-hook ...  # init|status|validate|test
omg hooks ...      # init|status|validate|test (flujo de trabajo de extensión de plugins)
omg hud ...        # --watch|--json|--preset
omg help
```

## Extensión de Hooks (Superficie adicional)

OMX ahora incluye `omg hooks` para scaffolding y validación de plugins.

- `omg tmux-hook` sigue siendo compatible y no ha cambiado.
- `omg hooks` es aditivo y no reemplaza los flujos de trabajo de tmux-hook.
- Los archivos de plugins se encuentran en `.omg/hooks/*.mjs`.
- Los plugins están desactivados por defecto; actívalos con `OMG_HOOK_PLUGINS=1`.

Consulta `docs/hooks-extension.md` para el flujo de trabajo completo de extensiones y el modelo de eventos.

## Flags de inicio

```bash
--yolo
--high
--xhigh
--madmax
--force
--dry-run
--verbose
--scope <user|project>  # solo para setup
```

`--madmax` se mapea a Gemini `--dangerously-bypass-approvals-and-sandbox`.
Úsalo solo en entornos sandbox de confianza o externos.

### Política de workingDirectory MCP (endurecimiento opcional)

Por defecto, las herramientas MCP de state/memory/trace aceptan el `workingDirectory` proporcionado por el llamador.
Para restringir esto, establece una lista de raíces permitidas:

```bash
export OMG_MCP_WORKDIR_ROOTS="/path/to/project:/path/to/another-root"
```

Cuando se establece, los valores de `workingDirectory` fuera de estas raíces son rechazados.

## Control de prompts Gemini-First

Por defecto, OMX inyecta:

```text
-c model_instructions_file="<cwd>/GEMINI.md"
```

Esto combina el `GEMINI.md` de `GEMINI_HOME` con el `GEMINI.md` del proyecto (si existe) y luego añade la superposición de runtime.
Extiende el comportamiento de Gemini, pero no reemplaza ni elude las políticas centrales del sistema Gemini.

Controles:

```bash
OMG_BYPASS_DEFAULT_SYSTEM_PROMPT=0 omg     # desactivar inyección de GEMINI.md
OMG_MODEL_INSTRUCTIONS_FILE=/path/to/instructions.md omg
```

## Modo equipo

Usa el modo equipo para trabajo amplio que se beneficia de workers paralelos.

Ciclo de vida:

```text
start -> assign scoped lanes -> monitor -> verify terminal tasks -> shutdown
```

Comandos operacionales:

```bash
omg team <args>
omg team status <team-name>
omg team resume <team-name>
omg team shutdown <team-name>
```

Regla importante: no apagues mientras las tareas estén en estado `in_progress` a menos que estés abortando.

### Team shutdown policy

Use `omg team shutdown <team-name>` after the team reaches a terminal state.
Team cleanup now follows one standalone path; legacy linked-Ralph shutdown handling is no longer a separate public workflow.

Selección de Worker CLI para los workers del equipo:

```bash
OMG_TEAM_WORKER_CLI=auto    # predeterminado; usa claude cuando worker --model contiene "claude"
OMG_TEAM_WORKER_CLI=gemini   # forzar workers Gemini CLI
OMG_TEAM_WORKER_CLI=claude  # forzar workers Claude CLI
OMG_TEAM_WORKER_CLI_MAP=gemini,gemini,claude,claude  # mezcla de CLI por worker (longitud=1 o cantidad de workers)
OMG_TEAM_AUTO_INTERRUPT_RETRY=0  # opcional: desactivar fallback adaptativo queue->resend
```

Notas:
- Los argumentos de inicio de workers se comparten a través de `OMG_TEAM_WORKER_LAUNCH_ARGS`.
- `OMG_TEAM_WORKER_CLI_MAP` anula `OMG_TEAM_WORKER_CLI` para selección por worker.
- El envío de triggers usa reintentos adaptativos por defecto (queue/submit, luego fallback seguro clear-line+resend cuando es necesario).
- En modo Claude worker, OMX lanza workers como `claude` simple (sin argumentos de inicio extra) e ignora anulaciones explícitas de `--model` / `--config` / `--effort` para que Claude use el `settings.json` predeterminado.

## Qué escribe `omg setup`

- `.omg/setup-scope.json` (alcance de instalación persistido)
- Instalaciones dependientes del alcance:
  - `user`: `~/.gemini/prompts/`, `~/.gemini/skills/`, `~/.gemini/config.toml`, `~/.omg/agents/`, `~/.gemini/GEMINI.md`
  - `project`: `./.gemini/prompts/`, `./.gemini/skills/`, `./.gemini/config.toml`, `./.omg/agents/`, `./GEMINI.md`
- Comportamiento de inicio: si el alcance persistido es `project`, el lanzamiento de `omg` usa automáticamente `GEMINI_HOME=./.gemini` (a menos que `GEMINI_HOME` ya esté establecido).
- Las instrucciones de inicio combinan `~/.gemini/GEMINI.md` (o `GEMINI_HOME/GEMINI.md` si se sobrescribe) con `./GEMINI.md` del proyecto y luego añaden la superposición de runtime.
- Los archivos `GEMINI.md` existentes nunca se sobrescriben silenciosamente: en TTY interactivo se pregunta antes de reemplazar; en modo no interactivo se omite salvo que pases `--force` (las verificaciones de seguridad de sesiones activas siguen aplicándose).
- Actualizaciones de `config.toml` (para ambos alcances):
  - `notify = ["node", "..."]`
  - `model_reasoning_effort = "high"`
  - `developer_instructions = "..."`
  - `[features] multi_agent = true, child_agents_md = true`
  - Entradas de servidores MCP (`omg_state`, `omg_memory`, `omg_code_intel`, `omg_trace`, `omg_wiki`)
  - `[tui] status_line`
- `GEMINI.md` específico del alcance
- Directorios `.omg/` de ejecución y configuración de HUD

## Agentes y skills

- Prompts: `prompts/*.md` (instalados en `~/.gemini/prompts/` para `user`, `./.gemini/prompts/` para `project`)
- Skills: `skills/*/SKILL.md` (instalados en `~/.gemini/skills/` para `user`, `./.gemini/skills/` para `project`)

Ejemplos:
- Agentes: `architect`, `planner`, `executor`, `debugger`, `verifier`, `security-reviewer`
- Skills: `deep-interview`, `ralplan`, `team`, `ralph`, `plan`, `cancel`

## Estructura del proyecto

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

## Desarrollo

```bash
git clone https://github.com/Yeachan-Heo/oh-my-gemini.git
cd oh-my-gemini
npm install
npm run build
npm test
```

## Documentación

- **[Documentación completa](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** — Guía completa
- **[Referencia CLI](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** — Todos los comandos `omg`, flags y herramientas
- **[Guía de notificaciones](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#notifications)** — Configuración de Discord, Telegram, Slack y webhooks
- **[Flujos de trabajo recomendados](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** — Cadenas de skills probadas en batalla para tareas comunes
- **[Notas de versión](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#release-notes)** — Novedades en cada versión

## Notas

- Registro de cambios completo: `CHANGELOG.md`
- Guía de migración (post-v0.4.4 mainline): `docs/migration-mainline-post-v0.4.4.md`
- Notas de cobertura y paridad: `COVERAGE.md`
- Flujo de trabajo de extensión de hooks: `docs/hooks-extension.md`
- Detalles de instalación y contribución: `CONTRIBUTING.md`

## Agradecimientos

Inspirado en [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode), adaptado para Gemini CLI.

## Licencia

MIT
