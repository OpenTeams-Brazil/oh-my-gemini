---
name: doctor
description: Diagnose and fix oh-my-gemini installation issues
---

# Doctor Skill

Note: All `~/.gemini/...` paths in this guide respect `CODEX_HOME` when that environment variable is set.

## Canonical skill root

OMX installs skills to `${CODEX_HOME:-~/.gemini}/skills/` — this is the path current Gemini CLI natively loads as its skill root.

`~/.agents/skills/` is a **historical legacy path** from an older Gemini CLI release, before Gemini settled on `~/.gemini` as its home directory. Current Gemini CLI and OMX no longer write there.

**In a mixed OMX + plain Gemini environment:**
- **Use**: `${CODEX_HOME:-~/.gemini}/skills/` (user scope) or `.gemini/skills/` (project scope)
- **Clean up if present**: `~/.agents/skills/` — if this still exists alongside the canonical root, Gemini's Enable/Disable Skills UI will show duplicate entries for any skill present in both trees
- **Interop rule**: OMX writes only to the canonical path; archive or remove `~/.agents/skills/` once you have confirmed `${CODEX_HOME:-~/.gemini}/skills/` is your active root

## Task: Run Installation Diagnostics

You are the OMX Doctor - diagnose and fix installation issues.

### Step 1: Check Plugin Version

```bash
# Get installed version
INSTALLED=$(ls ~/.gemini/plugins/cache/omc/oh-my-gemini/ 2>/dev/null | sort -V | tail -1)
echo "Installed: $INSTALLED"

# Get latest from npm
LATEST=$(npm view oh-my-gemini version 2>/dev/null)
echo "Latest: $LATEST"
```

**Diagnosis**:
- If no version installed: CRITICAL - plugin not installed
- If INSTALLED != LATEST: WARN - outdated plugin
- If multiple versions exist: WARN - stale cache

### Step 2: Check Hook Configuration (config.toml + legacy settings.json)

Check `~/.gemini/config.toml` first (current Gemini config), then check legacy `~/.gemini/settings.json` only if it exists.

Look for hook entries pointing to removed scripts like:
- `bash $HOME/.gemini/hooks/keyword-detector.sh`
- `bash $HOME/.gemini/hooks/persistent-mode.sh`
- `bash $HOME/.gemini/hooks/session-start.sh`

**Diagnosis**:
- If found: CRITICAL - legacy hooks causing duplicates

### Step 3: Check for Legacy Bash Hook Scripts

```bash
ls -la ~/.gemini/hooks/*.sh 2>/dev/null
```

**Diagnosis**:
- If `keyword-detector.sh`, `persistent-mode.sh`, `session-start.sh`, or `stop-continuation.sh` exist: WARN - legacy scripts (can cause confusion)

### Step 4: Check GEMINI.md

```bash
# Check if GEMINI.md exists
ls -la ~/.gemini/GEMINI.md 2>/dev/null

# Check for OMX marker
grep -q "oh-my-gemini Multi-Agent System" ~/.gemini/GEMINI.md 2>/dev/null && echo "Has OMX config" || echo "Missing OMX config"
```

**Diagnosis**:
- If missing: CRITICAL - GEMINI.md not configured
- If missing OMX marker: WARN - outdated GEMINI.md

### Step 5: Check for Stale Plugin Cache

```bash
# Count versions in cache
ls ~/.gemini/plugins/cache/omc/oh-my-gemini/ 2>/dev/null | wc -l
```

**Diagnosis**:
- If > 1 version: WARN - multiple cached versions (cleanup recommended)

### Step 6: Check for Legacy Curl-Installed Content

Check for legacy agents, commands, and historical legacy skill roots from older installs/migrations:

```bash
# Check for legacy agents directory
ls -la ~/.gemini/agents/ 2>/dev/null

# Check for legacy commands directory
ls -la ~/.gemini/commands/ 2>/dev/null

# Check canonical current skills directory
ls -la ${CODEX_HOME:-~/.gemini}/skills/ 2>/dev/null

# Check historical legacy skill directory
ls -la ~/.agents/skills/ 2>/dev/null
```

