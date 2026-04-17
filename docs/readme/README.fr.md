# oh-my-gemini (OMX)

<p align="center">
  <img src="https://yeachan-heo.github.io/oh-my-gemini-website/omg-character-nobg.png" alt="oh-my-gemini character" width="280">
  <br>
  <em>Votre codex n'est pas seul.</em>
</p>

[![npm version](https://img.shields.io/npm/v/oh-my-gemini)](https://www.npmjs.com/package/oh-my-gemini)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

> **[Website](https://yeachan-heo.github.io/oh-my-gemini-website/)** | **[Documentation](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** | **[CLI Reference](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** | **[Workflows](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** | **[Guide d’intégration OpenClaw](../openclaw-integration.fr.md)** | **[GitHub](https://github.com/Yeachan-Heo/oh-my-gemini)** | **[npm](https://www.npmjs.com/package/oh-my-gemini)**

Couche d'orchestration multi-agents pour [OpenAI Gemini CLI](https://github.com/openai/codex).

## Nouveautés de la v0.9.0 — Spark Initiative

Spark Initiative est la version qui renforce la voie native d’exploration et d’inspection dans OMX.

- **Harness natif pour `omg explore`** — exécute l’exploration read-only du dépôt via une voie Rust plus rapide et plus stricte.
- **`omg sparkshell`** — surface native orientée opérateur, avec résumés de sorties longues et capture explicite de panneaux tmux.
- **Artifacts natifs multiplateformes** — le chemin d’hydratation de `omg-explore-harness`, `omg-sparkshell` et `native-release-manifest.json` fait désormais partie du pipeline de release.
- **CI/CD renforcé** — ajoute une configuration explicite de la toolchain Rust dans le job `build`, ainsi que `cargo fmt --check` et `cargo clippy -- -D warnings`.

Voir aussi les [notes de version v0.9.0](../release-notes-0.9.0.md) et le [corps de release](../release-body-0.9.0.md).

## Première session

Dans Gemini :

```text
$deep-interview "clarify the auth change"
$ralplan "approve the auth plan and review tradeoffs"
$ralph "carry the approved plan to completion"
$team 3:executor "execute the approved plan in parallel"
```

Depuis le terminal :

```bash
omg team 4:executor "parallelize a multi-module refactor"
omg team status <team-name>
omg team shutdown <team-name>
```

## Flux recommandé

1. `$deep-interview` — quand le périmètre ou les limites restent flous.
2. `$ralplan` — pour transformer ce périmètre clarifié en plan validé d’architecture et d’implémentation.
3. `$team` ou `$ralph` — utilisez `$team` pour une exécution parallèle coordonnée, ou `$ralph` pour une boucle persistante de finalisation/vérification avec un seul responsable.

## Modèle de base

OMX installe et connecte ces couches :

```text
User
  -> Gemini CLI
    -> GEMINI.md (cerveau d'orchestration)
    -> ~/.gemini/prompts/*.md (catalogue de prompts d'agents)
    -> ~/.gemini/skills/*/SKILL.md (catalogue de skills)
    -> ~/.gemini/config.toml (fonctionnalités, notifications, MCP)
    -> .omg/ (état d'exécution, mémoire, plans, journaux)
```

## Commandes principales

```bash
omg                # Lancer Gemini (+ HUD dans tmux si disponible)
omg setup          # Installer prompts/skills/config par scope + .omg du projet + GEMINI.md propre au scope
omg doctor         # Diagnostics d'installation/exécution
omg doctor --team  # Diagnostics Team/Swarm
omg team ...       # Démarrer/statut/reprendre/arrêter les workers d'équipe tmux
omg status         # Afficher les modes actifs
omg cancel         # Annuler les modes d'exécution actifs
omg reasoning <mode> # low|medium|high|xhigh
omg tmux-hook ...  # init|status|validate|test
omg hooks ...      # init|status|validate|test (workflow d'extension de plugins)
omg hud ...        # --watch|--json|--preset
omg help
```

## Extension Hooks (Surface additive)

OMX inclut désormais `omg hooks` pour l'échafaudage et la validation de plugins.

- `omg tmux-hook` reste supporté et inchangé.
- `omg hooks` est additif et ne remplace pas les workflows tmux-hook.
- Les fichiers de plugins se trouvent dans `.omg/hooks/*.mjs`.
- Les plugins sont désactivés par défaut ; activez-les avec `OMX_HOOK_PLUGINS=1`.

Consultez `docs/hooks-extension.md` pour le workflow d'extension complet et le modèle d'événements.

## Flags de lancement

```bash
--yolo
--high
--xhigh
--madmax
--force
--dry-run
--verbose
--scope <user|project>  # uniquement pour setup
```

`--madmax` correspond à Gemini `--dangerously-bypass-approvals-and-sandbox`.
À utiliser uniquement dans des environnements sandbox de confiance/externes.

### Politique MCP workingDirectory (durcissement optionnel)

Par défaut, les outils MCP état/mémoire/trace acceptent le `workingDirectory` fourni par l'appelant.
Pour restreindre cela, définissez une liste d'autorisation de racines :

```bash
export OMX_MCP_WORKDIR_ROOTS="/path/to/project:/path/to/another-root"
```

Lorsque défini, les valeurs `workingDirectory` en dehors de ces racines sont rejetées.

## Contrôle Gemini-First des prompts

Par défaut, OMX injecte :

```text
-c model_instructions_file="<cwd>/GEMINI.md"
```

Cela fusionne le `GEMINI.md` de `CODEX_HOME` avec le `GEMINI.md` du projet (s'il existe), puis ajoute l'overlay d'exécution.
Cela étend le comportement de Gemini, mais ne remplace/contourne pas les politiques système de base de Gemini.

Contrôles :

```bash
OMX_BYPASS_DEFAULT_SYSTEM_PROMPT=0 omg     # désactiver l'injection GEMINI.md
OMX_MODEL_INSTRUCTIONS_FILE=/path/to/instructions.md omg
```

## Mode équipe

Utilisez le mode équipe pour les travaux importants qui bénéficient de workers parallèles.

Cycle de vie :

```text
start -> assign scoped lanes -> monitor -> verify terminal tasks -> shutdown
```

Commandes opérationnelles :

```bash
omg team <args>
omg team status <team-name>
omg team resume <team-name>
omg team shutdown <team-name>
```

Règle importante : n'arrêtez pas tant que des tâches sont encore `in_progress`, sauf en cas d'abandon.

### Team shutdown policy

Use `omg team shutdown <team-name>` after the team reaches a terminal state.
Team cleanup now follows one standalone path; legacy linked-Ralph shutdown handling is no longer a separate public workflow.

Sélection du CLI worker pour les workers d'équipe :

```bash
OMX_TEAM_WORKER_CLI=auto    # par défaut ; utilise claude quand worker --model contient "claude"
OMX_TEAM_WORKER_CLI=codex   # forcer les workers Gemini CLI
OMX_TEAM_WORKER_CLI=claude  # forcer les workers Claude CLI
OMX_TEAM_WORKER_CLI_MAP=codex,codex,claude,claude  # mix CLI par worker (longueur=1 ou nombre de workers)
OMX_TEAM_AUTO_INTERRUPT_RETRY=0  # optionnel : désactiver le fallback adaptatif queue->resend
```

Notes :
- Les arguments de lancement des workers sont toujours partagés via `OMX_TEAM_WORKER_LAUNCH_ARGS`.
- `OMX_TEAM_WORKER_CLI_MAP` remplace `OMX_TEAM_WORKER_CLI` pour la sélection par worker.
- La soumission de déclencheurs utilise par défaut des tentatives adaptatives (queue/submit, puis fallback sécurisé clear-line+resend si nécessaire).
- En mode worker Claude, OMX lance les workers en tant que simple `claude` (pas d'arguments de lancement supplémentaires) et ignore les surcharges explicites `--model` / `--config` / `--effort` pour que Claude utilise le `settings.json` par défaut.

## Ce que `omg setup` écrit

- `.omg/setup-scope.json` (scope de setup persisté)
- Installations dépendantes du scope :
  - `user` : `~/.gemini/prompts/`, `~/.gemini/skills/`, `~/.gemini/config.toml`, `~/.omg/agents/`, `~/.gemini/GEMINI.md`
  - `project` : `./.gemini/prompts/`, `./.gemini/skills/`, `./.gemini/config.toml`, `./.omg/agents/`, `./GEMINI.md`
- Comportement au lancement : si le scope persisté est `project`, le lancement `omg` utilise automatiquement `CODEX_HOME=./.gemini` (sauf si `CODEX_HOME` est déjà défini).
- Les instructions de lancement fusionnent `~/.gemini/GEMINI.md` (ou `CODEX_HOME/GEMINI.md` s'il est redéfini) avec `./GEMINI.md` du projet, puis ajoutent l'overlay d'exécution.
- Les fichiers `GEMINI.md` existants ne sont jamais écrasés silencieusement : en TTY interactif, setup demande avant de remplacer ; en non-interactif, le remplacement est ignoré sauf avec `--force` (les vérifications de sécurité de session active s'appliquent toujours).
- Mises à jour de `config.toml` (pour les deux scopes) :
  - `notify = ["node", "..."]`
  - `model_reasoning_effort = "high"`
  - `developer_instructions = "..."`
  - `[features] multi_agent = true, child_agents_md = true`
  - Entrées de serveurs MCP (`omg_state`, `omg_memory`, `omg_code_intel`, `omg_trace`, `omg_wiki`)
  - `[tui] status_line`
- `GEMINI.md` spécifique au scope
- Répertoires d'exécution `.omg/` et configuration HUD

## Agents et Skills

- Prompts : `prompts/*.md` (installés dans `~/.gemini/prompts/` pour `user`, `./.gemini/prompts/` pour `project`)
- Skills : `skills/*/SKILL.md` (installés dans `~/.gemini/skills/` pour `user`, `./.gemini/skills/` pour `project`)

Exemples :
- Agents : `architect`, `planner`, `executor`, `debugger`, `verifier`, `security-reviewer`
- Skills : `autopilot`, `plan`, `team`, `ralph`, `ultrawork`, `cancel`

## Structure du projet

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

## Développement

```bash
git clone https://github.com/Yeachan-Heo/oh-my-gemini.git
cd oh-my-gemini
npm install
npm run build
npm test
```

## Documentation

- **[Documentation complète](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html)** — Guide complet
- **[Référence CLI](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#cli-reference)** — Toutes les commandes `omg`, flags et outils
- **[Guide des notifications](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#notifications)** — Configuration Discord, Telegram, Slack et webhooks
- **[Workflows recommandés](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#workflows)** — Chaînes de skills éprouvées pour les tâches courantes
- **[Notes de version](https://yeachan-heo.github.io/oh-my-gemini-website/docs.html#release-notes)** — Nouveautés de chaque version

## Notes

- Journal des modifications complet : `CHANGELOG.md`
- Guide de migration (post-v0.4.4 mainline) : `docs/migration-mainline-post-v0.4.4.md`
- Notes de couverture et parité : `COVERAGE.md`
- Workflow d'extension hooks : `docs/hooks-extension.md`
- Détails de configuration et contribution : `CONTRIBUTING.md`

## Remerciements

Inspiré par [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode), adapté pour Gemini CLI.

## Licence

MIT
