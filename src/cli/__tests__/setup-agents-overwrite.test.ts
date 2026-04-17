import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setup } from '../setup.js';
import { addGeneratedAgentsMarker } from '../../utils/agents-md.js';
import { resolveAgentsModelTableContext, upsertAgentsModelTable } from '../../utils/agents-model-table.js';

function setMockTty(value: boolean): () => void {
  Object.defineProperty(process.stdin, 'isTTY', {
    value,
    configurable: true,
  });
  Object.defineProperty(process.stdout, 'isTTY', {
    value,
    configurable: true,
  });
  return () => {
    delete (process.stdin as unknown as { isTTY?: boolean }).isTTY;
    delete (process.stdout as unknown as { isTTY?: boolean }).isTTY;
  };
}

function setMockHome(home: string): () => void {
  const previousHome = process.env.HOME;
  const previousGeminiHome = process.env.GEMINI_HOME;
  process.env.HOME = home;
  process.env.GEMINI_HOME = join(home, '.gemini');
  return () => {
    if (typeof previousHome === 'string') process.env.HOME = previousHome;
    else delete process.env.HOME;
    if (typeof previousGeminiHome === 'string') process.env.GEMINI_HOME = previousGeminiHome;
    else delete process.env.GEMINI_HOME;
  };
}

async function runSetupWithCapturedLogs(
  cwd: string,
  options: Parameters<typeof setup>[0]
): Promise<string> {
  const previousCwd = process.cwd();
  const logs: string[] = [];
  const originalLog = console.log;
  process.chdir(cwd);
  console.log = (...args: unknown[]) => {
    logs.push(args.map((arg) => String(arg)).join(' '));
  };
  try {
    await setup({
      modelUpgradePrompt: async () => false,
      ...options,
    });
    return logs.join('\n');
  } finally {
    console.log = originalLog;
    process.chdir(previousCwd);
  }
}

async function readCurrentLinuxStartTicks(): Promise<number | undefined> {
  if (process.platform !== 'linux') return undefined;
  try {
    const stat = await readFile('/proc/self/stat', 'utf-8');
    const commandEnd = stat.lastIndexOf(')');
    if (commandEnd === -1) return undefined;
    const fields = stat.slice(commandEnd + 1).trim().split(/\s+/);
    const ticks = Number(fields[19]);
    return Number.isFinite(ticks) ? ticks : undefined;
  } catch {
    return undefined;
  }
}

