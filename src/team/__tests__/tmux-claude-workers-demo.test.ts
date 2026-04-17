import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorkerProcessLaunchSpec,
  resolveTeamWorkerCliPlan,
  translateWorkerLaunchArgsForCli,
} from '../tmux-session.js';

describe('tmux claude workers demo', () => {
  describe('mixed worker CLI map (like demo-team-e2e.sh)', () => {
    it('builds default CLI map with gemini first half, claude second half', () => {
      // Simulates build_default_cli_map from demo-team-e2e.sh
      // Bash: pivot=$(((count + 1) / 2)) -> integer division
      // For 6 workers: ((6 + 1) / 2) = 3 in bash integer arithmetic
      const workerCount = 6;
      const pivot = Math.floor((workerCount + 1) / 2); // 3 workers get gemini, 3 get claude

      const entries: string[] = [];
      for (let i = 1; i <= workerCount; i++) {
        if (i <= pivot) {
          entries.push('gemini');
        } else {
          entries.push('claude');
        }
      }

      // For 6 workers: first 3 gemini, last 3 claude
      assert.deepEqual(entries, ['gemini', 'gemini', 'gemini', 'claude', 'claude', 'claude']);

      // Verify via resolveTeamWorkerCliPlan
      const plan = resolveTeamWorkerCliPlan(workerCount, [], {
        OMG_TEAM_WORKER_CLI_MAP: entries.join(','),
      });

      assert.deepEqual(plan, ['gemini', 'gemini', 'gemini', 'claude', 'claude', 'claude']);
    });

    it('handles odd worker count correctly (5 workers)', () => {
      // 5 workers: first 3 gemini, last 2 claude
      const workerCount = 5;
      const pivot = Math.floor((workerCount + 1) / 2); // 3

      const entries: string[] = [];
      for (let i = 1; i <= workerCount; i++) {
        entries.push(i <= pivot ? 'gemini' : 'claude');
      }

      assert.deepEqual(entries, ['gemini', 'gemini', 'gemini', 'claude', 'claude']);

      const plan = resolveTeamWorkerCliPlan(workerCount, [], {
        OMG_TEAM_WORKER_CLI_MAP: entries.join(','),
      });

      assert.deepEqual(plan, ['gemini', 'gemini', 'gemini', 'claude', 'claude']);
    });

    it('handles even worker count correctly (6 workers)', () => {
      // 6 workers: first 3 gemini, last 3 claude
      const workerCount = 6;
      const pivot = Math.floor((workerCount + 1) / 2); // 3

      const entries: string[] = [];
      for (let i = 1; i <= workerCount; i++) {
        entries.push(i <= pivot ? 'gemini' : 'claude');
      }

      assert.deepEqual(entries, ['gemini', 'gemini', 'gemini', 'claude', 'claude', 'claude']);
    });
  });

  describe('claude worker launch spec', () => {
    it('claude worker uses --dangerously-skip-permissions flag', () => {
      const spec = buildWorkerProcessLaunchSpec(
        'demo-team',
        4,
        ['--model', 'claude-sonnet-4-6'],
        '/tmp/workspace',
        {},
        'claude',
      );

      assert.equal(spec.workerCli, 'claude');
      assert.ok(
        spec.args.includes('--dangerously-skip-permissions'),
        'claude worker must include --dangerously-skip-permissions flag',
      );
    });

    it('claude worker drops gemini-specific flags', () => {
      const geminiArgs = [
        '--model',
        'claude-sonnet-4-6',
        '-c',
        'model_reasoning_effort="low"',
        '--json',
      ];

      const spec = buildWorkerProcessLaunchSpec(
        'demo-team',
        4,
        geminiArgs,
        '/tmp/workspace',
        {},
        'claude',
      );

      // Claude should only have the skip-permissions flag, not gemini-specific args
      assert.equal(spec.workerCli, 'claude');
      assert.deepEqual(spec.args, ['--dangerously-skip-permissions']);

      // Should not include gemini-specific flags
      assert.ok(!spec.args.includes('--model'), 'claude worker should not have --model flag');
      assert.ok(!spec.args.includes('-c'), 'claude worker should not have -c flag');
      assert.ok(!spec.args.includes('--json'), 'claude worker should not have --json flag');
    });

    it('gemini worker preserves launch args', () => {
      const launchArgs = ['--model', 'gpt-5.3-gemini', '--json'];

      const spec = buildWorkerProcessLaunchSpec(
        'demo-team',
        1,
        launchArgs,
        '/tmp/workspace',
        {},
        'gemini',
      );

      assert.equal(spec.workerCli, 'gemini');
      assert.ok(spec.args.includes('--model'));
      assert.ok(spec.args.includes('gpt-5.3-gemini'));
      assert.ok(spec.args.includes('--json'));
    });
  });

  describe('translateWorkerLaunchArgsForCli', () => {
    it('returns gemini args unchanged', () => {
      const args = ['--model', 'gpt-5.3-gemini', '--json'];
      const result = translateWorkerLaunchArgsForCli('gemini', args);
      assert.deepEqual(result, args);
    });

    it('returns only skip-permissions for claude', () => {
      const args = ['--model', 'claude-sonnet-4-6', '-c', 'some=config'];
      const result = translateWorkerLaunchArgsForCli('claude', args);
      assert.deepEqual(result, ['--dangerously-skip-permissions']);
    });

    it('returns gemini approval-mode yolo by default and adds -i when initial prompt is provided', () => {
      const args = ['--model', 'gemini-2.0-pro', '--json'];
      const result = translateWorkerLaunchArgsForCli('gemini', args);
      assert.deepEqual(result, ['--approval-mode', 'yolo', '--model', 'gemini-2.0-pro']);
      assert.deepEqual(
        translateWorkerLaunchArgsForCli('gemini', ['--json'], 'Read worker inbox'),
        ['--approval-mode', 'yolo', '-i', 'Read worker inbox'],
      );
    });
  });

  describe('full demo scenario with 6 mixed workers', () => {
    it('creates correct launch specs for all workers in demo', () => {
      const workerCount = 6;
      const teamName = 'tmux-claude-workers-demo';
      const cwd = '/home/bellman/Workspace/oh-my-gemini';
      const launchArgs = ['--model', 'gpt-5.3-gemini-spark', '-c', 'model_reasoning_effort="low"'];

      // Build CLI map like demo script does
      const pivot = Math.floor((workerCount + 1) / 2);
      const cliMap = Array.from({ length: workerCount }, (_, i) =>
        i + 1 <= pivot ? 'gemini' : 'claude',
      ).join(',');

      const plan = resolveTeamWorkerCliPlan(workerCount, launchArgs, {
        OMG_TEAM_WORKER_CLI_MAP: cliMap,
      });

      // Verify plan matches expected distribution
      // For 6 workers with bash pivot=$((7/2))=3: first 3 gemini, last 3 claude
      assert.deepEqual(plan, ['gemini', 'gemini', 'gemini', 'claude', 'claude', 'claude']);

      // Verify each worker gets correct launch spec
      for (let i = 1; i <= workerCount; i++) {
        const workerCli = plan[i - 1];
        const spec = buildWorkerProcessLaunchSpec(
          teamName,
          i,
          launchArgs,
          cwd,
          { OMG_TEAM_STATE_ROOT: `${cwd}/.omg/state` },
          workerCli,
        );

        // Common assertions for all workers
        assert.equal(spec.workerCli, workerCli);
        assert.equal(spec.env.OMG_TEAM_WORKER, `${teamName}/worker-${i}`);
        assert.ok(spec.env.OMG_LEADER_NODE_PATH, 'OMG_LEADER_NODE_PATH must be set');
        assert.ok(spec.env.OMG_LEADER_CLI_PATH, 'OMG_LEADER_CLI_PATH must be set');
        assert.equal(spec.env.OMG_TEAM_STATE_ROOT, `${cwd}/.omg/state`);

        // CLI-specific assertions
        if (workerCli === 'claude') {
          assert.deepEqual(
            spec.args,
            ['--dangerously-skip-permissions'],
            `worker-${i} (claude) should only have skip-permissions flag`,
          );
        } else {
          assert.ok(
            spec.args.includes('--model'),
            `worker-${i} (gemini) should have --model flag`,
          );
        }
      }
    });

    it('handles auto-resolved claude from launch args', () => {
      // When launch args contain 'claude' in model name and no CLI_MAP is set
      const plan = resolveTeamWorkerCliPlan(2, ['--model', 'claude-sonnet-4-6'], {});

      // Both should resolve to claude because model name contains 'claude'
      assert.deepEqual(plan, ['claude', 'claude']);
    });

    it('handles auto-resolved gemini from launch args', () => {
      // When launch args contain 'gemini' in model name and no CLI_MAP is set
      const plan = resolveTeamWorkerCliPlan(2, ['--model', 'gpt-5.3-gemini'], {});

      // Both should resolve to gemini because model name contains 'gemini' but not 'claude'
      assert.deepEqual(plan, ['gemini', 'gemini']);
    });
  });

  describe('edge cases for mixed worker teams', () => {
    it('handles single worker with claude', () => {
      const plan = resolveTeamWorkerCliPlan(1, [], {
        OMG_TEAM_WORKER_CLI_MAP: 'claude',
      });

      assert.deepEqual(plan, ['claude']);

      const spec = buildWorkerProcessLaunchSpec('team', 1, [], '/tmp', {}, 'claude');
      assert.equal(spec.workerCli, 'claude');
      assert.deepEqual(spec.args, ['--dangerously-skip-permissions']);
    });

    it('handles single worker with gemini', () => {
      const plan = resolveTeamWorkerCliPlan(1, [], {
        OMG_TEAM_WORKER_CLI_MAP: 'gemini',
      });

      assert.deepEqual(plan, ['gemini']);
    });

    it('handles single worker with gemini', () => {
      const plan = resolveTeamWorkerCliPlan(1, [], {
        OMG_TEAM_WORKER_CLI_MAP: 'gemini',
      });
      assert.deepEqual(plan, ['gemini']);

      const spec = buildWorkerProcessLaunchSpec('team', 1, ['--model', 'gemini-2.0-pro'], '/tmp', {}, 'gemini', 'Read worker inbox');
      assert.equal(spec.workerCli, 'gemini');
      assert.deepEqual(spec.args, ['--approval-mode', 'yolo', '-i', 'Read worker inbox', '--model', 'gemini-2.0-pro']);
    });

    it('rejects invalid CLI map with empty entries', () => {
      assert.throws(
        () => resolveTeamWorkerCliPlan(3, [], { OMG_TEAM_WORKER_CLI_MAP: 'gemini,,claude' }),
        /Empty entries are not allowed/,
      );
    });

    it('rejects CLI map with wrong length', () => {
      assert.throws(
        () => resolveTeamWorkerCliPlan(3, [], { OMG_TEAM_WORKER_CLI_MAP: 'gemini,claude' }),
        /expected 1 or 3/,
      );
    });

    it('auto entries in CLI map resolve from launch args', () => {
      const plan = resolveTeamWorkerCliPlan(2, ['--model', 'claude-sonnet'], {
        OMG_TEAM_WORKER_CLI_MAP: 'auto,auto',
      });

      // Both should resolve to claude based on launch args
      assert.deepEqual(plan, ['claude', 'claude']);
    });
  });
});
