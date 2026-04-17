/**
 * Model Configuration
 *
 * Reads per-mode model overrides and default-env overrides from .omg-config.json.
 *
 * Config format:
 * {
 *   "env": {
 *     "OMG_DEFAULT_FRONTIER_MODEL": "your-frontier-model",
 *     "OMG_DEFAULT_STANDARD_MODEL": "your-standard-model",
 *     "OMG_DEFAULT_SPARK_MODEL": "your-spark-model"
 *   },
 *   "models": {
 *     "default": "o4-mini",
 *     "team": "gpt-4.1"
 *   }
 * }
 *
 * Resolution: mode-specific > "default" key > OMG_DEFAULT_FRONTIER_MODEL > DEFAULT_FRONTIER_MODEL
 */

import { parse as parseToml } from '@iarna/toml';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { geminiConfigPath, geminiHome } from '../utils/paths.js';

export interface ModelsConfig {
  [mode: string]: string | undefined;
}

export interface OmxConfigEnv {
  [key: string]: string | undefined;
}

interface OmxConfigFile {
  env?: OmxConfigEnv;
  models?: ModelsConfig;
}

interface GeminiConfigFile {
  model_provider?: unknown;
  model_providers?: Record<string, unknown>;
}

export const OMG_DEFAULT_FRONTIER_MODEL_ENV = 'OMG_DEFAULT_FRONTIER_MODEL';
export const OMG_DEFAULT_STANDARD_MODEL_ENV = 'OMG_DEFAULT_STANDARD_MODEL';
export const OMG_DEFAULT_SPARK_MODEL_ENV = 'OMG_DEFAULT_SPARK_MODEL';
export const OMG_SPARK_MODEL_ENV = 'OMG_SPARK_MODEL';

function readOmxConfigFile(geminiHomeOverride?: string): OmxConfigFile | null {
  const configPath = join(geminiHomeOverride || geminiHome(), '.omg-config.json');
  if (!existsSync(configPath)) return null;
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as OmxConfigFile;
  } catch {
    return null;
  }
}

