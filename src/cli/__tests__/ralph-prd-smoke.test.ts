import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_SPAWN_TIMEOUT_MS = 15_000;

function runOmx(
  cwd: string,
  argv: string[],
  envOverrides: Record<string, string> = {},
): { status: number | null; stdout: string; stderr: string; error: string } {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(testDir, '..', '..', '..');
  const omgBin = join(repoRoot, 'dist', 'cli', 'omg.js');
  const result = spawnSync(process.execPath, [omgBin, ...argv], {
    cwd,
    encoding: 'utf-8',
    timeout: CLI_SPAWN_TIMEOUT_MS,
    killSignal: 'SIGKILL',
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error?.message || '',
  };
}

function shouldSkipForSpawnPermissions(err: string): boolean {
  return typeof err === 'string' && /(EPERM|EACCES)/i.test(err);
}

async function initRepo(prefix: string): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), prefix));
  execFileSync('git', ['init'], { cwd, stdio: 'ignore' });
  await writeFile(join(cwd, 'README.md'), 'hello\n', 'utf-8');
  return cwd;
}

async function installFakeGemini(fakeBin: string, launchLog: string): Promise<void> {
  await mkdir(fakeBin, { recursive: true });
  const fakeGeminiPath = join(fakeBin, 'gemini');
  const fakePsPath = join(fakeBin, 'ps');
  await writeFile(
    fakeGeminiPath,
    `#!/bin/sh
printf '%s\n' "$*" >>"${launchLog}"
exit 0
`,
    'utf-8',
  );
  await chmod(fakeGeminiPath, 0o755);
  await writeFile(fakePsPath, '#!/bin/sh\nexit 0\n', 'utf-8');
  await chmod(fakePsPath, 0o755);
}

function buildEnv(home: string, fakeBin: string): Record<string, string> {
  return {
    HOME: home,
    PATH: `${fakeBin}:/usr/bin:/bin`,
    OMG_AUTO_UPDATE: '0',
    OMG_NOTIFY_FALLBACK: '0',
    OMG_HOOK_DERIVED_SIGNALS: '0',
  };
}

async function writePrdJson(
  cwd: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await mkdir(join(cwd, '.omg'), { recursive: true });
  await writeFile(join(cwd, '.omg', 'prd.json'), JSON.stringify(payload, null, 2));
}

describe('omg ralph --prd smoke gate', () => {
  it('aborts before Gemini launch when .omg/prd.json is missing', async () => {
    const cwd = await initRepo('omg-ralph-prd-smoke-');
    const home = join(cwd, 'home');
    const fakeBin = join(cwd, 'bin');
    const launchLog = join(cwd, 'gemini-launch.log');
    try {
      await mkdir(home, { recursive: true });
      await installFakeGemini(fakeBin, launchLog);

      const result = runOmx(cwd, ['ralph', '--prd', 'ship release checklist'], buildEnv(home, fakeBin));
      if (shouldSkipForSpawnPermissions(result.error)) return;

      assert.notEqual(result.status, 0, result.error || result.stderr || result.stdout);
      assert.match(`${result.stderr}\n${result.stdout}`, /Missing required PRD\.json at \.omg\/prd\.json/);
      assert.equal(existsSync(launchLog), false, 'expected no Gemini launch log when PRD gate fails');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('aborts before Gemini launch when only canonical PRD markdown exists', async () => {
    const cwd = await initRepo('omg-ralph-prd-smoke-');
    const home = join(cwd, 'home');
    const fakeBin = join(cwd, 'bin');
    const launchLog = join(cwd, 'gemini-launch.log');
    try {
      await mkdir(home, { recursive: true });
      await installFakeGemini(fakeBin, launchLog);
      await mkdir(join(cwd, '.omg', 'plans'), { recursive: true });
      await writeFile(join(cwd, '.omg', 'plans', 'prd-existing.md'), '# Existing canonical PRD\n', 'utf-8');

      const result = runOmx(cwd, ['ralph', '--prd', 'ship release checklist'], buildEnv(home, fakeBin));
      if (shouldSkipForSpawnPermissions(result.error)) return;

      assert.notEqual(result.status, 0, result.error || result.stderr || result.stdout);
      assert.match(`${result.stderr}\n${result.stdout}`, /Missing required PRD\.json at \.omg\/prd\.json/);
      assert.equal(existsSync(launchLog), false, 'expected no Gemini launch log when only canonical markdown exists');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('aborts before Gemini launch when a completed story lacks architect approval', async () => {
    const cwd = await initRepo('omg-ralph-prd-smoke-');
    const home = join(cwd, 'home');
    const fakeBin = join(cwd, 'bin');
    const launchLog = join(cwd, 'gemini-launch.log');
    try {
      await mkdir(home, { recursive: true });
      await installFakeGemini(fakeBin, launchLog);
      await writePrdJson(cwd, {
        project: 'Issue 1555',
        userStories: [{
          id: 'US-001',
          title: 'Guard story completion',
          status: 'completed',
        }],
      });

      const result = runOmx(cwd, ['ralph', '--prd', 'ship release checklist'], buildEnv(home, fakeBin));
      if (shouldSkipForSpawnPermissions(result.error)) return;

      assert.notEqual(result.status, 0, result.error || result.stderr || result.stdout);
      assert.match(`${result.stderr}\n${result.stdout}`, /marked passed\/completed without architect approval/);
      assert.equal(existsSync(launchLog), false, 'expected no Gemini launch log when architect approval is missing');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('launches Gemini exactly once when .omg/prd.json is valid', async () => {
    const cwd = await initRepo('omg-ralph-prd-smoke-');
    const home = join(cwd, 'home');
    const fakeBin = join(cwd, 'bin');
    const launchLog = join(cwd, 'gemini-launch.log');
    try {
      await mkdir(home, { recursive: true });
      await installFakeGemini(fakeBin, launchLog);
      await writePrdJson(cwd, {
        project: 'Issue 1555',
        userStories: [{
          id: 'US-001',
          title: 'Guard story completion',
          status: 'completed',
          architect_review: { verdict: 'approve' },
        }],
      });

      const result = runOmx(cwd, ['ralph', '--prd', 'ship release checklist'], buildEnv(home, fakeBin));
      if (shouldSkipForSpawnPermissions(result.error)) return;

      assert.equal(result.status, 0, result.error || result.stderr || result.stdout);
      assert.equal(existsSync(launchLog), true, 'expected a Gemini launch log for the valid path');
      const launches = (await readFile(launchLog, 'utf-8'))
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      assert.equal(launches.length, 1, `expected exactly one Gemini launch, got ${launches.length}`);
      assert.match(launches[0], /ship release checklist/);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
