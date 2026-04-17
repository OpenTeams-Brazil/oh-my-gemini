import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CORE_ROLE_CONTRACTS, ROOT_TEMPLATE_CONTRACTS } from '../prompt-guidance-contract.js';
import { assertContractSurface, loadSurface } from './prompt-guidance-test-helpers.js';

describe('prompt guidance contract', () => {
  for (const contract of [...ROOT_TEMPLATE_CONTRACTS, ...CORE_ROLE_CONTRACTS]) {
    it(`${contract.id} satisfies the core prompt-guidance contract`, () => {
      assertContractSurface(contract);
    });
  }

  it('root and template AGENTS lock agent-owned reversible OMX/runtime actions', () => {
    for (const contract of ROOT_TEMPLATE_CONTRACTS) {
      const content = loadSurface(contract.path);
      assert.match(content, /Do not ask or instruct humans to perform ordinary non-destructive, reversible actions/i);
      assert.match(content, /Treat OMX runtime manipulation, state transitions, and ordinary command execution as agent responsibilities/i);
      assert.doesNotMatch(content, /Run `omg setup` to install all components\. Run `omg doctor` to verify installation\./);
    }
  });
});
