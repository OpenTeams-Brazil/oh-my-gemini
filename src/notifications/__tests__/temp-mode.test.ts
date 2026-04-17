import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getNotificationConfig } from '../config.js';
import { shouldDispatchOpenClaw } from '../index.js';
import { resetOpenClawConfigCache } from '../../openclaw/config.js';

const ENV_KEYS = [
  'GEMINI_HOME',
  'OMG_NOTIFY_TEMP',
  'OMG_NOTIFY_TEMP_CONTRACT',
  'OMG_NOTIFY_PROFILE',
  'OMG_DISCORD_WEBHOOK_URL',
  'OMG_DISCORD_NOTIFIER_BOT_TOKEN',
  'OMG_DISCORD_NOTIFIER_CHANNEL',
  'OMG_TELEGRAM_BOT_TOKEN',
  'OMG_TELEGRAM_CHAT_ID',
  'OMG_SLACK_WEBHOOK_URL',
  'OMG_OPENCLAW',
] as const;

let tempGeminiHome: string;

async function writeGeminiConfig(contents: unknown): Promise<void> {
  await mkdir(tempGeminiHome, { recursive: true });
  await writeFile(join(tempGeminiHome, '.omg-config.json'), JSON.stringify(contents, null, 2));
}

function clearEnv(): void {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
}

describe('notification temp mode', () => {
  beforeEach(async () => {
    clearEnv();
    resetOpenClawConfigCache();
    tempGeminiHome = await mkdtemp(join(tmpdir(), 'omg-notify-temp-'));
    process.env.GEMINI_HOME = tempGeminiHome;
  });

  afterEach(async () => {
    clearEnv();
    resetOpenClawConfigCache();
    if (tempGeminiHome) {
      await rm(tempGeminiHome, { recursive: true, force: true });
    }
  });

  it('temp contract bypasses persistent file/profile routing', async () => {
    await writeGeminiConfig({
      notifications: {
        enabled: true,
        defaultProfile: 'file-profile',
        profiles: {
          'file-profile': {
            enabled: true,
            discord: { enabled: true, webhookUrl: 'https://discord.com/api/webhooks/file' },
          },
        },
      },
    });
    process.env.OMG_NOTIFY_PROFILE = 'file-profile';
    process.env.OMG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/temp-only';
    process.env.OMG_NOTIFY_TEMP_CONTRACT = JSON.stringify({
      active: true,
      selectors: ['slack'],
      canonicalSelectors: ['slack'],
      warnings: [],
      source: 'cli',
    });

    const config = getNotificationConfig();
    assert.ok(config);
    assert.equal(config.enabled, true);
    assert.equal(config.slack?.enabled, true);
    assert.equal(config.discord, undefined);
  });

  it('temp contract with no valid configured provider disables dispatch config', () => {
    process.env.OMG_NOTIFY_TEMP_CONTRACT = JSON.stringify({
      active: true,
      selectors: ['telegram'],
      canonicalSelectors: ['telegram'],
      warnings: [],
      source: 'cli',
    });

    const config = getNotificationConfig();
    assert.ok(config);
    assert.equal(config.enabled, false);
  });

  it('temp mode does not leak persistent openclaw/custom alias routing unless selected', async () => {
    await writeGeminiConfig({
      notifications: {
        enabled: true,
        custom_cli_command: { enabled: true, command: 'echo test' },
        openclaw: {
          enabled: true,
          gateways: { g: { type: 'command', command: 'echo hi' } },
          hooks: { 'session-end': { enabled: true, gateway: 'g', instruction: 'i' } },
        },
      },
    });
    process.env.OMG_OPENCLAW = '1';
    process.env.OMG_NOTIFY_TEMP_CONTRACT = JSON.stringify({
      active: true,
      selectors: ['discord'],
      canonicalSelectors: ['discord'],
      warnings: [],
      source: 'cli',
    });

    const config = getNotificationConfig();
    assert.ok(config);
    assert.equal(config.openclaw, undefined);
  });

  it('temp mode enables openclaw config only when explicitly selected', () => {
    process.env.OMG_OPENCLAW = '1';
    process.env.OMG_NOTIFY_TEMP_CONTRACT = JSON.stringify({
      active: true,
      selectors: ['openclaw:gateway-main'],
      canonicalSelectors: ['openclaw:gateway-main'],
      warnings: [],
      source: 'providers',
    });

    const config = getNotificationConfig();
    assert.ok(config);
    assert.equal(config.openclaw?.enabled, true);
    assert.equal(config.enabled, true);
  });

  it('shouldDispatchOpenClaw enforces temp-mode explicit selection and gateway matching', async () => {
    process.env.OMG_OPENCLAW = '1';
    await writeGeminiConfig({
      notifications: {
        enabled: true,
        openclaw: {
          enabled: true,
          gateways: { g1: { type: 'command', command: 'echo hi' } },
          hooks: { 'session-end': { enabled: true, gateway: 'g1', instruction: 'i' } },
        },
      },
    });

    const activeNoOpenClaw = {
      active: true,
      selectors: ['discord'],
      canonicalSelectors: ['discord'],
      warnings: [],
      source: 'cli' as const,
    };
    const activeWithOpenClaw = {
      active: true,
      selectors: ['openclaw:g1'],
      canonicalSelectors: ['openclaw:g1'],
      warnings: [],
      source: 'cli' as const,
    };

    const activeWithCustomGateway = {
      active: true,
      selectors: ['custom:g1'],
      canonicalSelectors: ['custom:g1'],
      warnings: [],
      source: 'cli' as const,
    };

    const activeWithWrongGateway = {
      active: true,
      selectors: ['custom:other'],
      canonicalSelectors: ['custom:other'],
      warnings: [],
      source: 'cli' as const,
    };

    assert.equal(
      await shouldDispatchOpenClaw('session-end', activeNoOpenClaw, process.env),
      false,
    );
    assert.equal(
      await shouldDispatchOpenClaw('session-end', activeWithOpenClaw, process.env),
      true,
    );
    assert.equal(
      await shouldDispatchOpenClaw('session-end', activeWithCustomGateway, process.env),
      true,
    );
    assert.equal(
      await shouldDispatchOpenClaw('session-end', activeWithWrongGateway, process.env),
      false,
    );
    assert.equal(
      await shouldDispatchOpenClaw('session-end', null, process.env),
      true,
    );
    assert.equal(
      await shouldDispatchOpenClaw('session-end', activeWithOpenClaw, { OMG_OPENCLAW: '0', GEMINI_HOME: tempGeminiHome }),
      false,
    );
  });
});
