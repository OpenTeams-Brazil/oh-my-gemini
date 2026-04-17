# oh-my-gemini Feature Coverage Matrix

**Target: >=90% parity with oh-my-claudecode (excluding MCP tools)**
**Last Updated:** 2026-02-22

## Coverage Summary

| Category | OMG Features | OMX Implemented | Coverage |
|----------|-------------|-----------------|----------|
| Agent Definitions | 29 | 29 | 100% |
| Skills/Commands | 30 | 30 | 100% |
| GEMINI.md (CLAUDE.md equiv) | 1 | 1 | 100% |
| CLI (setup/doctor/help/etc) | 7 | 7 | 100% |
| Config Generation | 1 | 1 | 100% |
| Mode State Management | 9 modes | 9 modes | 100% |
| Project Memory | 4 tools | 4 tools | 100% |
| Notepad | 6 tools | 6 tools | 100% |
| Code Intelligence (LSP) | 12 tools | 7 tools (pragmatic) | ~58% |
| AST Pattern Matching | 2 tools | 2 tools | 100% |
| Trace | 2 tools | 2 tools | 100% |
| Verification Protocol | 1 | 1 | 100% |
| Notification System | 3 channels | 3 channels | 100% |
| Keyword Detection | 16 keywords | 16 keywords | 100% |
| Hook Pipeline | 9 events | 6 full + 3 partial | ~89% |
| HUD/Status Line | 1 | 1 (built-in + CLI) | 100% |
| Subagent Tracking | 1 | partial (via multi_agent) | 50% |
| Python REPL | 1 tool | 0 tools | 0% |
| **TOTAL** | | | **~95%** |

## Detailed Feature Mapping

### Agent Definitions / Role Catalog (29/29 = 100%)

| OMG Agent | OMX Status | Mechanism |
|-----------|-----------|-----------|
| analyst | DONE | prompts/analyst.md |
| api-reviewer | DONE | prompts/api-reviewer.md |
| architect | DONE | prompts/architect.md |
| build-fixer | DONE | prompts/build-fixer.md |
| code-reviewer | DONE | prompts/code-reviewer.md |
| code-simplifier | DONE | prompts/code-simplifier.md |
| critic | DONE | prompts/critic.md |
| debugger | DONE | prompts/debugger.md |
| dependency-expert | DONE | prompts/dependency-expert.md |
| designer | DONE | prompts/designer.md |
| executor | DONE | prompts/executor.md |
| explore | DONE | prompts/explore.md |
| git-master | DONE | prompts/git-master.md |
| information-architect | DONE | prompts/information-architect.md |
| performance-reviewer | DONE | prompts/performance-reviewer.md |
| planner | DONE | prompts/planner.md |
| product-analyst | DONE | prompts/product-analyst.md |
| product-manager | DONE | prompts/product-manager.md |
| qa-tester | DONE | prompts/qa-tester.md |
| quality-reviewer | DONE | prompts/quality-reviewer.md |
| quality-strategist | DONE | prompts/quality-strategist.md |
| researcher | DONE | prompts/researcher.md |
| ~~deep-executor~~ | REMOVED (v0.5.0) | Routes to executor |
| ~~scientist~~ | REMOVED (v0.5.0) | — |
| security-reviewer | DONE | prompts/security-reviewer.md |
| style-reviewer | DONE | prompts/style-reviewer.md |
| test-engineer | DONE | prompts/test-engineer.md |
| ux-researcher | DONE | prompts/ux-researcher.md |
| verifier | DONE | prompts/verifier.md |
| vision | DONE | prompts/vision.md |
| writer | DONE | prompts/writer.md |

### Skills (30/30 = 100%)

