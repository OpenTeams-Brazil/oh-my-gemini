import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseSessionSearchArgs } from '../session-search.js';

async function writeRollout(
  geminiHomeDir: string,
  isoDate: string,
  fileName: string,
  lines: Array<Record<string, unknown>>,
): Promise<void> {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  const dir = join(geminiHomeDir, 'sessions', year, month, day);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fileName), `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`, 'utf-8');
}

function runOmx(cwd: string, argv: string[], envOverrides: Record<string, string> = {}) {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(testDir, '..', '..', '..');
  const omgBin = join(repoRoot, 'dist', 'cli', 'omg.js');
  const result = spawnSync(process.execPath, [omgBin, ...argv], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, ...envOverrides },
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

describe('parseSessionSearchArgs', () => {
  it('parses query tokens and flags', () => {
    const parsed = parseSessionSearchArgs(['team', 'api', '--limit', '5', '--project=current', '--json']);
    assert.equal(parsed.options.query, 'team api');
    assert.equal(parsed.options.limit, 5);
    assert.equal(parsed.options.project, 'current');
    assert.equal(parsed.json, true);
  });
});

describe('omg session search', () => {
  it('prints structured JSON results for matching transcripts', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'omg-session-search-cli-'));
    const geminiHomeDir = join(cwd, '.gemini-home');
    try {
      await writeRollout(geminiHomeDir, '2026-03-10T12:00:00.000Z', 'rollout-2026-03-10T12-00-00-session-a.jsonl', [
        {
          type: 'session_meta',
          payload: {
            id: 'session-a',
            timestamp: '2026-03-10T12:00:00.000Z',
            cwd,
          },
        },
        {
          type: 'event_msg',
          payload: {
            type: 'user_message',
            message: 'Show previous discussions of team api in recent runs.',
          },
        },
      ]);

      const result = runOmx(cwd, ['session', 'search', 'team api', '--project', 'current', '--json'], {
        GEMINI_HOME: geminiHomeDir,
      });

      assert.equal(result.status, 0, result.stderr || result.stdout);
      const parsed = JSON.parse(result.stdout) as {
        query: string;
        results: Array<{ session_id: string; snippet: string; cwd: string }>;
      };
      assert.equal(parsed.query, 'team api');
      assert.equal(parsed.results.length, 1);
      assert.equal(parsed.results[0].session_id, 'session-a');
      assert.equal(parsed.results[0].cwd, cwd);
      assert.match(parsed.results[0].snippet, /team api/i);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
