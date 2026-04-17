import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HUD_TMUX_HEIGHT_LINES } from '../../hud/constants.js';

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

describe('omg launch fallback when tmux is unavailable', () => {
  it('launches gemini directly without tmux ENOENT noise', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-launch-fallback-'));
    try {
      const home = join(wd, 'home');
      const fakeBin = join(wd, 'bin');
      const fakeGeminiPath = join(fakeBin, 'gemini');
      const fakePsPath = join(fakeBin, 'ps');

      await mkdir(home, { recursive: true });
      await mkdir(fakeBin, { recursive: true });
      await writeFile(
        fakeGeminiPath,
        '#!/bin/sh\nprintf \'fake-gemini:%s\\n\' \"$*\"\n',
      );
      await chmod(fakeGeminiPath, 0o755);
      await writeFile(fakePsPath, '#!/bin/sh\nexit 0\n');
      await chmod(fakePsPath, 0o755);

      const result = runOmx(
        wd,
        ['--xhigh', '--madmax'],
        {
          HOME: home,
          PATH: `${fakeBin}:/usr/bin:/bin`,
          OMG_AUTO_UPDATE: '0',
          OMG_NOTIFY_FALLBACK: '0',
          OMG_HOOK_DERIVED_SIGNALS: '0',
        },
      );

      if (shouldSkipForSpawnPermissions(result.error)) return;

      assert.equal(result.status, 0, result.error || result.stderr || result.stdout);
      assert.match(result.stdout, /fake-gemini:.*--dangerously-bypass-approvals-and-sandbox/);
      assert.match(result.stdout, /fake-gemini:.*model_reasoning_effort="xhigh"/);
      assert.doesNotMatch(result.stderr, /spawnSync tmux ENOENT/);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });
});

