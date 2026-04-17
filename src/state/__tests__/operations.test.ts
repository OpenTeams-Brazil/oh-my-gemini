import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { executeStateOperation } from '../operations.js';

async function withAmbientTmuxEnv<T>(env: NodeJS.ProcessEnv, run: () => Promise<T>): Promise<T> {
  const previousTmux = process.env.TMUX;
  const previousTmuxPane = process.env.TMUX_PANE;
  const previousPath = process.env.PATH;

  if (typeof env.TMUX === 'string') process.env.TMUX = env.TMUX;
  else delete process.env.TMUX;
  if (typeof env.TMUX_PANE === 'string') process.env.TMUX_PANE = env.TMUX_PANE;
  else delete process.env.TMUX_PANE;
  if (typeof env.PATH === 'string') process.env.PATH = env.PATH;
  else if ('PATH' in env) delete process.env.PATH;

  try {
    return await run();
  } finally {
    if (typeof previousTmux === 'string') process.env.TMUX = previousTmux;
    else delete process.env.TMUX;
    if (typeof previousTmuxPane === 'string') process.env.TMUX_PANE = previousTmuxPane;
    else delete process.env.TMUX_PANE;
    if (typeof previousPath === 'string') process.env.PATH = previousPath;
    else delete process.env.PATH;
  }
}

async function createFakeTmuxBin(wd: string): Promise<string> {
  const fakeBin = join(wd, 'bin');
  await mkdir(fakeBin, { recursive: true });
  const tmuxPath = join(fakeBin, 'tmux');
  await writeFile(
    tmuxPath,
    `#!/usr/bin/env bash
set -eu
cmd="\${1:-}"
shift || true
if [[ "$cmd" == "display-message" ]]; then
  target=""
  format=""
  while (($#)); do
    case "$1" in
      -p) shift ;;
      -t) target="$2"; shift 2 ;;
      *) format="$1"; shift ;;
    esac
  done
  if [[ -z "$target" && "$format" == "#{pane_id}" ]]; then
    echo "%777"
    exit 0
  fi
  if [[ -z "$target" && "$format" == "#S" ]]; then
    echo "maintainer-default"
    exit 0
  fi
  if [[ "$target" == "%777" && "$format" == "#{pane_id}" ]]; then
    echo "%777"
    exit 0
  fi
  if [[ "$target" == "%777" && "$format" == "#S" ]]; then
    echo "maintainer-default"
    exit 0
  fi
fi
if [[ "$cmd" == "list-sessions" ]]; then
  echo "maintainer-default"
  exit 0
fi
exit 1
`,
  );
  await chmod(tmuxPath, 0o755);
  return fakeBin;
}