describe('omg setup AGENTS refresh behavior', () => {
  it('creates user-scope GEMINI.md and leaves project GEMINI.md untouched', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-agents-'));
    const restoreTty = setMockTty(true);
    const home = join(wd, 'home');
    const restoreHome = setMockHome(home);
    const existing = '# project-owned agents file\n';
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      await writeFile(join(wd, 'GEMINI.md'), existing);

      const output = await runSetupWithCapturedLogs(wd, {
        scope: 'user',
      });

      assert.match(output, /Generated AGENTS\.md in .*home\/\.gemini\./);
      assert.match(output, /User scope leaves project AGENTS\.md unchanged\./);
      assert.match(output, /agents_md: updated=1, unchanged=0, backed_up=0, skipped=0, removed=0/);
      assert.equal(await readFile(join(wd, 'GEMINI.md'), 'utf-8'), existing);
      assert.equal(existsSync(join(home, '.gemini', 'GEMINI.md')), true);
      assert.equal(existsSync(join(wd, '.omg', 'backups', 'setup')), false);
    } finally {
      restoreHome();
      restoreTty();
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('overwrites existing GEMINI.md in TTY after confirmation and creates a backup first', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-agents-'));
    const restoreTty = setMockTty(true);
    const home = join(wd, 'home');
    const restoreHome = setMockHome(home);
    const existing = '# oh-my-gemini - Intelligent Multi-Agent Orchestration\n\nUser-owned guidance.\n';
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      await writeFile(join(wd, 'GEMINI.md'), existing);

      const output = await runSetupWithCapturedLogs(wd, {
        scope: 'project',
        agentsOverwritePrompt: async () => true,
      });

      const agentsContent = await readFile(join(wd, 'GEMINI.md'), 'utf-8');
      assert.match(output, /Generated AGENTS\.md in project root\./);
      assert.match(output, /agents_md: updated=1, unchanged=0, backed_up=1, skipped=0, removed=0/);
      assert.match(agentsContent, /^<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->/);
      assert.match(agentsContent, /# oh-my-gemini - Intelligent Multi-Agent Orchestration/);
      assert.doesNotMatch(agentsContent, /User-owned guidance\./);

      const backupsRoot = join(wd, '.omg', 'backups', 'setup');
      assert.equal(existsSync(backupsRoot), true);
      const timestamps = await readdir(backupsRoot);
      assert.equal(timestamps.length, 1);
      const backupContent = await readFile(join(backupsRoot, timestamps[0], 'GEMINI.md'), 'utf-8');
      assert.equal(backupContent, existing);
    } finally {
      restoreHome();
      restoreTty();
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('refreshes the managed model table in non-interactive runs without requiring --force', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-agents-'));
    const restoreTty = setMockTty(false);
    const home = join(wd, 'home');
    const restoreHome = setMockHome(home);
    const template = readFileSync(join(process.cwd(), 'templates', 'GEMINI.md'), 'utf-8');
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      const existing = upsertAgentsModelTable(
        addGeneratedAgentsMarker(template),
        {
          frontierModel: 'legacy-frontier',
          sparkModel: 'legacy-spark',
          subagentDefaultModel: 'legacy-frontier',
        },
      );
      await writeFile(join(wd, 'GEMINI.md'), existing);

      const output = await runSetupWithCapturedLogs(wd, {
        scope: 'project',
      });

      const agentsContent = await readFile(join(wd, 'GEMINI.md'), 'utf-8');
      const expectedContext = resolveAgentsModelTableContext(
        await readFile(join(wd, '.gemini', 'config.toml'), 'utf-8'),
        { geminiHomeOverride: join(wd, '.gemini') },
      );

      assert.match(output, /Refreshed AGENTS\.md model capability table in project root\./);
      assert.doesNotMatch(output, /Skipped AGENTS\.md overwrite/);
      assert.match(
        agentsContent,
        new RegExp(`\\| Frontier \\(leader\\) \\| \`${expectedContext.frontierModel}\` \\| high \\|`),
      );
      assert.match(
        agentsContent,
        new RegExp(`\\| Spark \\(explorer\\/fast\\) \\| \`${expectedContext.sparkModel}\` \\| low \\|`),
      );
      assert.match(
        agentsContent,
        new RegExp(String.raw`\| \`executor\` \| \`${expectedContext.frontierModel}\` \| high \| Code implementation, refactoring, feature work`),
      );
      assert.doesNotMatch(agentsContent, /legacy-frontier/);
      assert.doesNotMatch(agentsContent, /legacy-spark/);
    } finally {
      restoreHome();
      restoreTty();
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('refreshes only the explicit OMX-owned model block inside a user-authored GEMINI.md', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-agents-'));
    const restoreTty = setMockTty(false);
    const home = join(wd, 'home');
    const restoreHome = setMockHome(home);
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      const existing = [
        '# Team Instructions',
        '',
        'Keep this custom guidance.',
        '',
        '<!-- OMX:MODELS:START -->',
        '## Model Capability Table',
        '',
        '| Role | Model | Reasoning Effort | Use Case |',
        '| --- | --- | --- | --- |',
        '| Frontier (leader) | `legacy-frontier` | high | stale |',
        '<!-- OMX:MODELS:END -->',
        '',
        'Footer guidance stays user-owned.',
      ].join('\n');
      await writeFile(join(wd, 'GEMINI.md'), existing);

      const output = await runSetupWithCapturedLogs(wd, {
        scope: 'project',
      });

      const agentsContent = await readFile(join(wd, 'GEMINI.md'), 'utf-8');
      const expectedContext = resolveAgentsModelTableContext(
        await readFile(join(wd, '.gemini', 'config.toml'), 'utf-8'),
        { geminiHomeOverride: join(wd, '.gemini') },
      );

      assert.match(output, /Refreshed AGENTS\.md model capability table in project root\./);
      assert.match(agentsContent, /Keep this custom guidance\./);
      assert.match(agentsContent, /Footer guidance stays user-owned\./);
      assert.match(
        agentsContent,
        new RegExp(`\\| Frontier \\(leader\\) \\| \`${expectedContext.frontierModel}\` \\| high \\|`),
      );
      assert.doesNotMatch(agentsContent, /legacy-frontier/);
      assert.doesNotMatch(agentsContent, /<!-- omg:generated:agents-md -->/);
    } finally {
      restoreHome();
      restoreTty();
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('preserves a title-only user-authored GEMINI.md by default when no OMX markers exist', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-agents-'));
    const restoreTty = setMockTty(false);
    const home = join(wd, 'home');
    const restoreHome = setMockHome(home);
    const existing = '# oh-my-gemini - Intelligent Multi-Agent Orchestration\n\nUser-owned guidance.\n';
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      await writeFile(join(wd, 'GEMINI.md'), existing);

      const output = await runSetupWithCapturedLogs(wd, {
        scope: 'project',
      });

      assert.match(output, /Skipped AGENTS\.md overwrite/);
      assert.doesNotMatch(output, /Refreshed AGENTS\.md model capability table/);
      assert.equal(await readFile(join(wd, 'GEMINI.md'), 'utf-8'), existing);
      assert.equal(existsSync(join(wd, '.omg', 'backups', 'setup')), false);
    } finally {
      restoreHome();
      restoreTty();
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('skips overwrite when confirmation is declined', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-agents-'));
    const restoreTty = setMockTty(true);
    const home = join(wd, 'home');
    const restoreHome = setMockHome(home);
    const existing = '# keep this agents file\n';
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      await writeFile(join(wd, 'GEMINI.md'), existing);

      const output = await runSetupWithCapturedLogs(wd, {
        scope: 'project',
        agentsOverwritePrompt: async () => false,
      });

      assert.match(output, /Skipped AGENTS\.md overwrite/);
      assert.match(output, /agents_md: updated=0, unchanged=0, backed_up=0, skipped=1, removed=0/);
      assert.equal(await readFile(join(wd, 'GEMINI.md'), 'utf-8'), existing);
      assert.equal(existsSync(join(wd, '.omg', 'backups', 'setup')), false);
    } finally {
      restoreHome();
      restoreTty();
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('skips overwrite during active session under refresh-first defaults', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-agents-'));
    const restoreTty = setMockTty(true);
    const home = join(wd, 'home');
    const restoreHome = setMockHome(home);
    const existing = '# active session file\n';
    try {
      const pidStartTicks = await readCurrentLinuxStartTicks();
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      await writeFile(join(wd, 'GEMINI.md'), existing);
      await writeFile(
        join(wd, '.omg', 'state', 'session.json'),
        JSON.stringify({
          session_id: 'sess-test',
          started_at: new Date().toISOString(),
          cwd: wd,
          pid: process.pid,
          pid_start_ticks: pidStartTicks,
        }, null, 2)
      );

      const output = await runSetupWithCapturedLogs(wd, {
        scope: 'project',
      });

      assert.match(output, /WARNING: Active omg session detected/);
      assert.match(output, /Skipping AGENTS\.md overwrite to avoid corrupting runtime overlay\./);
      assert.match(output, /Stop the active session first, then re-run setup\./);
      assert.match(output, /agents_md: updated=0, unchanged=0, backed_up=0, skipped=1, removed=0/);
      assert.equal(await readFile(join(wd, 'GEMINI.md'), 'utf-8'), existing);
      assert.equal(existsSync(join(wd, '.omg', 'backups', 'setup')), false);
    } finally {
      restoreHome();
      restoreTty();
      await rm(wd, { recursive: true, force: true });
    }
  });
});
