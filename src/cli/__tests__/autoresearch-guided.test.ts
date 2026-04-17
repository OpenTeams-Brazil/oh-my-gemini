import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseSandboxContract } from '../../autoresearch/contracts.js';
import {
  isLaunchReadyEvaluatorCommand,
  resolveAutoresearchDeepInterviewResult,
  writeAutoresearchDeepInterviewArtifacts,
  writeAutoresearchDraftArtifact,
} from '../autoresearch-intake.js';
import {
  buildAutoresearchDeepInterviewPrompt,
  initAutoresearchMission,
  parseInitArgs,
  checkTmuxAvailable,
  runAutoresearchNoviceBridge,
  spawnAutoresearchTmux,
  type AutoresearchQuestionIO,
} from '../autoresearch-guided.js';
import { OMG_ENTRY_PATH_ENV, OMG_STARTUP_CWD_ENV } from '../../utils/paths.js';

async function initRepo(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'omg-autoresearch-guided-test-'));
  execFileSync('git', ['init'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd, stdio: 'ignore' });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(join(cwd, 'README.md'), 'hello\n', 'utf-8');
  execFileSync('git', ['add', 'README.md'], { cwd, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'init'], { cwd, stdio: 'ignore' });
  return cwd;
}

function withMockedTty<T>(fn: () => Promise<T>): Promise<T> {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: true });
  return fn().finally(() => {
    if (descriptor) {
      Object.defineProperty(process.stdin, 'isTTY', descriptor);
    } else {
      Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: false });
    }
  });
}

