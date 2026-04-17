import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setup } from '../setup.js';

describe('omg setup skills overwrite behavior', () => {
  it('installs wiki during setup even though it is omitted from the current manifest', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-skills-'));
    const previousCwd = process.cwd();
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      process.chdir(wd);

      await setup({ scope: 'project' });

      const wikiSkill = join(wd, '.gemini', 'skills', 'wiki', 'SKILL.md');
      assert.equal(existsSync(wikiSkill), true);
      assert.match(await readFile(wikiSkill, 'utf-8'), /^---\nname: wiki/m);
    } finally {
      process.chdir(previousCwd);
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('installs only active/internal catalog skills (skips alias/merged)', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-skills-'));
    const previousCwd = process.cwd();
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      process.chdir(wd);

      await setup({ scope: 'project' });

      const skillsDir = join(wd, '.gemini', 'skills');
      const installed = new Set(await readdir(skillsDir));

      assert.equal(installed.has('team'), true);
      assert.equal(installed.has('worker'), true);
      assert.equal(installed.has('swarm'), false);
      assert.equal(installed.has('ecomode'), false);
      assert.equal(installed.has('ultraqa'), false);
      assert.equal(installed.has('ralph-init'), false);
      assert.equal(installed.has('frontend-ui-ux'), false);
      assert.equal(installed.has('pipeline'), false);
      assert.equal(installed.has('configure-notifications'), true);
      assert.equal(installed.has('wiki'), true);
      assert.equal(installed.has('configure-discord'), false);
      assert.equal(installed.has('configure-telegram'), false);
      assert.equal(installed.has('configure-slack'), false);
      assert.equal(installed.has('configure-openclaw'), false);
    } finally {
      process.chdir(previousCwd);
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('removes stale alias/merged skill directories on --force', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-skills-'));
    const previousCwd = process.cwd();
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      process.chdir(wd);

      await setup({ scope: 'project' });

      const staleSkills = ['swarm', 'ecomode', 'ultraqa', 'configure-discord', 'configure-telegram', 'configure-slack', 'configure-openclaw'];
      for (const staleSkill of staleSkills) {
        const staleDir = join(wd, '.gemini', 'skills', staleSkill);
        await mkdir(staleDir, { recursive: true });
        await writeFile(join(staleDir, 'SKILL.md'), `# stale ${staleSkill}\n`);
        assert.equal(existsSync(staleDir), true);
      }

      await setup({ scope: 'project', force: true });

      for (const staleSkill of staleSkills) {
        assert.equal(existsSync(join(wd, '.gemini', 'skills', staleSkill)), false);
      }
      assert.equal(existsSync(join(wd, '.gemini', 'skills', 'team')), true);
    } finally {
      process.chdir(previousCwd);
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('removes stale unlisted shipped skill directories on --force', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-skills-'));
    const previousCwd = process.cwd();
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      process.chdir(wd);

      await setup({ scope: 'project' });

      const staleSkill = 'pipeline';
      const staleDir = join(wd, '.gemini', 'skills', staleSkill);
      await mkdir(staleDir, { recursive: true });
      await writeFile(join(staleDir, 'SKILL.md'), `# stale ${staleSkill}\n`);
      assert.equal(existsSync(staleDir), true);

      await setup({ scope: 'project', force: true });

      assert.equal(existsSync(join(wd, '.gemini', 'skills', staleSkill)), false);
      assert.equal(existsSync(join(wd, '.gemini', 'skills', 'team')), true);
    } finally {
      process.chdir(previousCwd);
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('retains wiki on --force while still removing unrelated stale unlisted skills', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-skills-'));
    const previousCwd = process.cwd();
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      process.chdir(wd);

      await setup({ scope: 'project' });

      const wikiDir = join(wd, '.gemini', 'skills', 'wiki');
      const stalePipelineDir = join(wd, '.gemini', 'skills', 'pipeline');
      assert.equal(existsSync(wikiDir), true);

      await mkdir(stalePipelineDir, { recursive: true });
      await writeFile(join(stalePipelineDir, 'SKILL.md'), '# stale pipeline\n');

      await setup({ scope: 'project', force: true });

      assert.equal(existsSync(wikiDir), true);
      assert.equal(existsSync(join(wikiDir, 'SKILL.md')), true);
      assert.equal(existsSync(stalePipelineDir), false);
    } finally {
      process.chdir(previousCwd);
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('refreshes existing skill files by default and restores packaged content', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-skills-'));
    const previousCwd = process.cwd();
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      process.chdir(wd);

      await setup({ scope: 'project' });

      const skillPath = join(wd, '.gemini', 'skills', 'help', 'SKILL.md');
      assert.equal(existsSync(skillPath), true);

      const installed = await readFile(skillPath, 'utf-8');
      const customized = `${installed}\n\n# local customization\n`;
      await writeFile(skillPath, customized);

      await setup({ scope: 'project' });
      assert.equal(await readFile(skillPath, 'utf-8'), installed);

      const backupsRoot = join(wd, '.omg', 'backups', 'setup');
      assert.equal(existsSync(backupsRoot), true);

      await setup({ scope: 'project', force: true });
      assert.equal(await readFile(skillPath, 'utf-8'), installed);
    } finally {
      process.chdir(previousCwd);
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('preserves unrelated user-authored skill directories during setup and --force refresh', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-skills-'));
    const previousCwd = process.cwd();
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      process.chdir(wd);

      await setup({ scope: 'project' });

      const customSkillDir = join(wd, '.gemini', 'skills', 'my-custom-skill');
      const customSkillPath = join(customSkillDir, 'SKILL.md');
      await mkdir(customSkillDir, { recursive: true });
      await writeFile(customSkillPath, '---\nname: my-custom-skill\ndescription: local custom skill\n---\n');

      await setup({ scope: 'project' });
      assert.equal(await readFile(customSkillPath, 'utf-8'), '---\nname: my-custom-skill\ndescription: local custom skill\n---\n');

      await setup({ scope: 'project', force: true });
      assert.equal(await readFile(customSkillPath, 'utf-8'), '---\nname: my-custom-skill\ndescription: local custom skill\n---\n');
    } finally {
      process.chdir(previousCwd);
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('logs skip/remove decisions in verbose mode', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-skills-'));
    const previousCwd = process.cwd();
    const logs: string[] = [];
    const originalLog = console.log;
    try {
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      process.chdir(wd);
      console.log = (...args: unknown[]) => {
        logs.push(args.map((arg) => String(arg)).join(' '));
      };

      await setup({ scope: 'project', verbose: true });
      await mkdir(join(wd, '.gemini', 'skills', 'swarm'), { recursive: true });
      await writeFile(join(wd, '.gemini', 'skills', 'swarm', 'SKILL.md'), '# stale swarm\n');
      await setup({ scope: 'project', force: true, verbose: true });

      const output = logs.join('\n');
      assert.match(output, /skipped swarm\/ \(status: alias\)/);
      assert.match(output, /removed stale skill swarm\/ \(status: alias\)/);
      assert.match(output, /skills: updated=/);
    } finally {
      console.log = originalLog;
      process.chdir(previousCwd);
      await rm(wd, { recursive: true, force: true });
    }
  });

  it('prints a migration hint when legacy ~/.agents/skills overlaps canonical user skills', async () => {
    const wd = await mkdtemp(join(tmpdir(), 'omg-setup-skills-'));
    const previousCwd = process.cwd();
    const previousHome = process.env.HOME;
    const previousGeminiHome = process.env.GEMINI_HOME;
    const logs: string[] = [];
    const originalLog = console.log;
    try {
      const home = join(wd, 'home');
      const geminiHome = join(home, '.gemini');
      process.env.HOME = home;
      process.env.GEMINI_HOME = geminiHome;
      await mkdir(join(wd, '.omg', 'state'), { recursive: true });
      await mkdir(join(home, '.agents', 'skills', 'help'), { recursive: true });
      await writeFile(join(home, '.agents', 'skills', 'help', 'SKILL.md'), '# legacy help\n');
      process.chdir(wd);
      console.log = (...args: unknown[]) => {
        logs.push(args.map((arg) => String(arg)).join(' '));
      };

      await setup({ scope: 'user' });

      const output = logs.join('\n');
      assert.match(output, /Migration hint: Detected 1 overlapping skill names between canonical .*\.gemini\/skills and legacy .*\.agents\/skills\./);
      assert.match(output, /Remove or archive ~\/\.agents\/skills after confirming .*\.gemini\/skills is the version you want Gemini to load\./);
    } finally {
      console.log = originalLog;
      process.chdir(previousCwd);
      if (typeof previousHome === 'string') process.env.HOME = previousHome; else delete process.env.HOME;
      if (typeof previousGeminiHome === 'string') process.env.GEMINI_HOME = previousGeminiHome; else delete process.env.GEMINI_HOME;
      await rm(wd, { recursive: true, force: true });
    }
  });

});
