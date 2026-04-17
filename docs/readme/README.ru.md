# oh-my-gemini (OMX)

<p align="center">
  <img src="https://yeachan-heo.github.io/oh-my-gemini-website/omg-character-nobg.png" alt="oh-my-gemini character" width="280">
  <br>
  <em>Ваш codex не одинок.</em>
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-gemini)](https://www.npmjs.com/package/oh-my-gemini)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

> **[Website](https://yeachan-heo.github.io/oh-my-gemini-website/)** | **[Documentation](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** | **[CLI Reference](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** | **[Workflows](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** | **[Руководство по интеграции OpenClaw](../openclaw-integration.ru.md)** | **[GitHub](https://github.com/Yeachan-Heo/oh-my-gemini)** | **[npm](https://www.npmjs.com/package/oh-my-gemini)**

Слой мультиагентной оркестрации для [OpenAI Gemini CLI](https://github.com/openai/codex).

## Что нового в v0.9.0 — Spark Initiative

Spark Initiative — это релиз, усиливающий нативный путь исследования и инспекции в OMX.

- **Нативный harness для `omg explore`** — ускоряет и ужесточает read-only исследование репозитория через Rust-путь.
- **`omg sparkshell`** — нативная операторская поверхность для инспекции с краткими сводками длинного вывода и явным захватом tmux-pane.
- **Кроссплатформенные нативные release-артефакты** — путь hydration для `omg-explore-harness`, `omg-sparkshell` и `native-release-manifest.json` теперь входит в release pipeline.
- **Усиленный CI/CD** — добавлены явная настройка Rust toolchain в job `build`, а также `cargo fmt --check` и `cargo clippy -- -D warnings`.

См. также [release notes v0.9.0](../release-notes-0.9.0.md) и [release body](../release-body-0.9.0.md).

## Первая сессия

Внутри Gemini:

```text
$deep-interview "clarify the auth change"
$ralplan "approve the auth plan and review tradeoffs"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

Из терминала:

```bash
omg team 4:executor "parallelize a multi-module refactor"
omg team status <team-name>
omg team shutdown <team-name>
```

## Рекомендуемый рабочий процесс

1. `$deep-interview` — когда объём задачи или границы ещё не прояснены.
2. `$ralplan` — чтобы превратить уточнённый объём в согласованный план архитектуры и реализации.
3. `$team` или `$ralph` — используйте `$team` для координированного параллельного выполнения, а `$ralph` — для настойчивого цикла доведения до конца и проверки с одним ответственным.

## Базовая модель

OMX устанавливает и связывает следующие слои:

```text
User
  -> Gemini CLI
    -> GEMINI.md (мозг оркестрации)
    -> ~/.gemini/prompts/*.md (каталог промптов агентов)
    -> ~/.gemini/skills/*/SKILL.md (каталог навыков)
    -> ~/.gemini/config.toml (функции, уведомления, MCP)
    -> .omg/ (состояние выполнения, память, планы, журналы)
```

## Основные команды

```bash
omg                # Запустить Gemini (+ HUD в tmux при наличии)
omg setup          # Установить промпты/навыки/конфиг по области + .omg проекта + GEMINI.md для выбранной области
omg doctor         # Диагностика установки/среды выполнения
omg doctor --team  # Диагностика Team/swarm
omg team ...       # Запуск/статус/возобновление/завершение рабочих tmux
omg status         # Показать активные режимы
omg cancel         # Отменить активные режимы выполнения
omg reasoning <mode> # low|medium|high|xhigh
omg tmux-hook ...  # init|status|validate|test
omg hooks ...      # init|status|validate|test (рабочий процесс расширений плагинов)
omg hud ...        # --watch|--json|--preset
omg help
```

## Расширение Hooks (Дополнительная поверхность)

OMX теперь включает `omg hooks` для создания шаблонов плагинов и валидации.

- `omg tmux-hook` по-прежнему поддерживается и не изменён.
- `omg hooks` является дополнительным и не заменяет рабочие процессы tmux-hook.
- Файлы плагинов располагаются в `.omg/hooks/*.mjs`.
- Плагины по умолчанию отключены; включите с помощью `OMX_HOOK_PLUGINS=1`.

Полный рабочий процесс расширений и модель событий описаны в `docs/hooks-extension.md`.

## Флаги запуска

```bash
--yolo
--high
--xhigh
--madmax
--force
--dry-run
--verbose
--scope <user|project>  # только для setup
```

`--madmax` соответствует Gemini `--dangerously-bypass-approvals-and-sandbox`.
Используйте только в доверенных/внешних sandbox-окружениях.

### Политика workingDirectory MCP (опциональное усиление)

По умолчанию инструменты MCP state/memory/trace принимают `workingDirectory`, предоставленный вызывающей стороной.
Чтобы ограничить это, задайте список разрешённых корней:

```bash
export OMX_MCP_WORKDIR_ROOTS="/path/to/project:/path/to/another-root"
```

При установке значения `workingDirectory` за пределами этих корней будут отклонены.

## Gemini-First управление промптами

По умолчанию OMX внедряет:

```text
-c model_instructions_file="<cwd>/GEMINI.md"
```

Это объединяет `GEMINI.md` из `CODEX_HOME` с проектным `GEMINI.md` (если он есть), а затем добавляет runtime-overlay.
Расширяет поведение Gemini, но не заменяет/обходит основные системные политики Gemini.

Управление:

```bash
OMX_BYPASS_DEFAULT_SYSTEM_PROMPT=0 omg     # отключить внедрение GEMINI.md
OMX_MODEL_INSTRUCTIONS_FILE=/path/to/instructions.md omg
```

## Командный режим

Используйте командный режим для масштабной работы, которая выигрывает от параллельных исполнителей.

Жизненный цикл:

```text
start -> assign scoped lanes -> monitor -> verify terminal tasks -> shutdown
```

Операционные команды:

```bash
omg team <args>
omg team status <team-name>
omg team resume <team-name>
omg team shutdown <team-name>
```

Важное правило: не завершайте работу, пока задачи находятся в состоянии `in_progress`, если только не прерываете выполнение.

### Team shutdown policy

Use `omg team shutdown <team-name>` after the team reaches a terminal state.
Team cleanup now follows one standalone path; legacy linked-Ralph shutdown handling is no longer a separate public workflow.

Выбор Worker CLI для рабочих команды:

```bash
OMX_TEAM_WORKER_CLI=auto    # по умолчанию; использует claude, если worker --model содержит "claude"
OMX_TEAM_WORKER_CLI=codex   # принудительно Gemini CLI
OMX_TEAM_WORKER_CLI=claude  # принудительно Claude CLI
OMX_TEAM_WORKER_CLI_MAP=codex,codex,claude,claude  # CLI для каждого рабочего (длина=1 или количество рабочих)
OMX_TEAM_AUTO_INTERRUPT_RETRY=0  # опционально: отключить адаптивный откат queue->resend
```

Примечания:
- Аргументы запуска рабочих по-прежнему передаются через `OMX_TEAM_WORKER_LAUNCH_ARGS`.
- `OMX_TEAM_WORKER_CLI_MAP` переопределяет `OMX_TEAM_WORKER_CLI` для выбора на уровне рабочего.
- Отправка триггеров по умолчанию использует адаптивные повторные попытки (queue/submit, затем безопасный откат clear-line+resend при необходимости).
- В режиме Claude worker OMX запускает рабочих как обычный `claude` (без дополнительных аргументов) и игнорирует явные переопределения `--model` / `--config` / `--effort`, чтобы Claude использовал стандартный `settings.json`.

## Что записывает `omg setup`

- `.omg/setup-scope.json` (сохранённая область установки)
- Установки в зависимости от области:
  - `user`: `~/.gemini/prompts/`, `~/.gemini/skills/`, `~/.gemini/config.toml`, `~/.omg/agents/`, `~/.gemini/GEMINI.md`
  - `project`: `./.gemini/prompts/`, `./.gemini/skills/`, `./.gemini/config.toml`, `./.omg/agents/`, `./GEMINI.md`
- Поведение при запуске: если сохранённая область — `project`, `omg` автоматически использует `CODEX_HOME=./.gemini` (если `CODEX_HOME` ещё не задан).
- Инструкции запуска объединяют `~/.gemini/GEMINI.md` (или `CODEX_HOME/GEMINI.md`, если путь переопределён) с проектным `./GEMINI.md`, а затем добавляют runtime-overlay.
- Существующие файлы `GEMINI.md` никогда не перезаписываются молча: в интерактивном TTY setup спрашивает перед заменой, а в неинтерактивном режиме пропускает замену без `--force` (проверки безопасности активных сессий остаются в силе).
- Обновления `config.toml` (для обеих областей):
  - `notify = ["node", "..."]`
  - `model_reasoning_effort = "high"`
  - `developer_instructions = "..."`
  - `[features] multi_agent = true, child_agents_md = true`
  - Записи MCP-серверов (`omg_state`, `omg_memory`, `omg_code_intel`, `omg_trace`, `omg_wiki`)
  - `[tui] status_line`
- `GEMINI.md` для выбранной области
- Директории `.omg/` и конфигурация HUD

## Агенты и навыки

- Промпты: `prompts/*.md` (устанавливаются в `~/.gemini/prompts/` для `user`, `./.gemini/prompts/` для `project`)
- Навыки: `skills/*/SKILL.md` (устанавливаются в `~/.gemini/skills/` для `user`, `./.gemini/skills/` для `project`)

Примеры:
- Агенты: `architect`, `planner`, `executor`, `debugger`, `verifier`, `security-reviewer`
- Навыки: `deep-interview`, `ralplan`, `team`, `ralph`, `plan`, `cancel`

## Структура проекта

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

## Разработка

```bash
git clone https://github.com/Yeachan-Heo/oh-my-gemini.git
cd oh-my-gemini
npm install
npm run build
npm test
```

## Документация

- **[Полная документация](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** — Полное руководство
- **[Справочник CLI](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** — Все команды `omg`, флаги и инструменты
- **[Руководство по уведомлениям](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#notifications)** — Настройка Discord, Telegram, Slack и webhook
- **[Рекомендуемые рабочие процессы](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** — Проверенные в бою цепочки навыков для типичных задач
- **[Примечания к выпускам](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#release-notes)** — Что нового в каждой версии

## Примечания

- Полный журнал изменений: `CHANGELOG.md`
- Руководство по миграции (после v0.4.4 mainline): `docs/migration-mainline-post-v0.4.4.md`
- Заметки о покрытии и паритете: `COVERAGE.md`
- Рабочий процесс расширений hook: `docs/hooks-extension.md`
- Детали установки и участия: `CONTRIBUTING.md`

## Благодарности

Вдохновлено проектом [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode), адаптировано для Gemini CLI.

## Лицензия

MIT
