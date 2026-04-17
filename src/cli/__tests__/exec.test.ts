import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    env: {
      ...process.env,
      OMX_MODEL_INSTRUCTIONS_FILE: '',
      OMX_TEAM_WORKER: '',
      OMX_TEAM_STATE_ROOT: '',
      OMX_TEAM_LEADER_CWD: '',
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

describe('omg exec', () => {
  it('runs codex exec with session-scoped instructions that preserve AGENTS and overlay content', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-exec-cli-'));
    try {
      const home = join(wd, 'home');
      const fakeBin = join(wd, 'bin');
      const fakeGeminiPath = join(fakeBin, 'codex');
      const fakePsPath = join(fakeBin, 'ps');

      await mkdir(join(home, '.gemini'), { recursive: true });
      await mkdir(fakeBin, { recursive: true });
      await writeFile(join(home, '.gemini', 'GEMINI.md'), '# User Instructions\n\nGlobal guidance.\n');
      await writeFile(join(wd, 'GEMINI.md'), '# Project Instructions\n\nProject guidance.\n');
      await writeFile(
        fakeGeminiPath,
        [
          '#!/bin/sh',
          'printf \'fake-codex:%s\\n\' "$*"',
          'for arg in "$@"; do',
          '  case "$arg" in',
          '    model_instructions_file=*)',
          '      file=$(printf %s "$arg" | sed \'s/^model_instructions_file="//; s/"$//\')',
          '      printf \'instructions-path:%s\\n\' "$file"',
          '      printf \'instructions-start\\n\'',
          '      cat "$file"',
          '      printf \'instructions-end\\n\'',
          '      ;;',
          '  esac',
          'done',
        ].join('\n'),
      );
      await chmod(fakeGeminiPath, 0o755);
      await writeFile(fakePsPath, '#!/bin/sh\nexit 0\n');
      await chmod(fakePsPath, 0o755);

      const result = runOmx(wd, ['exec', '--model', 'gpt-5', 'say hi'], {
        HOME: home,
        NODE_OPTIONS: '',
        PATH: `${fakeBin}:/usr/bin:/bin`,
        OMX_AUTO_UPDATE: '0',
        OMX_NOTIFY_FALLBACK: '0',
        OMX_HOOK_DERIVED_SIGNALS: '0',
      });

      assert.equal(result.status, 0, result.error || result.stderr || result.stdout);
      assert.match(result.stdout, /fake-codex:exec --model gpt-5 say hi /);
      assert.match(result.stdout, /instructions-path:.*\/\.omg\/state\/sessions\/omg-.*\/AGENTS\.md/);
      assert.match(result.stdout, /# User Instructions/);
      assert.match(result.stdout, /# Project Instructions/);
      assert.match(result.stdout, /<!-- OMX:RUNTIME:START -->/);

      const sessionRoot = join(wd, '.omg', 'state', 'sessions');
      const sessionEntries = await readdir(sessionRoot);
      assert.equal(sessionEntries.length, 1);
      const sessionFiles = await readdir(join(sessionRoot, sessionEntries[0]));
      assert.equal(sessionFiles.includes('GEMINI.md'), false, 'session-scoped AGENTS file should be cleaned up after exec exits');
      assert.equal(existsSync(join(wd, '.omg', 'state', 'session.json')), false);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('passes exec --help through to codex exec', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-exec-help-'));
    try {
      const home = join(wd, 'home');
      const fakeBin = join(wd, 'bin');
      const fakeGeminiPath = join(fakeBin, 'codex');
      const fakePsPath = join(fakeBin, 'ps');

      await mkdir(home, { recursive: true });
      await mkdir(fakeBin, { recursive: true });
      await writeFile(fakeGeminiPath, '#!/bin/sh\nprintf \'fake-codex:%s\\n\' \"$*\"\n');
      await chmod(fakeGeminiPath, 0o755);
      await writeFile(fakePsPath, '#!/bin/sh\nexit 0\n');
      await chmod(fakePsPath, 0o755);

      const result = runOmx(wd, ['exec', '--help'], {
        HOME: home,
        NODE_OPTIONS: '',
        PATH: `${fakeBin}:/usr/bin:/bin`,
        OMX_AUTO_UPDATE: '0',
        OMX_NOTIFY_FALLBACK: '0',
        OMX_HOOK_DERIVED_SIGNALS: '0',
      });

      assert.equal(result.status, 0, result.error || result.stderr || result.stdout);
      assert.match(result.stdout, /fake-codex:exec --help\b/);
      assert.doesNotMatch(result.stdout, /oh-my-gemini \(omg\) - Multi-agent orchestration for Gemini CLI/i);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });
});