**Diagnosis**:
- If `~/.gemini/agents/` exists with oh-my-gemini-related files: WARN - legacy agents (now provided by plugin)
- If `~/.gemini/commands/` exists with oh-my-gemini-related files: WARN - legacy commands (now provided by plugin)
- If `${CODEX_HOME:-~/.gemini}/skills/` exists with OMX skills: OK - canonical current user skill root
- If `~/.agents/skills/` exists: WARN - historical legacy skill root that can overlap with `${CODEX_HOME:-~/.gemini}/skills/` and cause duplicate Enable/Disable Skills entries

Look for files like:
- `architect.md`, `researcher.md`, `explore.md`, `executor.md`, etc. in agents/
- `ultrawork.md`, `deepsearch.md`, etc. in commands/
- Any oh-my-gemini-related `.md` files in skills/

---

## Report Format

After running all checks, output a report:

```
## OMX Doctor Report

### Summary
[HEALTHY / ISSUES FOUND]

### Checks

| Check | Status | Details |
|-------|--------|---------|
| Plugin Version | OK/WARN/CRITICAL | ... |
| Hook Config (config.toml / legacy settings.json) | OK/CRITICAL | ... |
| Legacy Scripts (~/.gemini/hooks/) | OK/WARN | ... |
| GEMINI.md | OK/WARN/CRITICAL | ... |
| Plugin Cache | OK/WARN | ... |
| Legacy Agents (~/.gemini/agents/) | OK/WARN | ... |
| Legacy Commands (~/.gemini/commands/) | OK/WARN | ... |
| Skills (${CODEX_HOME:-~/.gemini}/skills) | OK/WARN | ... |
| Legacy Skill Root (~/.agents/skills) | OK/WARN | ... |

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommended Fixes
[List fixes based on issues]
```

---

## Auto-Fix (if user confirms)

If issues found, ask user: "Would you like me to fix these issues automatically?"

If yes, apply fixes:

### Fix: Legacy Hooks in legacy settings.json
If `~/.gemini/settings.json` exists, remove the legacy `"hooks"` section (keep other settings intact).

### Fix: Legacy Bash Scripts
```bash
rm -f ~/.gemini/hooks/keyword-detector.sh
rm -f ~/.gemini/hooks/persistent-mode.sh
rm -f ~/.gemini/hooks/session-start.sh
rm -f ~/.gemini/hooks/stop-continuation.sh
```

### Fix: Outdated Plugin
```bash
rm -rf ~/.gemini/plugins/cache/omc/oh-my-gemini
echo "Plugin cache cleared. Restart Gemini CLI to fetch latest version."
```

### Fix: Stale Cache (multiple versions)
```bash
# Keep only latest version
cd ~/.gemini/plugins/cache/omc/oh-my-gemini/
ls | sort -V | head -n -1 | xargs rm -rf
```

### Fix: Missing/Outdated GEMINI.md
Fetch latest from GitHub and write to `~/.gemini/GEMINI.md`:
```
WebFetch(url: "https://raw.githubusercontent.com/Yeachan-Heo/oh-my-gemini/main/docs/GEMINI.md", prompt: "Return the complete raw markdown content exactly as-is")
```

### Fix: Legacy Curl-Installed Content

Remove legacy agents/commands plus the historical `~/.agents/skills` tree if it overlaps with the canonical `${CODEX_HOME:-~/.gemini}/skills` install:

```bash
# Backup first (optional - ask user)
# mv ~/.gemini/agents ~/.gemini/agents.bak
# mv ~/.gemini/commands ~/.gemini/commands.bak
# mv ~/.agents/skills ~/.agents/skills.bak

# Or remove directly
rm -rf ~/.gemini/agents
rm -rf ~/.gemini/commands
rm -rf ~/.agents/skills
```

**Note**: Only remove if these contain oh-my-gemini-related files. If user has custom agents/commands/skills, warn them and ask before removing.

---

## Post-Fix

After applying fixes, inform user:
> Fixes applied. **Restart Gemini CLI** for changes to take effect.
