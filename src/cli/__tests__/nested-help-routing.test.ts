import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function runOmx(cwd: string, argv: string[]) {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(testDir, '..', '..', '..');
  const omgBin = join(repoRoot, 'dist', 'cli', 'omg.js');
  return spawnSync(process.execPath, [omgBin, ...argv], {
    cwd,
    encoding: 'utf-8',
    env: {
      ...process.env,
      OMG_AUTO_UPDATE: '0',
      OMG_NOTIFY_FALLBACK: '0',
      OMG_HOOK_DERIVED_SIGNALS: '0',
    },
  });
}

describe('nested help routing', () => {
  for (const [argv, expectedUsage] of [
    [['adapt', '--help'], /Usage:\s*omg adapt <target> <probe\|status\|init\|envelope\|doctor>/i],
    [['ask', '--help'], /Usage:\s*omg ask <claude\|gemini> <question or task>/i],
    [['autoresearch', '--help'], /Usage:[\s\S]*omg autoresearch <mission-dir>/i],
    [['hud', '--help'], /Usage:\s*\n\s*omg hud\s+Show current HUD state/i],
    [['hooks', '--help'], /Usage:\s*\n\s*omg hooks init/i],
    [['state', '--help'], /Usage:\s*omg state <read\|write\|clear\|list-active\|get-status>/i],
    [['tmux-hook', '--help'], /Usage:\s*\n\s*omg tmux-hook init/i],
    [['ralph', '--help'], /omg ralph - Launch Gemini with ralph persistence mode active/i],
  ] satisfies Array<[string[], RegExp]>) {
    it(`routes ${argv.join(' ')} to command-local help`, async () => {
      const cwd = await mkdtemp(join(tmpdir(), 'omg-nested-help-'));
      try {
        const result = runOmx(cwd, argv);
        assert.equal(result.status, 0, result.stderr || result.stdout);
        assert.match(result.stdout, expectedUsage);
        assert.doesNotMatch(result.stdout, /oh-my-gemini \(omg\) - Multi-agent orchestration for Gemini CLI/i);
      } finally {
        await rm(cwd, { recursive: true, force: true });
      }
    });
  }

  it('routes `omg state read` through the top-level CLI', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'omg-state-route-'));
    try {
      const result = runOmx(cwd, ['state', 'read', '--input', '{"mode":"ralph"}', '--json']);
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(result.stdout.trim(), /^\{"exists":false,"mode":"ralph"\}$/);
      assert.doesNotMatch(result.stdout, /Unknown command: state/i);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
