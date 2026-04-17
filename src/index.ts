/**
 * oh-my-gemini - Multi-agent orchestration for OpenAI Gemini CLI
 *
 * This package provides:
 * - 30+ specialized agent prompts as Gemini CLI slash commands
 * - 35+ workflow skills as SKILL.md files
 * - GEMINI.md orchestration brain
 * - MCP servers for state management, project memory, and notepad
 * - CLI tool (omg) for setup, diagnostics, and management
 * - Notification hooks for workflow tracking
 */

export { setup } from './cli/setup.js';
export { doctor } from './cli/doctor.js';
export { version } from './cli/version.js';
export { mergeConfig } from './config/generator.js';
export { AGENT_DEFINITIONS, type AgentDefinition } from './agents/definitions.js';
export { generateAgentToml, installNativeAgentConfigs } from './agents/native-config.js';
export { hudCommand } from './hud/index.js';