describe('omg launcher when tmux is available', () => {
  it('launches --madmax through explicitly requested detached tmux so HUD bootstrap can run', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-launch-tmux-'));
    try {
      const home = join(wd, 'home');
      const fakeBin = join(wd, 'bin');
      const fakeGeminiPath = join(fakeBin, 'gemini');
      const fakePsPath = join(fakeBin, 'ps');
      const fakeTmuxPath = join(fakeBin, 'tmux');
      const tmuxLogPath = join(wd, 'tmux.log');

      await mkdir(home, { recursive: true });
      await mkdir(fakeBin, { recursive: true });
      await writeFile(
        fakeGeminiPath,
        '#!/bin/sh\nprintf \'fake-gemini:%s\\n\' \"$*\"\n',
      );
      await chmod(fakeGeminiPath, 0o755);
      await writeFile(fakePsPath, '#!/bin/sh\nexit 0\n');
      await chmod(fakePsPath, 0o755);
      await writeFile(
        fakeTmuxPath,
        `#!/bin/sh
printf 'tmux:%s\n' "$*" >> "${tmuxLogPath}"
case "$1" in
  -V)
    printf 'tmux 3.4\\n'
    exit 0
    ;;
  new-session)
    printf 'leader-pane\\n'
    exit 0
    ;;
  split-window)
    printf 'hud-pane\\n'
    exit 0
    ;;
  display-message)
    if [ "$2" = '-p' ] && [ "$3" = '#{socket_path}' ]; then
      printf '/tmp/tmux-test.sock\\n'
    else
      printf '0\\n'
    fi
    exit 0
    ;;
  show-options)
    printf 'off\\n'
    exit 0
    ;;
  set-option|set-hook|attach-session|kill-session|run-shell|resize-pane)
    exit 0
    ;;
esac
exit 0
`,
      );
      await chmod(fakeTmuxPath, 0o755);

      const result = runOmx(
        wd,
        ['--madmax', '--tmux'],
        {
          HOME: home,
          PATH: `${fakeBin}:/usr/bin:/bin`,
          OMG_AUTO_UPDATE: '0',
          OMG_NOTIFY_FALLBACK: '0',
          OMG_HOOK_DERIVED_SIGNALS: '0',
          TMUX: '',
          TMUX_PANE: '',
        },
      );

      if (shouldSkipForSpawnPermissions(result.error)) return;

      const tmuxLog = await readFile(tmuxLogPath, 'utf-8');
      assert.match(tmuxLog, /tmux:new-session .* -s /);
      assert.match(tmuxLog, new RegExp(`tmux:split-window -v -l ${HUD_TMUX_HEIGHT_LINES} .* -t `));
      assert.equal(result.status, 0, result.error || result.stderr || result.stdout);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('preserves the requested cwd through detached tmux launch when an unsupported SHELL value falls back away from rc-driven cwd drift', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-launch-tmux-cwd-'));
    try {
      const home = join(wd, 'home');
      const fakeBin = join(wd, 'bin');
      const fakeGeminiPath = join(fakeBin, 'gemini');
      const fakePsPath = join(fakeBin, 'ps');
      const fakeTmuxPath = join(fakeBin, 'tmux');
      const tmuxLogPath = join(wd, 'tmux.log');
      const geminiLogPath = join(wd, 'gemini.log');

      await mkdir(home, { recursive: true });
      await mkdir(fakeBin, { recursive: true });
      await writeFile(join(home, '.profile'), 'cd ..\n');
      await writeFile(join(home, '.zshrc'), 'cd ..\n');
      await writeFile(join(home, '.bashrc'), 'cd ..\n');
      await writeFile(
        fakeGeminiPath,
        `#!/bin/sh
printf 'gemini:%s\\n' "$*" >> "${geminiLogPath}"
printf 'gemini-pwd:%s\\n' "$(pwd)" >> "${geminiLogPath}"
exit 0
`,
      );
      await chmod(fakeGeminiPath, 0o755);
      await writeFile(fakePsPath, '#!/bin/sh\nexit 0\n');
      await chmod(fakePsPath, 0o755);
      await writeFile(
        fakeTmuxPath,
        `#!/bin/sh
printf 'tmux:%s\n' "$*" >> "${tmuxLogPath}"
cmd="$1"
shift || true
case "$cmd" in
  -V)
    printf 'tmux 3.4\\n'
    exit 0
    ;;
  new-session)
    for last; do :; done
    if [ -n "\${last:-}" ]; then
      /bin/sh -c "$last"
    fi
    printf 'leader-pane\\n'
    exit 0
    ;;
  split-window)
    printf 'hud-pane\\n'
    exit 0
    ;;
  display-message)
    if [ "$1" = '-p' ] && [ "$2" = '#{socket_path}' ]; then
      printf '/tmp/tmux-test.sock\\n'
    else
      printf '0\\n'
    fi
    exit 0
    ;;
  show-options)
    printf 'off\\n'
    exit 0
    ;;
  set-option|set-hook|attach-session|kill-session|run-shell|resize-pane|select-pane)
    exit 0
    ;;
esac
exit 0
`,
      );
      await chmod(fakeTmuxPath, 0o755);

      const result = runOmx(
        wd,
        ['--madmax', '--tmux'],
        {
          HOME: home,
          SHELL: '/definitely/missing-shell',
          PATH: `${fakeBin}:/usr/bin:/bin`,
          OMG_AUTO_UPDATE: '0',
          OMG_NOTIFY_FALLBACK: '0',
          OMG_HOOK_DERIVED_SIGNALS: '0',
          TMUX: '',
          TMUX_PANE: '',
        },
      );

      if (shouldSkipForSpawnPermissions(result.error)) return;

      const geminiLog = await readFile(geminiLogPath, 'utf-8');
      assert.match(geminiLog, /gemini:.*--dangerously-bypass-approvals-and-sandbox/);
      assert.match(geminiLog, new RegExp(`gemini-pwd:${wd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.equal(result.status, 0, result.error || result.stderr || result.stdout);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('falls back to /bin/sh for detached tmux launch when SHELL drifts to an unsupported path', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-launch-tmux-shell-fallback-'));
    try {
      const home = join(wd, 'home');
      const fakeBin = join(wd, 'bin');
      const fakeGeminiPath = join(fakeBin, 'gemini');
      const fakePsPath = join(fakeBin, 'ps');
      const fakeTmuxPath = join(fakeBin, 'tmux');
      const tmuxLogPath = join(wd, 'tmux.log');
      const geminiLogPath = join(wd, 'gemini.log');

      await mkdir(home, { recursive: true });
      await mkdir(fakeBin, { recursive: true });
      await writeFile(join(home, '.profile'), 'cd ..\n');
      await writeFile(
        fakeGeminiPath,
        `#!/bin/sh
printf 'gemini:%s\\n' "$*" >> "${geminiLogPath}"
printf 'gemini-pwd:%s\\n' "$(pwd)" >> "${geminiLogPath}"
exit 0
`,
      );
      await chmod(fakeGeminiPath, 0o755);
      await writeFile(fakePsPath, '#!/bin/sh\nexit 0\n');
      await chmod(fakePsPath, 0o755);
      await writeFile(
        fakeTmuxPath,
        `#!/bin/sh
printf 'tmux:%s\n' "$*" >> "${tmuxLogPath}"
cmd="$1"
shift || true
case "$cmd" in
  -V)
    printf 'tmux 3.4\\n'
    exit 0
    ;;
  new-session)
    for last; do :; done
    if [ -n "\${last:-}" ]; then
      /bin/sh -c "$last"
    fi
    printf 'leader-pane\\n'
    exit 0
    ;;
  split-window)
    printf 'hud-pane\\n'
    exit 0
    ;;
  display-message)
    if [ "$1" = '-p' ] && [ "$2" = '#{socket_path}' ]; then
      printf '/tmp/tmux-test.sock\\n'
    else
      printf '0\\n'
    fi
    exit 0
    ;;
  show-options)
    printf 'off\\n'
    exit 0
    ;;
  set-option|set-hook|attach-session|kill-session|run-shell|resize-pane|select-pane)
    exit 0
    ;;
esac
exit 0
`,
      );
      await chmod(fakeTmuxPath, 0o755);

      const result = runOmx(
        wd,
        ['--madmax', '--tmux'],
        {
          HOME: home,
          SHELL: '/bin/not-a-real-shell',
          PATH: `${fakeBin}:/usr/bin:/bin`,
          OMG_AUTO_UPDATE: '0',
          OMG_NOTIFY_FALLBACK: '0',
          OMG_HOOK_DERIVED_SIGNALS: '0',
          TMUX: '',
          TMUX_PANE: '',
        },
      );

      if (shouldSkipForSpawnPermissions(result.error)) return;

      const tmuxLog = await readFile(tmuxLogPath, 'utf-8');
      const geminiLog = await readFile(geminiLogPath, 'utf-8');
      assert.match(tmuxLog, /\/bin\/sh/);
      assert.doesNotMatch(tmuxLog, /not-a-real-shell/);
      assert.match(geminiLog, /gemini:.*--dangerously-bypass-approvals-and-sandbox/);
      assert.match(geminiLog, new RegExp(`gemini-pwd:${wd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
      assert.equal(result.status, 0, result.error || result.stderr || result.stdout);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

});