| OMG Skill | OMX Status | Mechanism |
|-----------|-----------|-----------|
| autopilot | DONE | ~/.gemini/skills/autopilot/SKILL.md |
| ralph | DONE | ~/.gemini/skills/ralph/SKILL.md |
| ultrawork (`ulw` alias) | DONE | ~/.gemini/skills/ultrawork/SKILL.md |
| ecomode | DONE | ~/.gemini/skills/ecomode/SKILL.md |
| plan | DONE | ~/.gemini/skills/plan/SKILL.md |
| ralplan | DONE | ~/.gemini/skills/ralplan/SKILL.md |
| team | DONE | ~/.gemini/skills/team/SKILL.md |
| ~~pipeline~~ | REMOVED (v0.5.0) | — |
| ultraqa | DONE | ~/.gemini/skills/ultraqa/SKILL.md |
| ~~ultrapilot~~ | REMOVED (v0.5.0) | — |
| ~~research~~ | REMOVED (post-v0.5.0) | — |
| code-review | DONE | ~/.gemini/skills/code-review/SKILL.md |
| security-review | DONE | ~/.gemini/skills/security-review/SKILL.md |
| tdd | DONE | ~/.gemini/skills/tdd/SKILL.md |
| deepinit | DONE (lightweight CLI successor) | `omg agents-init [path]` (`omg deepinit [path]` alias) |
| deepsearch | DONE | ~/.gemini/skills/deepsearch/SKILL.md |
| analyze | DONE | ~/.gemini/skills/analyze/SKILL.md |
| build-fix | DONE | ~/.gemini/skills/build-fix/SKILL.md |
| cancel | DONE | ~/.gemini/skills/cancel/SKILL.md |
| doctor | DONE | ~/.gemini/skills/doctor/SKILL.md |
| help | DONE | ~/.gemini/skills/help/SKILL.md |
| hud | DONE | ~/.gemini/skills/hud/SKILL.md |
| ~~learner~~ | REMOVED (v0.5.0) | — |
| note | DONE | ~/.gemini/skills/note/SKILL.md |
| trace | DONE | ~/.gemini/skills/trace/SKILL.md |
| skill | DONE | ~/.gemini/skills/skill/SKILL.md |
| frontend-ui-ux | DONE | ~/.gemini/skills/frontend-ui-ux/SKILL.md |
| git-master | DONE | ~/.gemini/skills/git-master/SKILL.md |
| review | DONE | ~/.gemini/skills/review/SKILL.md |
| ralph-init | DONE | ~/.gemini/skills/ralph-init/SKILL.md |
| ~~release~~ | REMOVED (v0.5.0) | — |
| omg-setup | DONE | ~/.gemini/skills/omg-setup/SKILL.md |
| configure-notifications | DONE | ~/.gemini/skills/configure-notifications/SKILL.md |
| ~~configure-telegram~~ | MERGED -> configure-notifications | — |
| ~~configure-discord~~ | MERGED -> configure-notifications | — |
| ~~configure-slack~~ | MERGED -> configure-notifications | — |
| ~~configure-openclaw~~ | MERGED -> configure-notifications | — |
| ~~writer-memory~~ | REMOVED (v0.5.0) | — |
| ~~project-session-manager~~ | REMOVED (v0.5.0) | — |
| ~~psm~~ | REMOVED (v0.5.0) | — |
| swarm | DONE | ~/.gemini/skills/swarm/SKILL.md |
| ~~learn-about-omg~~ | REMOVED (v0.5.0) | — |
| worker | DONE | ~/.gemini/skills/worker/SKILL.md |

### Hook Pipeline (6 full + 3 partial out of 9 = ~89%)

| OMG Hook Event | OMX Equivalent | Capability |
|---------------|---------------|------------|
| SessionStart | GEMINI.md native + runtime overlay (preLaunch) | FULL+ |
| PreToolUse | GEMINI.md inline guidance | PARTIAL (no interception) |
| PostToolUse | notify config hook + tmux prompt injection workaround | FULL* |
| UserPromptSubmit | GEMINI.md self-detection | PARTIAL (model-side detection) |
| SubagentStart | Gemini CLI multi_agent native | FULL |
| SubagentStop | Gemini CLI multi_agent native | FULL |
| PreCompact | GEMINI.md overlay compaction protocol | PARTIAL (instructions only) |
| Stop | notify config + postLaunch cleanup | FULL |
| SessionEnd | omg postLaunch lifecycle phase | PARTIAL (post-exit cleanup) |

`*` FULL via terminal automation workaround (default-enabled in `v0.2.3` generated `.omg/tmux-hook.json`), not native hook context injection.

### Infrastructure

| Component | OMG | OMX Status |
|-----------|-----|-----------|
| CLI (setup) | DONE | DONE |
| CLI (doctor) | DONE | DONE |
| CLI (help) | DONE | DONE |
| CLI (version) | DONE | DONE |
| CLI (status) | DONE | DONE |
| CLI (cancel) | DONE | DONE |
| Config generator | DONE | DONE |
| GEMINI.md template | DONE | DONE |
| State MCP server | DONE | DONE |
| Memory MCP server | DONE | DONE |
| Notify hook script | DONE | DONE |
| Keyword detector | DONE | DONE |
| Hook emulation layer | N/A | DONE |
| Mode base lifecycle | DONE | DONE |
| Verification protocol | DONE | DONE |
| Notification system | DONE | DONE |

## Known Gaps

1. **Pre-tool interception** - Cannot intercept tool calls before execution. Workaround: GEMINI.md instructs model to self-moderate.
2. **Native context injection from hooks** - Not available in Gemini hooks API. Workaround: tmux prompt injection (`omg tmux-hook`) plus state files + GEMINI.md instructions (default-enabled in `v0.2.3` generated config).
3. **PreCompact hook** - No event interception. Workaround: GEMINI.md overlay includes compaction survival instructions that tell the model to checkpoint state before compaction.
4. **Session end** - No real-time event. Workaround: `omg` wrapper detects Gemini exit via blocking execSync and runs postLaunch cleanup (overlay strip, session archive, mode cancellation).
5. **Full LSP protocol** - LSP tools use pragmatic wrappers (tsc, grep, regex) rather than full LSP protocol. Missing: lsp_goto_definition, lsp_prepare_rename, lsp_rename, lsp_code_actions, lsp_code_action_resolve (5 tools need real LSP).
6. **Python REPL** - Not yet ported. Needed only by scientist agent. Low priority for v0.1.0.

## Upstream Contribution Path

To achieve 100% hook parity, these changes need to be contributed to Gemini CLI:
1. Add `BeforeToolUse` hook event to `gemini-rs/hooks/`
2. Add `UserPromptSubmit` hook event
3. Add external hook configuration in `config.toml` (currently only `notify`)
4. Add hook context injection (hook stdout -> system message)

RFC tracking: TBD
