/**
 * omg doctor - Validate oh-my-gemini installation
 */

import { existsSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import {
  geminiHome, geminiConfigPath, geminiPromptsDir,
  userSkillsDir, projectSkillsDir, omgStateDir, detectLegacySkillRootOverlap,
} from '../utils/paths.js';
import { classifySpawnError, spawnPlatformCommandSync } from '../utils/platform-command.js';
import { getCatalogExpectations } from './catalog-contract.js';
import { parse as parseToml } from '@iarna/toml';
import {
  getBuiltinExploreHarnessUnsupportedReason,
  resolvePackagedExploreHarnessCommand,
  EXPLORE_BIN_ENV,
} from './explore.js';
import { getPackageRoot } from '../utils/package.js';
import { hasLegacyOmxTeamRunTable } from '../config/generator.js';
import { getMissingManagedGeminiHookEvents } from '../config/gemini-hooks.js';
import { getDefaultBridge, isBridgeEnabled } from '../runtime/bridge.js';
import { OMG_EXPLORE_CMD_ENV, isExploreCommandRoutingEnabled } from '../hooks/explore-routing.js';
import { isLeaderRuntimeStale } from '../team/leader-activity.js';

interface DoctorOptions {
  verbose?: boolean;
  force?: boolean;
  dryRun?: boolean;
  team?: boolean;
}

interface Check {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

type DoctorSetupScope = 'user' | 'project';

interface DoctorScopeResolution {
  scope: DoctorSetupScope;
  source: 'persisted' | 'default';
}

interface DoctorPaths {
  geminiHomeDir: string;
  configPath: string;
  hooksPath: string;
  promptsDir: string;
  skillsDir: string;
  stateDir: string;
}

const LEGACY_SCOPE_MIGRATION: Record<string, DoctorSetupScope> = {
  'project-local': 'project',
};

async function resolveDoctorScope(cwd: string): Promise<DoctorScopeResolution> {
  const scopePath = join(cwd, '.omg', 'setup-scope.json');
  if (!existsSync(scopePath)) {
    return { scope: 'user', source: 'default' };
  }

  try {
    const raw = await readFile(scopePath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<{ scope: string }>;
    if (typeof parsed.scope === 'string') {
      if (parsed.scope === 'user' || parsed.scope === 'project') {
        return { scope: parsed.scope, source: 'persisted' };
      }
      const migrated = LEGACY_SCOPE_MIGRATION[parsed.scope];
      if (migrated) {
        return { scope: migrated, source: 'persisted' };
      }
    }
  } catch {
    // ignore invalid persisted scope and fall back to default
  }

  return { scope: 'user', source: 'default' };
}

function resolveDoctorPaths(cwd: string, scope: DoctorSetupScope): DoctorPaths {
  if (scope === 'project') {
    const geminiHomeDir = join(cwd, '.gemini');
    return {
      geminiHomeDir,
      configPath: join(geminiHomeDir, 'config.toml'),
      hooksPath: join(geminiHomeDir, 'hooks.json'),
      promptsDir: join(geminiHomeDir, 'prompts'),
      skillsDir: projectSkillsDir(cwd),
      stateDir: omgStateDir(cwd),
    };
  }

  return {
    geminiHomeDir: geminiHome(),
    configPath: geminiConfigPath(),
    hooksPath: join(geminiHome(), 'hooks.json'),
    promptsDir: geminiPromptsDir(),
    skillsDir: userSkillsDir(),
    stateDir: omgStateDir(cwd),
  };
}

export async function doctor(options: DoctorOptions = {}): Promise<void> {
  if (options.team) {
    await doctorTeam();
    return;
  }

  const cwd = process.cwd();
  const scopeResolution = await resolveDoctorScope(cwd);
  const paths = resolveDoctorPaths(cwd, scopeResolution.scope);
  const scopeSourceMessage = scopeResolution.source === 'persisted'
    ? ' (from .omg/setup-scope.json)'
    : '';

  console.log('oh-my-gemini doctor');
  console.log('==================\n');
  console.log(`Resolved setup scope: ${scopeResolution.scope}${scopeSourceMessage}\n`);

  const checks: Check[] = [];

  // Check 1: Gemini CLI installed
  checks.push(checkGeminiCli());

  // Check 2: Node.js version
  checks.push(checkNodeVersion());

  // Check 2.5: Explore harness readiness
  checks.push(checkExploreHarness());

  // Check 3: Gemini home directory
  checks.push(checkDirectory('Gemini home', paths.geminiHomeDir));

  // Check 4: Config file
  checks.push(await checkConfig(paths.configPath));

  // Check 4.25: Native hooks coverage
  checks.push(await checkNativeHooks(paths.hooksPath, paths.configPath));

  // Check 4.5: Explore routing default
  checks.push(checkExploreRouting());

  // Check 5: Prompts installed
  checks.push(await checkPrompts(paths.promptsDir));

  // Check 6: Skills installed
  checks.push(await checkSkills(paths.skillsDir));

  // Check 6.5: Legacy/current skill-root overlap
  if (scopeResolution.scope === 'user') {
    checks.push(await checkLegacySkillRootOverlap());
  }

  // Check 7: GEMINI.md in project
  checks.push(checkAgentsMd(scopeResolution.scope, paths.geminiHomeDir));

  // Check 8: State directory
  checks.push(checkDirectory('State dir', paths.stateDir));

  // Check 8.5: Legacy state files
  const legacyStateCheck = await checkLegacyState(paths.stateDir);
  checks.push(legacyStateCheck);

  // Check 9: MCP servers configured
  checks.push(await checkMcpServers(paths.configPath));

  // Print results
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const check of checks) {
    const icon = check.status === 'pass' ? '[OK]' : check.status === 'warn' ? '[!!]' : '[XX]';
    console.log(`  ${icon} ${check.name}: ${check.message}`);
    if (check.status === 'pass') passCount++;
    else if (check.status === 'warn') warnCount++;
    else failCount++;
  }

  console.log(`\nResults: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);

  if (legacyStateCheck.status === 'warn' && !options.dryRun) {
    const { createInterface } = await import('readline/promises');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('\nLegacy JSON state files detected. Would you like to migrate them to SQLite now? [Y/n] ');
    rl.close();
    if (answer.toLowerCase() !== 'n') {
      const { migrateCommand } = await import('./migrate.js');
      await migrateCommand([]);
    }
  }

  if (failCount > 0) {
    console.log('\nRun "omg setup" to fix installation issues.');
  } else if (warnCount > 0) {
    console.log('\nRun "omg setup --force" to refresh all components.');
  } else {
    console.log('\nAll checks passed! oh-my-gemini is ready.');
  }
}

interface TeamDoctorIssue {
  code: 'delayed_status_lag' | 'slow_shutdown' | 'orphan_tmux_session' | 'resume_blocker' | 'stale_leader';
  message: string;
  severity: 'warn' | 'fail';
}

async function doctorTeam(): Promise<void> {
  console.log('oh-my-gemini doctor --team');
  console.log('=========================\n');

  const issues = await collectTeamDoctorIssues(process.cwd());
  if (issues.length === 0) {
    console.log('  [OK] team diagnostics: no issues');
  } else {
    for (const issue of issues) {
      const icon = issue.severity === 'fail' ? '[XX]' : '[!!]';
      console.log(`  ${icon} ${issue.code}: ${issue.message}`);
    }
  }
}

function checkGeminiCli(): Check {
  try {
    spawnPlatformCommandSync('gemini', ['--version']);
    return { name: 'Gemini CLI', status: 'pass', message: 'installed' };
  } catch (err) {
    const detail = classifySpawnError(err as any);
    return { name: 'Gemini CLI', status: 'fail', message: `not found (${detail})` };
  }
}

function checkNodeVersion(): Check {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0] || '0', 10);
  if (major >= 20) {
    return { name: 'Node.js', status: 'pass', message: version };
  }
  return { name: 'Node.js', status: 'fail', message: `${version} (require >= 20)` };
}

export function checkExploreHarness(platform: NodeJS.Platform = process.platform, env: NodeJS.ProcessEnv = process.env): Check {
  const reason = getBuiltinExploreHarnessUnsupportedReason(platform, env);
  if (!reason) {
    return { name: 'Explore harness', status: 'pass', message: 'ready' };
  }
  return { name: 'Explore harness', status: 'warn', message: reason };
}

function checkDirectory(name: string, path: string): Check {
  if (existsSync(path)) {
    return { name, status: 'pass', message: path };
  }
  return { name, status: 'fail', message: `missing: ${path}` };
}

async function checkConfig(path: string): Promise<Check> {
  if (!existsSync(path)) {
    return { name: 'Config file', status: 'fail', message: `missing: ${path}` };
  }
  try {
    const content = await readFile(path, 'utf-8');
    parseToml(content);
    return { name: 'Config file', status: 'pass', message: 'valid TOML' };
  } catch (err) {
    return { name: 'Config file', status: 'fail', message: `invalid: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function checkNativeHooks(hooksPath: string, configPath: string): Promise<Check> {
  if (!existsSync(hooksPath)) {
    if (existsSync(configPath)) {
      return { name: 'Native hooks', status: 'warn', message: 'hooks.json not found even though config.toml has OMX entries; run "omg setup --force" to restore native hook coverage' };
    }
    return { name: 'Native hooks', status: 'pass', message: 'hooks.json not found yet (expected before first setup)' };
  }
  try {
    const content = await readFile(hooksPath, 'utf-8');
    const missingEvents = getMissingManagedGeminiHookEvents(content);
    if (!missingEvents || missingEvents.length === 0) {
      return { name: 'Native hooks', status: 'pass', message: 'fully configured' };
    }
    return { name: 'Native hooks', status: 'warn', message: `hooks.json is missing OMX-managed coverage for ${missingEvents.join(', ')}; run "omg setup --force" to restore native hooks` };
  } catch {
    return { name: 'Native hooks', status: 'fail', message: 'invalid hooks.json; Gemini may skip OMX hook coverage until "omg setup --force" repairs it' };
  }
}

function checkExploreRouting(): Check {
  const enabled = isExploreCommandRoutingEnabled();
  if (enabled) {
    return { name: 'Explore routing', status: 'pass', message: 'enabled' };
  }
  return { name: 'Explore routing', status: 'warn', message: 'disabled (recommend enabling for faster search)' };
}

async function checkPrompts(path: string): Promise<Check> {
  if (!existsSync(path)) {
    return { name: 'Prompts', status: 'fail', message: `missing: ${path}` };
  }
  try {
    const files = await readdir(path);
    const count = files.filter(f => f.endsWith('.md')).length;
    if (count > 0) {
      return { name: 'Prompts', status: 'pass', message: `${count} installed` };
    }
    return { name: 'Prompts', status: 'warn', message: 'none found' };
  } catch {
    return { name: 'Prompts', status: 'fail', message: 'failed to read' };
  }
}

async function checkSkills(path: string): Promise<Check> {
  if (!existsSync(path)) {
    return { name: 'Skills', status: 'warn', message: `missing: ${path}` };
  }
  try {
    const files = await readdir(path);
    if (files.length > 0) {
      return { name: 'Skills', status: 'pass', message: `${files.length} installed` };
    }
    return { name: 'Skills', status: 'warn', message: 'none found' };
  } catch {
    return { name: 'Skills', status: 'fail', message: 'failed to read' };
  }
}

async function checkLegacySkillRootOverlap(): Promise<Check> {
  const overlap = await detectLegacySkillRootOverlap();
  if (overlap.legacyExists && overlap.sameResolvedTarget) {
    return {
      name: 'Legacy skill roots',
      status: 'pass',
      message: `~/.agents/skills links to canonical ${overlap.canonicalDir}; treating both paths as one shared skill root`,
    };
  }
  if (overlap.legacyExists && overlap.overlappingSkillNames.length > 0) {
    return {
      name: 'Legacy skill roots',
      status: 'warn',
      message: `${overlap.overlappingSkillNames.length} overlapping skill names between ${overlap.canonicalDir} and legacy ${overlap.legacyDir}; ${overlap.mismatchedSkillNames.length} differ in SKILL.md content; Gemini Enable/Disable Skills may show duplicates until ~/.agents/skills is cleaned up`,
    };
  }
  if (overlap.legacyExists && overlap.overlappingSkillNames.length === 0) {
    return {
      name: 'Legacy skill roots',
      status: 'warn',
      message: `legacy ~/.agents/skills still exists (${overlap.legacySkillCount} skills) alongside canonical ${overlap.canonicalDir}; remove or archive it if Gemini shows duplicate entries`,
    };
  }
  return { name: 'Legacy skills', status: 'pass', message: 'none' };
}

function checkAgentsMd(scope: DoctorSetupScope, geminiHomeDir: string): Check {
  const target = scope === 'project' 
    ? join(process.cwd(), 'GEMINI.md') 
    : join(geminiHomeDir, 'GEMINI.md');
  if (!existsSync(target)) {
    const scopeName = scope === 'project' ? 'project root' : 'user home';
    return { name: 'GEMINI.md', status: 'fail', message: `missing from ${scopeName}` };
  }
  return { name: 'GEMINI.md', status: 'pass', message: `found in ${target}` };
}

async function checkMcpServers(configPath: string): Promise<Check> {
  if (!existsSync(configPath)) return { name: 'MCP servers', status: 'fail', message: 'config missing' };
  try {
    const content = await readFile(configPath, 'utf-8');
    const config = parseToml(content) as any;
    const servers = config.mcp_servers || {};
    const count = Object.keys(servers).length;
    return { name: 'MCP servers', status: 'pass', message: `${count} configured` };
  } catch {
    return { name: 'MCP servers', status: 'fail', message: 'failed to read config' };
  }
}

async function checkLegacyState(stateDir: string): Promise<Check> {
  if (!existsSync(stateDir)) return { name: 'Legacy state', status: 'pass', message: 'none' };
  try {
    const files = await readdir(stateDir);
    const stateFiles = files.filter(f => f.endsWith('-state.json'));
    if (stateFiles.length > 0) {
      return { name: 'Legacy state', status: 'warn', message: `${stateFiles.length} JSON files found (recommend migrating to SQLite)` };
    }
    return { name: 'Legacy state', status: 'pass', message: 'none' };
  } catch {
    return { name: 'Legacy state', status: 'fail', message: 'failed to read' };
  }
}

async function collectTeamDoctorIssues(cwd: string): Promise<TeamDoctorIssue[]> {
  const issues: TeamDoctorIssue[] = [];
  
  // Stale leader check
  const stateDir = omgStateDir(cwd);
  if (await isLeaderRuntimeStale(stateDir, 5000, Date.now())) {
    issues.push({
      code: 'stale_leader',
      message: 'Team leader state is stale. Run "omg team cleanup" to recover.',
      severity: 'fail',
    });
  }

  return issues;
}