function readGeminiConfigFile(geminiHomeOverride?: string): GeminiConfigFile | null {
  const configPath = geminiHomeOverride
    ? join(geminiHomeOverride, 'config.toml')
    : geminiConfigPath();
  if (!existsSync(configPath)) return null;
  try {
    const raw = parseToml(readFileSync(configPath, 'utf-8'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as GeminiConfigFile;
  } catch {
    return null;
  }
}

function readModelsBlock(geminiHomeOverride?: string): ModelsConfig | null {
  const config = readOmxConfigFile(geminiHomeOverride);
  if (!config) return null;
  if (config.models && typeof config.models === 'object' && !Array.isArray(config.models)) {
    return config.models;
  }
  return null;
}

export const DEFAULT_FRONTIER_MODEL = 'gpt-5.4';
export const DEFAULT_STANDARD_MODEL = 'gpt-5.4-mini';
export const DEFAULT_SPARK_MODEL = 'gpt-5.3-gemini-spark';

function normalizeConfiguredValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readConfigEnvValue(key: string, geminiHomeOverride?: string): string | undefined {
  const config = readOmxConfigFile(geminiHomeOverride);
  if (!config || !config.env || typeof config.env !== 'object' || Array.isArray(config.env)) {
    return undefined;
  }
  return normalizeConfiguredValue(config.env[key]);
}

function readTeamLowComplexityOverride(geminiHomeOverride?: string): string | undefined {
  const models = readModelsBlock(geminiHomeOverride);
  if (!models) return undefined;
  for (const key of TEAM_LOW_COMPLEXITY_MODEL_KEYS) {
    const value = normalizeConfiguredValue(models[key]);
    if (value) return value;
  }
  return undefined;
}

export function readConfiguredEnvOverrides(geminiHomeOverride?: string): NodeJS.ProcessEnv {
  const config = readOmxConfigFile(geminiHomeOverride);
  if (!config || !config.env || typeof config.env !== 'object' || Array.isArray(config.env)) {
    return {};
  }

  const resolved: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(config.env)) {
    const normalized = normalizeConfiguredValue(value);
    if (normalized) resolved[key] = normalized;
  }
  return resolved;
}

export function readActiveProviderEnvOverrides(
  env: NodeJS.ProcessEnv = process.env,
  geminiHomeOverride?: string,
): NodeJS.ProcessEnv {
  const config = readGeminiConfigFile(geminiHomeOverride);
  if (!config) return {};

  const activeProvider = normalizeConfiguredValue(config.model_provider);
  if (!activeProvider) return {};

  const providers = config.model_providers;
  if (!providers || typeof providers !== 'object' || Array.isArray(providers)) {
    return {};
  }

  const providerConfig = providers[activeProvider];
  if (!providerConfig || typeof providerConfig !== 'object' || Array.isArray(providerConfig)) {
    return {};
  }

  const envKey = normalizeConfiguredValue((providerConfig as Record<string, unknown>).env_key);
  if (!envKey) return {};

  const envValue = normalizeConfiguredValue(env[envKey]);
  return envValue ? { [envKey]: envValue } : {};
}

export function getEnvConfiguredMainDefaultModel(
  env: NodeJS.ProcessEnv = process.env,
  geminiHomeOverride?: string,
): string | undefined {
  return normalizeConfiguredValue(env[OMG_DEFAULT_FRONTIER_MODEL_ENV])
    ?? readConfigEnvValue(OMG_DEFAULT_FRONTIER_MODEL_ENV, geminiHomeOverride);
}

export function getEnvConfiguredStandardDefaultModel(
  env: NodeJS.ProcessEnv = process.env,
  geminiHomeOverride?: string,
): string | undefined {
  return normalizeConfiguredValue(env[OMG_DEFAULT_STANDARD_MODEL_ENV])
    ?? readConfigEnvValue(OMG_DEFAULT_STANDARD_MODEL_ENV, geminiHomeOverride);
}

export function getEnvConfiguredSparkDefaultModel(
  env: NodeJS.ProcessEnv = process.env,
  geminiHomeOverride?: string,
): string | undefined {
  return normalizeConfiguredValue(env[OMG_DEFAULT_SPARK_MODEL_ENV])
    ?? normalizeConfiguredValue(env[OMG_SPARK_MODEL_ENV])
    ?? readConfigEnvValue(OMG_DEFAULT_SPARK_MODEL_ENV, geminiHomeOverride)
    ?? readConfigEnvValue(OMG_SPARK_MODEL_ENV, geminiHomeOverride);
}

/**
 * Get the envvar-backed main/default model.
 * Resolution: OMG_DEFAULT_FRONTIER_MODEL > DEFAULT_FRONTIER_MODEL
 */
export function getMainDefaultModel(geminiHomeOverride?: string): string {
  return getEnvConfiguredMainDefaultModel(process.env, geminiHomeOverride)
    ?? DEFAULT_FRONTIER_MODEL;
}

/**
 * Get the envvar-backed standard/default subagent model.
 * Resolution: OMG_DEFAULT_STANDARD_MODEL > DEFAULT_STANDARD_MODEL
 */
export function getStandardDefaultModel(geminiHomeOverride?: string): string {
  return getEnvConfiguredStandardDefaultModel(process.env, geminiHomeOverride)
    ?? DEFAULT_STANDARD_MODEL;
}

/**
 * Get the configured model for a specific mode.
 * Resolution: mode-specific override > "default" key > OMG_DEFAULT_FRONTIER_MODEL > DEFAULT_FRONTIER_MODEL
 */
export function getModelForMode(mode: string, geminiHomeOverride?: string): string {
  const models = readModelsBlock(geminiHomeOverride);
  const modeValue = normalizeConfiguredValue(models?.[mode]);
  if (modeValue) return modeValue;

  const defaultValue = normalizeConfiguredValue(models?.default);
  if (defaultValue) return defaultValue;

  return getMainDefaultModel(geminiHomeOverride);
}

const TEAM_LOW_COMPLEXITY_MODEL_KEYS = [
  'team_low_complexity',
  'team-low-complexity',
  'teamLowComplexity',
];

/**
 * Get the envvar-backed spark/low-complexity default model.
 * Resolution: OMG_DEFAULT_SPARK_MODEL > OMG_SPARK_MODEL > explicit low-complexity key(s) > DEFAULT_SPARK_MODEL
 */
export function getSparkDefaultModel(geminiHomeOverride?: string): string {
  return getEnvConfiguredSparkDefaultModel(process.env, geminiHomeOverride)
    ?? readTeamLowComplexityOverride(geminiHomeOverride)
    ?? DEFAULT_SPARK_MODEL;
}

/**
 * Get the low-complexity team worker model.
 * Resolution: explicit low-complexity key(s) > OMG_DEFAULT_SPARK_MODEL > OMG_SPARK_MODEL > DEFAULT_SPARK_MODEL
 */
export function getTeamLowComplexityModel(geminiHomeOverride?: string): string {
  return readTeamLowComplexityOverride(geminiHomeOverride) ?? getSparkDefaultModel(geminiHomeOverride);
}
