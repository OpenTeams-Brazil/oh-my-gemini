import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadSurface } from "../../hooks/__tests__/prompt-guidance-test-helpers.js";

describe("project wiki config/generator documentation contract", () => {
  it("documents the dedicated omg_wiki MCP server block", () => {
    const doc = loadSurface("docs/reference/project-wiki.md");
    assert.match(doc, /\[mcp_servers\.omg_wiki\]/);
    assert.match(doc, /dist\/mcp\/wiki-server\.js/);
    assert.match(doc, /`omg setup` \/ the config generator/i);
    assert.match(doc, /bootstrap\/config path should treat `omg_wiki` as a first-party OMX server/i);
  });

  it("documents the OMX-native storage path instead of legacy OMG storage", () => {
    const doc = loadSurface("docs/reference/project-wiki.md");
    assert.match(doc, /Wiki state is project-local and should live under/i);
    assert.match(doc, /`\.omg\/wiki\/\*\.md`/);
    assert.match(doc, /The docs and code should never regress back to `\.omg\/wiki\/`/);
  });
});
