# oh-my-gemini (OMX)

<p align="center">
  <img src="https://yeachan-heo.github.io/oh-my-gemini-website/omg-character-nobg.png" alt="oh-my-gemini character" width="280">
  <br>
  <em>你的 Gemini，從不孤行。</em>
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-gemini)](https://www.npmjs.com/package/oh-my-gemini)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![Discord](https://img.shields.io/discord/1452487457085063218?color=5865F2&logo=discord&logoColor=white&label=Discord)](https://discord.gg/PUwSMR9XNk)

> **[官方網站](https://yeachan-heo.github.io/oh-my-gemini-website/)** | **[說明文件](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** | **[CLI 參考手冊](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** | **[工作流程](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** | **[OpenClaw 整合指南](../openclaw-integration.zh-TW.md)** | **[GitHub](https://github.com/Yeachan-Heo/oh-my-gemini)** | **[npm](https://www.npmjs.com/package/oh-my-gemini)**

[OpenAI Gemini CLI](https://github.com/openai/codex) 的多智能體編排層。

## v0.9.0 新功能 — Spark Initiative

Spark Initiative 是一個強化 OMX 原生探索與檢查路徑的版本發布。

- **`omg explore` 原生 harness** —— 以 Rust 原生 harness 更快且更嚴格地執行唯讀儲存庫探索。
- **`omg sparkshell`** —— 面向操作員的原生檢查介面，支援長輸出摘要與 tmux pane 擷取。
- **跨平台原生釋出資產** —— `omg-explore-harness`、`omg-sparkshell` 與 `native-release-manifest.json` 的 hydration 路徑已納入釋出流程。
- **強化的 CI/CD** —— 在 `build` job 中加入明確的 Rust toolchain 設定，並新增 `cargo fmt --check` 與 `cargo clippy -- -D warnings`。

詳細內容請參閱 [v0.9.0 版本說明](../release-notes-0.9.0.md) 與 [釋出正文](../release-body-0.9.0.md)。

## 首次會話

在 Gemini 內部：

```text
$deep-interview "clarify the auth change"
$ralplan "approve the auth plan and review tradeoffs"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

從終端機：

```bash
omg team 4:executor "parallelize a multi-module refactor"
omg team status <team-name>
omg team shutdown <team-name>
```

## 建議工作流程

1. `$deep-interview` — 當範圍或邊界仍不清楚時，先用它釐清需求。
2. `$ralplan` — 把釐清後的範圍整理成可核准的架構與實作計畫。
3. `$team` 或 `$ralph` — 需要協調平行執行時用 `$team`，需要單一負責人持續推進到完成並驗證時用 `$ralph`。

## 核心模型

OMX 安裝並串接以下各層：

```text
使用者
  -> Gemini CLI
    -> GEMINI.md（編排大腦）
    -> ~/.gemini/prompts/*.md（代理提示詞目錄）
    -> ~/.gemini/skills/*/SKILL.md（技能目錄）
    -> ~/.gemini/config.toml（功能、通知、MCP）
    -> .omg/（執行期狀態、記憶、計畫、日誌）
```

## 主要指令

```bash
omg                  # 啟動 Gemini（可用時在 tmux 中附帶 HUD）
omg setup            # 依範圍安裝提示詞/技能/設定 + 專案 .omg + 範圍專屬 GEMINI.md
omg doctor           # 安裝/執行期診斷
omg doctor --team    # 團隊/群集診斷
omg ask ...          # 詢問本地供應商顧問（claude|gemini），結果寫入 .omg/artifacts/*
omg team ...         # 啟動/狀態/恢復/關閉團隊工作進程（預設為互動式 tmux）
omg status           # 顯示目前活動模式
omg cancel           # 取消活動中的執行模式
omg reasoning <mode> # low|medium|high|xhigh
omg tmux-hook ...    # init|status|validate|test
omg hooks ...        # init|status|validate|test（插件擴充工作流程）
omg hud ...          # --watch|--json|--preset
omg help
```

Ask 指令範例：

```bash
omg ask claude "review this diff"
omg ask gemini "brainstorm alternatives"
omg ask claude --agent-prompt executor "implement feature X with tests"
omg ask gemini --agent-prompt=planner --prompt "draft a rollout plan"
# 底層供應商 CLI 說明中的旗標：
# claude -p|--print "<prompt>"
# gemini -p|--prompt "<prompt>"
```

非 tmux 團隊啟動（進階）：

```bash
OMX_TEAM_WORKER_LAUNCH_MODE=prompt omg team 2:executor "task"
```

## Hooks 擴充（附加介面）

OMX 現已包含 `omg hooks`，用於插件鷹架建立與驗證。

- `omg tmux-hook` 持續受支援，行為不變。
- `omg hooks` 屬於附加功能，不會取代 tmux-hook 工作流程。
- 插件檔案位於 `.omg/hooks/*.mjs`。
- 插件預設關閉；使用 `OMX_HOOK_PLUGINS=1` 啟用。

完整的擴充工作流程與事件模型，請參閱 `docs/hooks-extension.md`。

## 啟動旗標

```bash
--yolo
--high
--xhigh
--madmax
--force
--dry-run
--verbose
--scope <user|project>  # 僅用於 setup
```

`--madmax` 對應 Gemini 的 `--dangerously-bypass-approvals-and-sandbox`。
僅在信任環境或外部沙箱環境中使用。

### MCP workingDirectory 策略（選用強化）

預設情況下，MCP 狀態/記憶/追蹤工具接受呼叫方提供的 `workingDirectory`。
若要限制此行為，請設定允許的根目錄清單：

```bash
export OMX_MCP_WORKDIR_ROOTS="/path/to/project:/path/to/another-root"
```

設定後，超出這些根目錄的 `workingDirectory` 值將被拒絕。

## Gemini 優先的提示詞控制

預設情況下，OMX 注入：

```text
-c model_instructions_file="<cwd>/GEMINI.md"
```

這會將 `CODEX_HOME` 中的 `GEMINI.md` 與專案的 `GEMINI.md`（若存在）合併，然後再附加執行期 overlay。
此舉擴充了 Gemini 的行為，但不會取代或繞過 Gemini 核心系統策略。

控制方式：

```bash
OMX_BYPASS_DEFAULT_SYSTEM_PROMPT=0 omg     # 停用 GEMINI.md 注入
OMX_MODEL_INSTRUCTIONS_FILE=/path/to/instructions.md omg
```

## 團隊模式

對於能從平行工作進程獲益的大規模工作，請使用團隊模式。

生命週期：

```text
啟動 -> 分配有界通道 -> 監控 -> 驗證終端任務 -> 關閉
```

作業指令：

```bash
omg team <args>
omg team status <team-name>
omg team resume <team-name>
omg team shutdown <team-name>
```

重要規則：除非要中止，否則請勿在任務仍處於 `in_progress` 狀態時關閉。

### Ralph 後續流程

若協調式 Team 執行之後仍需要單一負責人的持續修正 / 驗證迴圈，
請在 Team 工作完成後另外執行 `omg ralph ...`。舊的 linked-Ralph 團隊路徑已不再是建議或支援的標準路徑。

團隊工作進程的 Worker CLI 選擇：

```bash
OMX_TEAM_WORKER_CLI=auto    # 預設；當 worker --model 包含 "claude" 時使用 claude
OMX_TEAM_WORKER_CLI=codex   # 強制使用 Gemini CLI 工作進程
OMX_TEAM_WORKER_CLI=claude  # 強制使用 Claude CLI 工作進程
OMX_TEAM_WORKER_CLI_MAP=codex,codex,claude,claude  # 每個工作進程的 CLI 混合（長度為 1 或等於工作進程數量）
OMX_TEAM_AUTO_INTERRUPT_RETRY=0  # 選用：停用自適應 queue->resend 回退機制
```

注意事項：
- 工作進程啟動參數仍透過 `OMX_TEAM_WORKER_LAUNCH_ARGS` 共享。
- `OMX_TEAM_WORKER_CLI_MAP` 會覆寫 `OMX_TEAM_WORKER_CLI`，以實現每個工作進程的個別選擇。
- 觸發提交預設使用自適應重試（queue/submit，必要時採用安全的清除行 + 重傳回退）。
- 在 Claude 工作進程模式下，OMX 以純 `claude` 啟動工作進程（無額外啟動參數），並忽略明確的 `--model` / `--config` / `--effort` 覆寫，讓 Claude 使用預設的 `settings.json`。

## `omg setup` 寫入的內容

- `.omg/setup-scope.json`（持久化的設定範圍）
- 依範圍的安裝內容：
  - `user`：`~/.gemini/prompts/`、`~/.gemini/skills/`、`~/.gemini/config.toml`、`~/.omg/agents/`、`~/.gemini/GEMINI.md`
  - `project`：`./.gemini/prompts/`、`./.gemini/skills/`、`./.gemini/config.toml`、`./.omg/agents/`、`./GEMINI.md`
- 啟動行為：若持久化範圍為 `project`，`omg` 啟動時自動使用 `CODEX_HOME=./.gemini`（除非已設定 `CODEX_HOME`）。
- 啟動指令會合併 `~/.gemini/GEMINI.md`（或覆寫後的 `CODEX_HOME/GEMINI.md`）與專案 `./GEMINI.md`，然後再附加執行期 overlay。
- 現有的 `GEMINI.md` 檔案絕不會被靜默覆寫：互動式 TTY 執行時 setup 會先詢問；非互動執行時若沒有 `--force` 就會跳過替換（仍適用活動會話安全檢查）。
- `config.toml` 更新（兩種範圍均適用）：
  - `notify = ["node", "..."]`
  - `model_reasoning_effort = "high"`
  - `developer_instructions = "..."`
  - `[features] multi_agent = true, child_agents_md = true`
  - MCP 伺服器項目（`omg_state`、`omg_memory`、`omg_code_intel`、`omg_trace`）
  - `[tui] status_line`
- 範圍專屬 `GEMINI.md`
- `.omg/` 執行期目錄與 HUD 設定

## 代理與技能

- 提示詞：`prompts/*.md`（`user` 安裝至 `~/.gemini/prompts/`，`project` 安裝至 `./.gemini/prompts/`）
- 技能：`skills/*/SKILL.md`（`user` 安裝至 `~/.gemini/skills/`，`project` 安裝至 `./.gemini/skills/`）

範例：
- 代理：`architect`、`planner`、`executor`、`debugger`、`verifier`、`security-reviewer`
- 技能：`deep-interview`、`ralplan`、`team`、`ralph`、`plan`、`cancel`

### 視覺品管迴圈（`$visual-verdict`）

當任務需要視覺保真度驗證（參考圖片 + 生成截圖）時，請使用 `$visual-verdict`。

- 回傳結構化 JSON：`score`、`verdict`、`category_match`、`differences[]`、`suggestions[]`、`reasoning`
- 建議通過門檻：**90 分以上**
- 對於視覺任務，在每次下一輪編輯前先執行 `$visual-verdict`
- 使用像素差異 / pixelmatch 疊加圖作為**輔助除錯工具**（而非主要通過/失敗判斷依據）

## 專案結構

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

## 開發

```bash
git clone https://github.com/Yeachan-Heo/oh-my-gemini.git
cd oh-my-gemini
npm install
npm run lint
npm run build
npm test
```

## 說明文件

- **[完整說明文件](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** — 完整指南
- **[CLI 參考手冊](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** — 所有 `omg` 指令、旗標與工具
- **[通知設定指南](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#notifications)** — Discord、Telegram、Slack 及 Webhook 設定
- **[推薦工作流程](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** — 實戰驗證的技能鏈，適用常見任務
- **[版本發行說明](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#release-notes)** — 每個版本的新功能

## 附註

- 完整變更日誌：`CHANGELOG.md`
- 遷移指南（v0.4.4 後的主線版本）：`docs/migration-mainline-post-v0.4.4.md`
- 覆蓋率與同等性說明：`COVERAGE.md`
- Hook 擴充工作流程：`docs/hooks-extension.md`
- 設定與貢獻詳情：`CONTRIBUTING.md`

## 致謝

靈感來自 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)，為 Gemini CLI 量身改編。

## 授權條款

MIT