describe('state operations directory initialization', () => {
  it('creates .omg/state for state operations without setup', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-test-'));
    try {
      const stateDir = join(wd, '.omg', 'state');
      const tmuxHookConfig = join(wd, '.omg', 'tmux-hook.json');
      assert.equal(existsSync(stateDir), false);
      assert.equal(existsSync(tmuxHookConfig), false);

      const response = await executeStateOperation('state_list_active', {
        workingDirectory: wd,
      });

      assert.equal(existsSync(stateDir), true);
      assert.equal(existsSync(tmuxHookConfig), true);
      assert.deepEqual(response.payload, { active_modes: [] });
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('bootstraps tmux-hook from the current tmux pane when available', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-live-'));
    try {
      const tmuxHookConfig = join(wd, '.omg', 'tmux-hook.json');
      const fakeBin = await createFakeTmuxBin(wd);

      await withAmbientTmuxEnv(
        {
          TMUX: '/tmp/maintainer-default,123,0',
          TMUX_PANE: '%777',
          PATH: `${fakeBin}:${process.env.PATH || ''}`,
        },
        async () => {
          const response = await executeStateOperation('state_list_active', {
            workingDirectory: wd,
          });
          assert.deepEqual(response.payload, { active_modes: [] });
        },
      );

      const tmuxConfig = JSON.parse(await readFile(tmuxHookConfig, 'utf-8')) as {
        target?: { type?: string; value?: string };
      };
      assert.deepEqual(tmuxConfig.target, { type: 'pane', value: '%777' });
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('writes and reads deep-interview state', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-readwrite-'));
    try {
      const writeResponse = await executeStateOperation('state_write', {
        workingDirectory: wd,
        mode: 'deep-interview',
        active: true,
        current_phase: 'deep-interview',
        state: {
          current_focus: 'intent',
          threshold: 0.2,
        },
      });

      assert.equal(writeResponse.isError, undefined);
      assert.deepEqual(writeResponse.payload, {
        success: true,
        mode: 'deep-interview',
        path: join(wd, '.omg', 'state', 'deep-interview-state.json'),
      });

      const readResponse = await executeStateOperation('state_read', {
        workingDirectory: wd,
        mode: 'deep-interview',
      });

      assert.equal(readResponse.isError, undefined);
      const readBody = readResponse.payload as Record<string, unknown>;
      assert.equal(readBody.active, true);
      assert.equal(readBody.current_phase, 'deep-interview');
      assert.equal(readBody.current_focus, 'intent');
      assert.equal(readBody.threshold, 0.2);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('writes and reads autoresearch state', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-autoresearch-'));
    try {
      const writeResponse = await executeStateOperation('state_write', {
        workingDirectory: wd,
        mode: 'autoresearch',
        active: true,
        current_phase: 'running',
      });

      assert.equal(writeResponse.isError, undefined);
      assert.deepEqual(writeResponse.payload, {
        success: true,
        mode: 'autoresearch',
        path: join(wd, '.omg', 'state', 'autoresearch-state.json'),
      });

      const readResponse = await executeStateOperation('state_read', {
        workingDirectory: wd,
        mode: 'autoresearch',
      });

      assert.equal(readResponse.isError, undefined);
      const readBody = readResponse.payload as Record<string, unknown>;
      assert.equal(readBody.active, true);
      assert.equal(readBody.current_phase, 'running');
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('creates session-scoped state directory when session_id is provided', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-session-'));
    try {
      const sessionDir = join(wd, '.omg', 'state', 'sessions', 'sess1');
      assert.equal(existsSync(sessionDir), false);

      const response = await executeStateOperation('state_get_status', {
        workingDirectory: wd,
        session_id: 'sess1',
      });

      assert.equal(existsSync(sessionDir), true);
      assert.deepEqual(response.payload, { statuses: {} });
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('serializes concurrent state_write calls per mode file and preserves merged fields', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-concurrency-'));
    try {
      const writes = Array.from({ length: 16 }, (_, i) =>
        executeStateOperation('state_write', {
          workingDirectory: wd,
          mode: 'team',
          state: { [`k${i}`]: i },
        }),
      );

      const responses = await Promise.all(writes);
      for (const response of responses) {
        assert.equal(response.isError, undefined);
      }

      const filePath = join(wd, '.omg', 'state', 'team-state.json');
      const state = JSON.parse(await readFile(filePath, 'utf-8')) as Record<string, unknown>;
      for (let i = 0; i < 16; i++) {
        assert.equal(state[`k${i}`], i);
      }
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('syncs canonical skill-active state for tracked mode writes and clears', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-canonical-'));
    try {
      await executeStateOperation('state_write', {
        workingDirectory: wd,
        session_id: 'sess-sync',
        mode: 'autoresearch',
        active: true,
        current_phase: 'running',
      });

      const canonicalPath = join(wd, '.omg', 'state', 'sessions', 'sess-sync', 'skill-active-state.json');
      const canonical = JSON.parse(await readFile(canonicalPath, 'utf-8')) as {
        active_skills?: Array<{
          skill: string;
          phase?: string;
          session_id?: string;
          activated_at?: string;
          updated_at?: string;
        }>;
      };
      assert.deepEqual(canonical.active_skills, [{
        skill: 'autoresearch',
        phase: 'running',
        active: true,
        activated_at: canonical.active_skills?.[0]?.activated_at,
        updated_at: canonical.active_skills?.[0]?.updated_at,
        session_id: 'sess-sync',
      }]);

      await executeStateOperation('state_clear', {
        workingDirectory: wd,
        session_id: 'sess-sync',
        mode: 'autoresearch',
      });

      const cleared = JSON.parse(await readFile(canonicalPath, 'utf-8')) as {
        active: boolean;
        active_skills?: unknown[];
      };
      assert.equal(cleared.active, false);
      assert.deepEqual(cleared.active_skills, []);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('denies unsupported overlaps without writing the requested mode state', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-deny-overlap-'));
    try {
      const existing = await executeStateOperation('state_write', {
        workingDirectory: wd,
        session_id: 'sess-deny',
        mode: 'team',
        active: true,
        current_phase: 'running',
      });
      assert.equal(existing.isError, undefined);

      const denied = await executeStateOperation('state_write', {
        workingDirectory: wd,
        session_id: 'sess-deny',
        mode: 'autopilot',
        active: true,
        current_phase: 'planning',
      });

      assert.equal(denied.isError, true);
      assert.match(String((denied.payload as { error?: string }).error || ''), /Unsupported workflow overlap: team \+ autopilot\./);
      assert.equal(existsSync(join(wd, '.omg', 'state', 'sessions', 'sess-deny', 'autopilot-state.json')), false);

      const canonical = JSON.parse(
        await readFile(join(wd, '.omg', 'state', 'sessions', 'sess-deny', 'skill-active-state.json'), 'utf-8'),
      ) as { active_skills?: Array<{ skill: string }> };
      assert.deepEqual(canonical.active_skills?.map((entry) => entry.skill), ['team']);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('does not auto-complete existing workflow state when tracked write validation fails', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-validate-before-transition-'));
    try {
      const sessionDir = join(wd, '.omg', 'state', 'sessions', 'sess-invalid');
      await mkdir(sessionDir, { recursive: true });
      await writeFile(
        join(sessionDir, 'ralplan-state.json'),
        JSON.stringify({ active: true, mode: 'ralplan', current_phase: 'planning' }, null, 2),
      );

      const denied = await executeStateOperation('state_write', {
        workingDirectory: wd,
        session_id: 'sess-invalid',
        mode: 'ralph',
        active: true,
        current_phase: 'definitely-invalid',
      });

      assert.equal(denied.isError, true);
      assert.match(String((denied.payload as { error?: string }).error || ''), /ralph\.current_phase/i);

      const ralplanState = JSON.parse(
        await readFile(join(sessionDir, 'ralplan-state.json'), 'utf-8'),
      ) as Record<string, unknown>;
      assert.equal(ralplanState.active, true);
      assert.equal(ralplanState.current_phase, 'planning');
      assert.equal(existsSync(join(sessionDir, 'ralph-state.json')), false);
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('keeps session-scoped tracked state writable after root-state parse fallback on resume', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-state-ops-resume-root-fallback-'));
    try {
      const stateDir = join(wd, '.omg', 'state');
      const sessionId = 'sess-resume-root-fallback';
      const sessionDir = join(stateDir, 'sessions', sessionId);
      await mkdir(sessionDir, { recursive: true });
      await writeFile(join(stateDir, 'session.json'), JSON.stringify({ session_id: sessionId }, null, 2));
      await writeFile(
        join(stateDir, 'ralph-state.json'),
        JSON.stringify({
          active: true,
          current_phase: 'executing',
          owner_omg_session_id: 'stale-root-owner',
        }, null, 2),
      );
      await writeFile(
        join(sessionDir, 'ralph-state.json'),
        JSON.stringify({
          active: true,
          current_phase: 'executing',
          owner_omg_session_id: sessionId,
        }, null, 2),
      );

      const writeResult = await executeStateOperation('state_write', {
        workingDirectory: wd,
        mode: 'ralph',
        state: {
          current_phase: 'verify',
        },
      });

      assert.equal(writeResult.isError, undefined);
      const sessionState = JSON.parse(
        await readFile(join(sessionDir, 'ralph-state.json'), 'utf-8'),
      ) as Record<string, unknown>;
      assert.equal(sessionState.active, true);
      assert.equal(sessionState.current_phase, 'verifying');
      assert.equal(sessionState.owner_omg_session_id, sessionId);

      const rootState = JSON.parse(
        await readFile(join(stateDir, 'ralph-state.json'), 'utf-8'),
      ) as Record<string, unknown>;
      assert.equal(rootState.current_phase, 'executing');
      assert.equal(rootState.owner_omg_session_id, 'stale-root-owner');
    } finally {
      await rm(wd, { recursive: true, force: true });
    }
  });
});
