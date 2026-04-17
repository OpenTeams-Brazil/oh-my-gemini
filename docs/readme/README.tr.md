# oh-my-gemini (OMX)

<p align="center">
  <img src="https://yeachan-heo.github.io/oh-my-gemini-website/omg-character-nobg.png" alt="oh-my-gemini character" width="280">
  <br>
  <em>Gemini'iniz yalnız değil.</em>
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-gemini)](https://www.npmjs.com/package/oh-my-gemini)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

> **[Website](https://yeachan-heo.github.io/oh-my-gemini-website/)** | **[Documentation](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** | **[CLI Reference](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** | **[Workflows](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** | **[OpenClaw Entegrasyon Kılavuzu](../openclaw-integration.tr.md)** | **[GitHub](https://github.com/Yeachan-Heo/oh-my-gemini)** | **[npm](https://www.npmjs.com/package/oh-my-gemini)**

[OpenAI Gemini CLI](https://github.com/openai/codex) için çok ajanlı orkestrasyon katmanı.

## v0.9.0'daki Yenilikler — Spark Initiative

Spark Initiative, OMX içindeki native keşif ve inceleme yolunu güçlendiren sürümdür.

- **`omg explore` için native harness** — salt okunur depo keşfini Rust tabanlı daha hızlı ve daha sıkı bir yol üzerinden çalıştırır.
- **`omg sparkshell`** — uzun çıktıları özetleyen ve açık tmux pane yakalama desteği veren operatör odaklı native inceleme yüzeyidir.
- **Çapraz platform native release varlıkları** — `omg-explore-harness`, `omg-sparkshell` ve `native-release-manifest.json` için hydration yolu artık release pipeline'ın parçasıdır.
- **Güçlendirilmiş CI/CD** — `build` job'ına açık Rust toolchain kurulumu ile birlikte `cargo fmt --check` ve `cargo clippy -- -D warnings` eklendi.

Ayrıntılar için [v0.9.0 release notları](../release-notes-0.9.0.md) ve [release body](../release-body-0.9.0.md) dosyalarına bakın.

## İlk Oturum

Gemini içinde:

```text
$deep-interview "clarify the auth change"
$ralplan "approve the auth plan and review tradeoffs"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

Terminalden:

```bash
omg team 4:executor "parallelize a multi-module refactor"
omg team status <team-name>
omg team shutdown <team-name>
```

## Önerilen iş akışı

1. `$deep-interview` — kapsam veya sınırlar hâlâ net değilse.
2. `$ralplan` — netleşen kapsamı onaylanmış bir mimari ve uygulama planına dönüştürmek için.
3. `$team` veya `$ralph` — koordineli paralel yürütme için `$team`, tek sahipli kalıcı tamamlama/doğrulama döngüsü için `$ralph` kullanın.

## Temel Model

OMX şu katmanları kurar ve bağlar:

```text
User
  -> Gemini CLI
    -> GEMINI.md (orkestrasyon beyni)
    -> ~/.gemini/prompts/*.md (ajan prompt kataloğu)
    -> ~/.gemini/skills/*/SKILL.md (skill kataloğu)
    -> ~/.gemini/config.toml (özellikler, bildirimler, MCP)
    -> .omg/ (çalışma zamanı durumu, bellek, planlar, günlükler)
```

## Ana Komutlar

```bash
omg                # Gemini'i başlat (tmux'ta HUD ile birlikte)
omg setup          # Prompt/skill/config'i kapsama göre kur + proje .omg + kapsama özel GEMINI.md
omg doctor         # Kurulum/çalışma zamanı tanılamaları
omg doctor --team  # Team/swarm tanılamaları
omg team ...       # tmux takım çalışanlarını başlat/durum/devam et/kapat
omg status         # Aktif modları göster
omg cancel         # Aktif çalışma modlarını iptal et
omg reasoning <mode> # low|medium|high|xhigh
omg tmux-hook ...  # init|status|validate|test
omg hooks ...      # init|status|validate|test (eklenti uzantı iş akışı)
omg hud ...        # --watch|--json|--preset
omg help
```

## Hooks Uzantısı (Ek Yüzey)

OMX artık eklenti iskelesi ve doğrulaması için `omg hooks` içerir.

- `omg tmux-hook` desteklenmeye devam eder ve değişmemiştir.
- `omg hooks` ek niteliktedir ve tmux-hook iş akışlarını değiştirmez.
- Eklenti dosyaları `.omg/hooks/*.mjs` konumunda bulunur.
- Eklentiler varsayılan olarak kapalıdır; `OMX_HOOK_PLUGINS=1` ile etkinleştirin.

Tam uzantı iş akışı ve olay modeli için `docs/hooks-extension.md` dosyasına bakın.

## Başlatma Bayrakları

```bash
--yolo
--high
--xhigh
--madmax
--force
--dry-run
--verbose
--scope <user|project>  # yalnızca setup
```

`--madmax`, Gemini `--dangerously-bypass-approvals-and-sandbox` ile eşlenir.
Yalnızca güvenilir/harici sandbox ortamlarında kullanın.

### MCP workingDirectory politikası (isteğe bağlı sertleştirme)

Varsayılan olarak, MCP durum/bellek/trace araçları çağıranın sağladığı `workingDirectory` değerini kabul eder.
Bunu kısıtlamak için bir izin listesi belirleyin:

```bash
export OMX_MCP_WORKDIR_ROOTS="/path/to/project:/path/to/another-root"
```

Ayarlandığında, bu kökler dışındaki `workingDirectory` değerleri reddedilir.

## Gemini-First Prompt Kontrolü

Varsayılan olarak, OMX şunu enjekte eder:

```text
-c model_instructions_file="<cwd>/GEMINI.md"
```

Bu, `CODEX_HOME` içindeki `GEMINI.md` ile proje `GEMINI.md` dosyasını (varsa) birleştirir ve ardından çalışma zamanı kaplamasını ekler.
Gemini davranışını genişletir, ancak Gemini çekirdek sistem politikalarını değiştirmez/atlamaz.

Kontroller:

```bash
OMX_BYPASS_DEFAULT_SYSTEM_PROMPT=0 omg     # GEMINI.md enjeksiyonunu devre dışı bırak
OMX_MODEL_INSTRUCTIONS_FILE=/path/to/instructions.md omg
```

## Takım Modu

Paralel çalışanlardan fayda sağlayan geniş kapsamlı işler için takım modunu kullanın.

Yaşam döngüsü:

```text
start -> assign scoped lanes -> monitor -> verify terminal tasks -> shutdown
```

Operasyonel komutlar:

```bash
omg team <args>
omg team status <team-name>
omg team resume <team-name>
omg team shutdown <team-name>
```

Önemli kural: İptal etmiyorsanız, görevler hâlâ `in_progress` durumundayken kapatmayın.

### Team shutdown policy

Use `omg team shutdown <team-name>` after the team reaches a terminal state.
Team cleanup now follows one standalone path; legacy linked-Ralph shutdown handling is no longer a separate public workflow.

Takım çalışanları için Worker CLI seçimi:

```bash
OMX_TEAM_WORKER_CLI=auto    # varsayılan; worker --model "claude" içeriyorsa claude kullanır
OMX_TEAM_WORKER_CLI=codex   # Gemini CLI çalışanlarını zorla
OMX_TEAM_WORKER_CLI=claude  # Claude CLI çalışanlarını zorla
OMX_TEAM_WORKER_CLI_MAP=codex,codex,claude,claude  # çalışan başına CLI karışımı (uzunluk=1 veya çalışan sayısı)
OMX_TEAM_AUTO_INTERRUPT_RETRY=0  # isteğe bağlı: adaptif queue->resend geri dönüşünü devre dışı bırak
```

Notlar:
- Worker başlatma argümanları hâlâ `OMX_TEAM_WORKER_LAUNCH_ARGS` aracılığıyla paylaşılır.
- `OMX_TEAM_WORKER_CLI_MAP`, çalışan başına seçim için `OMX_TEAM_WORKER_CLI`'yi geçersiz kılar.
- Tetikleyici gönderimi varsayılan olarak adaptif yeniden denemeler kullanır (queue/submit, ardından gerektiğinde güvenli clear-line+resend geri dönüşü).
- Claude worker modunda, OMX çalışanları düz `claude` olarak başlatır (ekstra başlatma argümanı yok) ve açık `--model` / `--config` / `--effort` geçersiz kılmalarını yok sayar, böylece Claude varsayılan `settings.json` kullanır.

## `omg setup` Ne Yazar

- `.omg/setup-scope.json` (kalıcı kurulum kapsamı)
- Kapsama bağlı kurulumlar:
  - `user`: `~/.gemini/prompts/`, `~/.gemini/skills/`, `~/.gemini/config.toml`, `~/.omg/agents/`, `~/.gemini/GEMINI.md`
  - `project`: `./.gemini/prompts/`, `./.gemini/skills/`, `./.gemini/config.toml`, `./.omg/agents/`, `./GEMINI.md`
- Başlatma davranışı: kalıcı kapsam `project` ise, `omg` başlatma otomatik olarak `CODEX_HOME=./.gemini` kullanır (`CODEX_HOME` zaten ayarlanmadıysa).
- Başlatma talimatları `~/.gemini/GEMINI.md` (veya geçersiz kılındıysa `CODEX_HOME/GEMINI.md`) ile proje `./GEMINI.md` dosyasını birleştirir ve ardından çalışma zamanı kaplamasını ekler.
- Mevcut `GEMINI.md` dosyaları sessizce üzerine yazılmaz: etkileşimli TTY'de setup değiştirmeden önce sorar; etkileşimsiz çalıştırmada ise `--force` yoksa değiştirme atlanır (aktif oturum güvenlik kontrolleri hâlâ geçerlidir).
- `config.toml` güncellemeleri (her iki kapsam için):
  - `notify = ["node", "..."]`
  - `model_reasoning_effort = "high"`
  - `developer_instructions = "..."`
  - `[features] multi_agent = true, child_agents_md = true`
  - MCP sunucu girişleri (`omg_state`, `omg_memory`, `omg_code_intel`, `omg_trace`, `omg_wiki`)
  - `[tui] status_line`
- Kapsama özel `GEMINI.md`
- `.omg/` çalışma zamanı dizinleri ve HUD yapılandırması

## Ajanlar ve Skill'ler

- Prompt'lar: `prompts/*.md` (`user` için `~/.gemini/prompts/`'a, `project` için `./.gemini/prompts/`'a kurulur)
- Skill'ler: `skills/*/SKILL.md` (`user` için `~/.gemini/skills/`'a, `project` için `./.gemini/skills/`'a kurulur)

Örnekler:
- Ajanlar: `architect`, `planner`, `executor`, `debugger`, `verifier`, `security-reviewer`
- Skill'ler: `deep-interview`, `ralplan`, `team`, `ralph`, `plan`, `cancel`

## Proje Yapısı

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

## Geliştirme

```bash
git clone https://github.com/Yeachan-Heo/oh-my-gemini.git
cd oh-my-gemini
npm install
npm run build
npm test
```

## Dokümantasyon

- **[Tam Dokümantasyon](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** — Eksiksiz kılavuz
- **[CLI Referansı](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** — Tüm `omg` komutları, bayraklar ve araçlar
- **[Bildirim Kılavuzu](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#notifications)** — Discord, Telegram, Slack ve webhook kurulumu
- **[Önerilen İş Akışları](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** — Yaygın görevler için savaşta test edilmiş skill zincirleri
- **[Sürüm Notları](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#release-notes)** — Her sürümdeki yenilikler

## Notlar

- Tam değişiklik günlüğü: `CHANGELOG.md`
- Geçiş rehberi (v0.4.4 sonrası mainline): `docs/migration-mainline-post-v0.4.4.md`
- Kapsam ve eşitlik notları: `COVERAGE.md`
- Hook uzantı iş akışı: `docs/hooks-extension.md`
- Kurulum ve katkı detayları: `CONTRIBUTING.md`

## Teşekkürler

[oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)'dan ilham alınmıştır, Gemini CLI için uyarlanmıştır.

## Lisans

MIT
