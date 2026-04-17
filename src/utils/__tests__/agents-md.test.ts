import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addGeneratedAgentsMarker,
  hasOmgManagedAgentsSections,
  isOmgGeneratedAgentsMd,
  OMG_GENERATED_AGENTS_MARKER,
} from '../agents-md.js';

describe('agents-md helpers', () => {
  it('inserts the generated marker after the autonomy directive block', () => {
    const content = [
      '<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->',
      'YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE TASKS TO COMPLETION WITHOUT ASKING FOR PERMISSION.',
      'DO NOT STOP TO ASK "SHOULD I PROCEED?" — PROCEED. DO NOT WAIT FOR CONFIRMATION ON OBVIOUS NEXT STEPS.',
      'IF BLOCKED, TRY AN ALTERNATIVE APPROACH. ONLY ASK WHEN TRULY AMBIGUOUS OR DESTRUCTIVE.',
      '<!-- END AUTONOMY DIRECTIVE -->',
      '# oh-my-gemini - Intelligent Multi-Agent Orchestration',
    ].join('\n');

    const result = addGeneratedAgentsMarker(content);

    assert.match(
      result,
      /<!-- END AUTONOMY DIRECTIVE -->\n<!-- omg:generated:agents-md -->\n# oh-my-gemini - Intelligent Multi-Agent Orchestration/,
    );
  });

  it('does not duplicate an existing generated marker', () => {
    const content = `header\n${OMG_GENERATED_AGENTS_MARKER}\nbody\n`;
    assert.equal(addGeneratedAgentsMarker(content), content);
  });

  it('treats autonomy-directive generated files as OMX-managed once marked', () => {
    const content = [
      '<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->',
      'directive body',
      '<!-- END AUTONOMY DIRECTIVE -->',
      OMG_GENERATED_AGENTS_MARKER,
      '# oh-my-gemini - Intelligent Multi-Agent Orchestration',
    ].join('\n');

    assert.equal(isOmgGeneratedAgentsMd(content), true);
  });

  it('does not treat title-only user GEMINI.md content as OMX-generated', () => {
    const content = [
      '# oh-my-gemini - Intelligent Multi-Agent Orchestration',
      '',
      'User-authored guidance without any OMX ownership markers.',
    ].join('\n');

    assert.equal(isOmgGeneratedAgentsMd(content), false);
    assert.equal(hasOmgManagedAgentsSections(content), false);
  });

  it('recognizes explicit OMX-owned model table blocks as managed sections', () => {
    const content = [
      '# Shared ownership AGENTS',
      '',
      '<!-- OMX:MODELS:START -->',
      'managed table',
      '<!-- OMX:MODELS:END -->',
    ].join('\n');

    assert.equal(isOmgGeneratedAgentsMd(content), false);
    assert.equal(hasOmgManagedAgentsSections(content), true);
  });
});