function makeFakeIo(answers: string[]): AutoresearchQuestionIO {
  const queue = [...answers];
  return {
    async question(): Promise<string> {
      return queue.shift() ?? '';
    },
    close(): void {},
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('initAutoresearchMission', () => {
  it('creates mission.md with correct content', async () => {
    const repo = await initRepo();
    try {
      const result = await initAutoresearchMission({
        topic: 'Improve test coverage for the auth module',
        evaluatorCommand: 'node scripts/eval.js',
        keepPolicy: 'score_improvement',
        slug: 'auth-coverage',
        repoRoot: repo,
      });

      assert.equal(result.slug, 'auth-coverage');
      assert.equal(result.missionDir, join(repo, 'missions', 'auth-coverage'));

      const missionContent = await readFile(join(result.missionDir, 'mission.md'), 'utf-8');
      assert.match(missionContent, /# Mission/);
      assert.match(missionContent, /Improve test coverage for the auth module/);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('creates sandbox.md with valid YAML frontmatter', async () => {
    const repo = await initRepo();
    try {
      const result = await initAutoresearchMission({
        topic: 'Optimize database queries',
        evaluatorCommand: 'node scripts/eval-perf.js',
        keepPolicy: 'pass_only',
        slug: 'db-perf',
        repoRoot: repo,
      });

      const sandboxContent = await readFile(join(result.missionDir, 'sandbox.md'), 'utf-8');
      assert.match(sandboxContent, /^---\n/);
      assert.match(sandboxContent, /evaluator:/);
      assert.match(sandboxContent, /command: node scripts\/eval-perf\.js/);
      assert.match(sandboxContent, /format: json/);
      assert.match(sandboxContent, /keep_policy: pass_only/);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('generated sandbox.md passes parseSandboxContract validation', async () => {
    const repo = await initRepo();
    try {
      const result = await initAutoresearchMission({
        topic: 'Fix flaky tests',
        evaluatorCommand: 'bash run-tests.sh',
        keepPolicy: 'score_improvement',
        slug: 'flaky-tests',
        repoRoot: repo,
      });

      const sandboxContent = await readFile(join(result.missionDir, 'sandbox.md'), 'utf-8');
      const parsed = parseSandboxContract(sandboxContent);
      assert.equal(parsed.evaluator.command, 'bash run-tests.sh');
      assert.equal(parsed.evaluator.format, 'json');
      assert.equal(parsed.evaluator.keep_policy, 'score_improvement');
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('throws if mission directory already exists', async () => {
    const repo = await initRepo();
    try {
      const missionDir = join(repo, 'missions', 'existing');
      await mkdir(missionDir, { recursive: true });

      await assert.rejects(
        () => initAutoresearchMission({
          topic: 'duplicate',
          evaluatorCommand: 'echo ok',
          keepPolicy: 'pass_only',
          slug: 'existing',
          repoRoot: repo,
        }),
        /already exists/,
      );
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });
});

describe('parseInitArgs', () => {
  it('parses all flags with space-separated values', () => {
    const result = parseInitArgs([
      '--topic', 'my topic',
      '--evaluator', 'node eval.js',
      '--keep-policy', 'pass_only',
      '--slug', 'my-slug',
    ]);
    assert.equal(result.topic, 'my topic');
    assert.equal(result.evaluatorCommand, 'node eval.js');
    assert.equal(result.keepPolicy, 'pass_only');
    assert.equal(result.slug, 'my-slug');
  });

  it('parses all flags with = syntax', () => {
    const result = parseInitArgs([
      '--topic=my topic',
      '--evaluator=node eval.js',
      '--keep-policy=score_improvement',
      '--slug=my-slug',
    ]);
    assert.equal(result.topic, 'my topic');
    assert.equal(result.evaluatorCommand, 'node eval.js');
    assert.equal(result.keepPolicy, 'score_improvement');
    assert.equal(result.slug, 'my-slug');
  });

  it('returns partial result when some flags are missing', () => {
    const result = parseInitArgs(['--topic', 'my topic']);
    assert.equal(result.topic, 'my topic');
    assert.equal(result.evaluatorCommand, undefined);
    assert.equal(result.keepPolicy, undefined);
    assert.equal(result.slug, undefined);
  });

  it('throws on invalid keep-policy', () => {
    assert.throws(
      () => parseInitArgs(['--keep-policy', 'invalid']),
      /must be one of/,
    );
  });

  it('throws on unknown flags', () => {
    assert.throws(
      () => parseInitArgs(['--unknown-flag', 'value']),
      /Unknown init flag: --unknown-flag/,
    );
  });

  it('sanitizes slug via slugifyMissionName', () => {
    const result = parseInitArgs(['--slug', '../../etc/cron.d/omg']);
    assert.ok(result.slug);
    assert.doesNotMatch(result.slug!, /\.\./);
    assert.doesNotMatch(result.slug!, /\//);
  });
});

describe('checkTmuxAvailable', () => {
  it('returns a boolean', () => {
    const result = checkTmuxAvailable();
    assert.equal(typeof result, 'boolean');
  });

  it('launches background tmux sessions with an absolute omg entry path even from a relative launcher', async () => {
    const repo = await initRepo();
    const fakeBin = await mkdtemp(join(tmpdir(), 'omg-autoresearch-guided-bin-'));
    const startupCwd = await mkdtemp(join(tmpdir(), 'omg-autoresearch-guided-start-'));
    const missionDir = join(repo, 'missions', 'demo');
    const tmuxLog = join(repo, 'tmux.log');
    const previousPath = process.env.PATH;
    const previousEntryPath = process.env[OMG_ENTRY_PATH_ENV];
    const previousStartupCwd = process.env[OMG_STARTUP_CWD_ENV];

    try {
      await mkdir(missionDir, { recursive: true });
      const launcherDir = join(startupCwd, 'dist', 'cli');
      const launcherPath = join(launcherDir, 'omg.js');
      await mkdir(launcherDir, { recursive: true });
      await writeFile(launcherPath, '#!/usr/bin/env node\n', 'utf-8');

      const fakeTmuxPath = join(fakeBin, 'tmux');
      await writeFile(
        fakeTmuxPath,
        `#!/bin/sh
printf '%s\n' "$*" >>"${tmuxLog}"
case "$1" in
  -V)
    exit 0
    ;;
  has-session)
    exit 1
    ;;
  new-session)
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
`,
        'utf-8',
      );
      execFileSync('chmod', ['+x', fakeTmuxPath], { stdio: 'ignore' });

      process.env.PATH = `${fakeBin}:${previousPath || ''}`;
      delete process.env[OMG_ENTRY_PATH_ENV];
      process.env[OMG_STARTUP_CWD_ENV] = startupCwd;

      const previousArgv = process.argv;
      process.argv = [previousArgv[0] || 'node', 'dist/cli/omg.js'];
      try {
        spawnAutoresearchTmux(missionDir, 'demo');
      } finally {
        process.argv = previousArgv;
      }

      const tmuxOutput = await readFile(tmuxLog, 'utf-8');
      assert.match(tmuxOutput, /new-session -d -s omg-autoresearch-demo/);
      assert.match(tmuxOutput, new RegExp(escapeRegExp(launcherPath)));
      assert.doesNotMatch(tmuxOutput, /dist\/cli\/omg\.js autoresearch/);
    } finally {
      if (typeof previousPath === 'string') process.env.PATH = previousPath;
      else delete process.env.PATH;
      if (typeof previousEntryPath === 'string') process.env[OMG_ENTRY_PATH_ENV] = previousEntryPath;
      else delete process.env[OMG_ENTRY_PATH_ENV];
      if (typeof previousStartupCwd === 'string') process.env[OMG_STARTUP_CWD_ENV] = previousStartupCwd;
      else delete process.env[OMG_STARTUP_CWD_ENV];
      await rm(repo, { recursive: true, force: true });
      await rm(fakeBin, { recursive: true, force: true });
      await rm(startupCwd, { recursive: true, force: true });
    }
  });
});

describe('autoresearch intake draft artifacts', () => {
  it('writes a canonical deep-interview autoresearch draft artifact from vague input', async () => {
    const repo = await initRepo();
    try {
      const artifact = await writeAutoresearchDraftArtifact({
        repoRoot: repo,
        topic: 'Improve onboarding for first-time contributors',
        keepPolicy: 'score_improvement',
        seedInputs: { topic: 'Improve onboarding for first-time contributors' },
      });

      assert.match(artifact.path, /\.omg\/specs\/deep-interview-autoresearch-improve-onboarding-for-first-time-contributors\.md$/);
      assert.equal(artifact.launchReady, false);
      assert.match(artifact.content, /## Mission Draft/);
      assert.match(artifact.content, /## Evaluator Draft/);
      assert.match(artifact.content, /## Launch Readiness/);
      assert.match(artifact.content, /## Seed Inputs/);
      assert.match(artifact.content, /## Confirmation Bridge/);
      assert.match(artifact.content, /TODO replace with evaluator command/i);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('rejects placeholder evaluator commands and accepts concrete commands', () => {
    assert.equal(isLaunchReadyEvaluatorCommand('TODO replace me'), false);
    assert.equal(isLaunchReadyEvaluatorCommand('node scripts/eval.js'), true);
    assert.equal(isLaunchReadyEvaluatorCommand('bash scripts/eval.sh'), true);
  });

  it('writes launch-consumable mission/sandbox/result artifacts and resolves them back', async () => {
    const repo = await initRepo();
    try {
      const artifacts = await writeAutoresearchDeepInterviewArtifacts({
        repoRoot: repo,
        topic: 'Measure onboarding friction',
        evaluatorCommand: 'node scripts/eval.js',
        keepPolicy: 'pass_only',
        slug: 'onboarding-friction',
        seedInputs: { topic: 'Measure onboarding friction' },
      });

      assert.match(artifacts.draftArtifactPath, /deep-interview-autoresearch-onboarding-friction\.md$/);
      assert.match(artifacts.missionArtifactPath, /autoresearch-onboarding-friction\/mission\.md$/);
      assert.match(artifacts.sandboxArtifactPath, /autoresearch-onboarding-friction\/sandbox\.md$/);
      assert.match(artifacts.resultPath, /autoresearch-onboarding-friction\/result\.json$/);

      const resolved = await resolveAutoresearchDeepInterviewResult(repo, { slug: 'onboarding-friction' });
      assert.ok(resolved);
      assert.equal(resolved?.compileTarget.slug, 'onboarding-friction');
      assert.equal(resolved?.compileTarget.keepPolicy, 'pass_only');
      assert.equal(resolved?.launchReady, true);
      assert.match(resolved?.missionContent || '', /Measure onboarding friction/);
      assert.match(resolved?.sandboxContent || '', /command: node scripts\/eval\.js/);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });
});

describe('buildAutoresearchDeepInterviewPrompt', () => {
  it('activates deep-interview --autoresearch and includes seed inputs', () => {
    const prompt = buildAutoresearchDeepInterviewPrompt({
      topic: 'Investigate flaky tests',
      evaluatorCommand: 'node scripts/eval.js',
      keepPolicy: 'score_improvement',
      slug: 'flaky-tests',
    });

    assert.match(prompt, /\$deep-interview --autoresearch/);
    assert.match(prompt, /deep-interview-autoresearch-\{slug\}\.md/);
    assert.match(prompt, /autoresearch-\{slug\}\/mission\.md/);
    assert.match(prompt, /- topic: Investigate flaky tests/);
    assert.match(prompt, /- evaluator: node scripts\/eval\.js/);
    assert.match(prompt, /- keep_policy: score_improvement/);
    assert.match(prompt, /- slug: flaky-tests/);
  });
});

describe('runAutoresearchNoviceBridge', () => {
  it('loops through refine further before launching and writes draft + mission files', async () => {
    const repo = await initRepo();
    try {
      const result = await withMockedTty(() => runAutoresearchNoviceBridge(
        repo,
        {},
        makeFakeIo([
          'Improve evaluator UX',
          'Make success measurable',
          'TODO replace with evaluator command',
          'score_improvement',
          'ux-eval',
          'refine further',
          'Improve evaluator UX',
          'Passing evaluator output',
          'node scripts/eval.js',
          'pass_only',
          'ux-eval',
          'launch',
        ]),
      ));

      const draftContent = await readFile(join(repo, '.omg', 'specs', 'deep-interview-autoresearch-ux-eval.md'), 'utf-8');
      const resultContent = await readFile(join(repo, '.omg', 'specs', 'autoresearch-ux-eval', 'result.json'), 'utf-8');
      const missionContent = await readFile(join(result.missionDir, 'mission.md'), 'utf-8');
      const sandboxContent = await readFile(join(result.missionDir, 'sandbox.md'), 'utf-8');

      assert.equal(result.slug, 'ux-eval');
      assert.match(draftContent, /Launch-ready: yes/);
      assert.match(resultContent, /"launchReady": true/);
      assert.match(missionContent, /Improve evaluator UX/);
      assert.match(sandboxContent, /command: node scripts\/eval\.js/);
      assert.match(sandboxContent, /keep_policy: pass_only/);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  it('uses seeded novice inputs while still requiring confirmation-driven launch', async () => {
    const repo = await initRepo();
    try {
      const result = await withMockedTty(() => runAutoresearchNoviceBridge(
        repo,
        {
          topic: 'Seeded topic',
          evaluatorCommand: 'node scripts/eval.js',
          keepPolicy: 'score_improvement',
          slug: 'seeded-topic',
        },
        makeFakeIo([
          '',
          '',
          '',
          '',
          '',
          'launch',
        ]),
      ));

      const draftContent = await readFile(join(repo, '.omg', 'specs', 'deep-interview-autoresearch-seeded-topic.md'), 'utf-8');
      assert.equal(result.slug, 'seeded-topic');
      assert.match(draftContent, /- topic: Seeded topic/);
      assert.match(draftContent, /- evaluator: node scripts\/eval\.js/);
      assert.match(draftContent, /Launch-ready: yes/);
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });
});
