import { after, before, beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ENV_KEYS = ['GEMINI_HOME', 'TMUX', 'TMUX_PANE', 'PATH'] as const;

const originalFetch = globalThis.fetch;

function writeNotificationConfig(geminiHome: string): void {
  writeFileSync(join(geminiHome, '.omg-config.json'), JSON.stringify({
    notifications: {
      enabled: true,
      webhook: {
        enabled: true,
        url: 'https://example.com/hook',
      },
    },
  }, null, 2));
}

function writeFakeTmux(fakeBinDir: string, output: string): void {
  const tmuxPath = join(fakeBinDir, 'tmux');
  writeFileSync(tmuxPath, `#!/usr/bin/env bash
set -eu
if [[ "$1" == "list-panes" ]]; then
  printf '0 %s\\n' "$PPID"
  exit 0
fi
if [[ "$1" == "capture-pane" ]]; then
  printf '%s\\n' ${JSON.stringify(output)}
  exit 0
fi
exit 2
`);
  chmodSync(tmuxPath, 0o755);
}

describe('notifyLifecycle tmux tail auto-capture', () => {
  let originalEnv: NodeJS.ProcessEnv;
  const geminiHome = mkdtempSync(join(tmpdir(), 'omg-notify-index-gemini-home-'));
  const fakeBinDir = mkdtempSync(join(tmpdir(), 'omg-notify-index-fake-bin-'));

  before(() => {
    originalEnv = { ...process.env };
    process.env.GEMINI_HOME = geminiHome;
    process.env.PATH = `${fakeBinDir}:${originalEnv.PATH || ''}`;
    process.env.TMUX = '/tmp/tmux-1000/default,12345,0';
    process.env.TMUX_PANE = '%42';
  });

  beforeEach(() => {
    process.env.GEMINI_HOME = geminiHome;
    process.env.PATH = `${fakeBinDir}:${originalEnv.PATH || ''}`;
    process.env.TMUX = '/tmp/tmux-1000/default,12345,0';
    process.env.TMUX_PANE = '%42';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  after(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    rmSync(geminiHome, { recursive: true, force: true });
    rmSync(fakeBinDir, { recursive: true, force: true });
  });

  it('does not auto-capture historical tmux tail for terminal notifications', async () => {
    writeFakeTmux(fakeBinDir, 'historical risk line');
    writeNotificationConfig(geminiHome);
    const { notifyLifecycle } = await import('../index.js');

    for (const eventName of ['session-end', 'session-stop'] as const) {
      let capturedBody = '';
      globalThis.fetch = async (_input, init) => {
        capturedBody = typeof init?.body === 'string' ? init.body : '';
        return new Response('', { status: 200 });
      };

      const projectPath = mkdtempSync(join(tmpdir(), `omg-notify-index-project-${eventName}-`));
      const result = await notifyLifecycle(eventName, {
        sessionId: `sess-${eventName}-${Date.now()}`,
        projectPath,
        projectName: 'project',
        reason: 'session_exit',
      });
      rmSync(projectPath, { recursive: true, force: true });

      assert.ok(result);
      assert.equal(result.anySuccess, true);
      const parsed = JSON.parse(capturedBody) as { message: string };
      assert.doesNotMatch(parsed.message, /Recent output:/);
      assert.doesNotMatch(parsed.message, /historical risk line/);
    }
  });

  it('keeps auto-capturing tmux tail for live session-idle notifications', async () => {
    writeFakeTmux(fakeBinDir, 'waiting for live input');

    let capturedBody = '';
    globalThis.fetch = async (_input, init) => {
      capturedBody = typeof init?.body === 'string' ? init.body : '';
      return new Response('', { status: 200 });
    };
    writeNotificationConfig(geminiHome);

    const projectPath = mkdtempSync(join(tmpdir(), 'omg-notify-index-project-idle-'));
    const { notifyLifecycle } = await import('../index.js');
    const result = await notifyLifecycle('session-idle', {
      sessionId: `sess-idle-${Date.now()}`,
      projectPath,
      projectName: 'project',
    });
    rmSync(projectPath, { recursive: true, force: true });

    assert.ok(result);
    assert.equal(result.anySuccess, true);
    const parsed = JSON.parse(capturedBody) as { message: string };
    assert.match(parsed.message, /Recent output:/);
    assert.match(parsed.message, /waiting for live input/);
  });
});
