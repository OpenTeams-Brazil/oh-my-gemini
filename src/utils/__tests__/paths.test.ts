import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { join } from "path";
import { homedir, tmpdir } from "os";
import { existsSync } from "fs";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "fs/promises";
import {
  geminiHome,
  geminiConfigPath,
  geminiPromptsDir,
  userSkillsDir,
  projectSkillsDir,
  legacyUserSkillsDir,
  listInstalledSkillDirectories,
  detectLegacySkillRootOverlap,
  omgStateDir,
  omgProjectMemoryPath,
  omgNotepadPath,
  omgPlansDir,
  omgAdaptersDir,
  omgLogsDir,
  packageRoot,
  OMX_ENTRY_PATH_ENV,
  OMX_STARTUP_CWD_ENV,
  rememberOmxLaunchContext,
  resolveOmxCliEntryPath,
  resolveOmxEntryPath,
} from "../paths.js";

describe("geminiHome", () => {
  let originalGeminiHome: string | undefined;
  let originalUserProfile: string | undefined;

  beforeEach(() => {
    originalGeminiHome = process.env.GEMINI_HOME;
    originalUserProfile = process.env.USERPROFILE;
  });

  afterEach(() => {
    if (typeof originalGeminiHome === "string") {
      process.env.GEMINI_HOME = originalGeminiHome;
    } else {
      delete process.env.GEMINI_HOME;
    }

    if (typeof originalUserProfile === "string") {
      process.env.USERPROFILE = originalUserProfile;
    } else {
      delete process.env.USERPROFILE;
    }
  });

  it("returns GEMINI_HOME env var when set", () => {
    process.env.GEMINI_HOME = "/tmp/custom-codex";
    assert.equal(geminiHome(), "/tmp/custom-codex");
  });

  it("defaults to ~/.gemini when GEMINI_HOME is not set", () => {
    delete process.env.GEMINI_HOME;
    assert.equal(geminiHome(), join(homedir(), ".gemini"));
  });
});

describe("geminiConfigPath", () => {
  let originalGeminiHome: string | undefined;
  let originalUserProfile: string | undefined;

  beforeEach(() => {
    originalGeminiHome = process.env.GEMINI_HOME;
    originalUserProfile = process.env.USERPROFILE;
    process.env.GEMINI_HOME = "/tmp/test-codex";
  });

  afterEach(() => {
    if (typeof originalGeminiHome === "string") {
      process.env.GEMINI_HOME = originalGeminiHome;
    } else {
      delete process.env.GEMINI_HOME;
    }

    if (typeof originalUserProfile === "string") {
      process.env.USERPROFILE = originalUserProfile;
    } else {
      delete process.env.USERPROFILE;
    }
  });

  it("returns config.toml under codex home", () => {
    assert.equal(geminiConfigPath(), join("/tmp/test-codex", "config.toml"));
  });
});

describe("geminiPromptsDir", () => {
  let originalGeminiHome: string | undefined;
  let originalUserProfile: string | undefined;

  beforeEach(() => {
    originalGeminiHome = process.env.GEMINI_HOME;
    originalUserProfile = process.env.USERPROFILE;
    process.env.GEMINI_HOME = "/tmp/test-codex";
  });

  afterEach(() => {
    if (typeof originalGeminiHome === "string") {
      process.env.GEMINI_HOME = originalGeminiHome;
    } else {
      delete process.env.GEMINI_HOME;
    }

    if (typeof originalUserProfile === "string") {
      process.env.USERPROFILE = originalUserProfile;
    } else {
      delete process.env.USERPROFILE;
    }
  });

  it("returns prompts/ under codex home", () => {
    assert.equal(geminiPromptsDir(), join("/tmp/test-codex", "prompts"));
  });
});

describe("userSkillsDir", () => {
  let originalGeminiHome: string | undefined;
  let originalUserProfile: string | undefined;

  beforeEach(() => {
    originalGeminiHome = process.env.GEMINI_HOME;
    originalUserProfile = process.env.USERPROFILE;
    process.env.GEMINI_HOME = "/tmp/test-codex";
  });

  afterEach(() => {
    if (typeof originalGeminiHome === "string") {
      process.env.GEMINI_HOME = originalGeminiHome;
    } else {
      delete process.env.GEMINI_HOME;
    }

    if (typeof originalUserProfile === "string") {
      process.env.USERPROFILE = originalUserProfile;
    } else {
      delete process.env.USERPROFILE;
    }
  });

  it("returns GEMINI_HOME/skills", () => {
    assert.equal(userSkillsDir(), join("/tmp/test-codex", "skills"));
  });
});

describe("projectSkillsDir", () => {
  it("uses provided projectRoot", () => {
    assert.equal(projectSkillsDir("/my/project"), join("/my/project", ".gemini", "skills"));
  });

  it("defaults to cwd when no projectRoot given", () => {
    assert.equal(projectSkillsDir(), join(process.cwd(), ".gemini", "skills"));
  });
});

describe("legacyUserSkillsDir", () => {
  let originalHome: string | undefined;
  let originalUserProfile: string | undefined;

  beforeEach(() => {
    originalHome = process.env.HOME;
    originalUserProfile = process.env.USERPROFILE;
    process.env.HOME = "/tmp/test-home";
    process.env.USERPROFILE = "/tmp/test-home";
  });

  afterEach(() => {
    if (typeof originalHome === "string") {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }

    if (typeof originalUserProfile === "string") {
      process.env.USERPROFILE = originalUserProfile;
    } else {
      delete process.env.USERPROFILE;
    }
  });

  it("returns ~/.agents/skills under HOME", () => {
    assert.equal(legacyUserSkillsDir(), join("/tmp/test-home", ".agents", "skills"));
  });
});

describe("omgAdaptersDir", () => {
  it("returns .omg/adapters under the project root", () => {
    assert.equal(omgAdaptersDir("/my/project"), join("/my/project", ".omg", "adapters"));
  });
});

describe("listInstalledSkillDirectories", () => {
  let originalGeminiHome: string | undefined;
  let originalHome: string | undefined;
  let originalUserProfile: string | undefined;

  beforeEach(() => {
    originalGeminiHome = process.env.GEMINI_HOME;
    originalHome = process.env.HOME;
    originalUserProfile = process.env.USERPROFILE;
  });

  afterEach(() => {
    if (typeof originalGeminiHome === "string") {
      process.env.GEMINI_HOME = originalGeminiHome;
    } else {
      delete process.env.GEMINI_HOME;
    }

    if (typeof originalHome === "string") {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }

    if (typeof originalUserProfile === "string") {
      process.env.USERPROFILE = originalUserProfile;
    } else {
      delete process.env.USERPROFILE;
    }
  });

  it("deduplicates by skill name and prefers project skills over user skills", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "omg-paths-project-"));
    const geminiHomeRoot = await mkdtemp(join(tmpdir(), "omg-paths-codex-"));
    process.env.GEMINI_HOME = geminiHomeRoot;

    try {
      const projectHelpDir = join(projectRoot, ".gemini", "skills", "help");
      const projectOnlyDir = join(
        projectRoot,
        ".gemini",
        "skills",
        "project-only",
      );
      const userHelpDir = join(geminiHomeRoot, "skills", "help");
      const userOnlyDir = join(geminiHomeRoot, "skills", "user-only");

      await mkdir(projectHelpDir, { recursive: true });
      await mkdir(projectOnlyDir, { recursive: true });
      await mkdir(userHelpDir, { recursive: true });
      await mkdir(userOnlyDir, { recursive: true });

      await writeFile(join(projectHelpDir, "SKILL.md"), "# project help\n");
      await writeFile(join(projectOnlyDir, "SKILL.md"), "# project only\n");
      await writeFile(join(userHelpDir, "SKILL.md"), "# user help\n");
      await writeFile(join(userOnlyDir, "SKILL.md"), "# user only\n");

      const skills = await listInstalledSkillDirectories(projectRoot);

      assert.deepEqual(
        skills.map((skill) => ({
          name: skill.name,
          scope: skill.scope,
        })),
        [
          { name: "help", scope: "project" },
          { name: "project-only", scope: "project" },
          { name: "user-only", scope: "user" },
        ],
      );
      assert.equal(skills[0]?.path, projectHelpDir);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
      await rm(geminiHomeRoot, { recursive: true, force: true });
    }
  });
  it("detects overlapping legacy and canonical user skill roots including content mismatches", async () => {
    const homeRoot = await mkdtemp(join(tmpdir(), "omg-paths-home-"));
    const geminiHomeRoot = join(homeRoot, ".gemini");
    const legacyRoot = join(homeRoot, ".agents", "skills");
    process.env.HOME = homeRoot;
    process.env.USERPROFILE = homeRoot;
    process.env.GEMINI_HOME = geminiHomeRoot;

    try {
      const canonicalHelpDir = join(geminiHomeRoot, "skills", "help");
      const canonicalPlanDir = join(geminiHomeRoot, "skills", "plan");
      const legacyHelpDir = join(legacyRoot, "help");
      const legacyOnlyDir = join(legacyRoot, "legacy-only");

      await mkdir(canonicalHelpDir, { recursive: true });
      await mkdir(canonicalPlanDir, { recursive: true });
      await mkdir(legacyHelpDir, { recursive: true });
      await mkdir(legacyOnlyDir, { recursive: true });

      await writeFile(join(canonicalHelpDir, "SKILL.md"), "# canonical help\n");
      await writeFile(join(canonicalPlanDir, "SKILL.md"), "# canonical plan\n");
      await writeFile(join(legacyHelpDir, "SKILL.md"), "# legacy help\n");
      await writeFile(join(legacyOnlyDir, "SKILL.md"), "# legacy only\n");

      const overlap = await detectLegacySkillRootOverlap();

      assert.equal(overlap.canonicalExists, true);
      assert.equal(overlap.legacyExists, true);
      assert.equal(overlap.canonicalSkillCount, 2);
      assert.equal(overlap.legacySkillCount, 2);
      assert.deepEqual(overlap.overlappingSkillNames, ["help"]);
      assert.deepEqual(overlap.mismatchedSkillNames, ["help"]);
      assert.equal(overlap.sameResolvedTarget, false);
    } finally {
      await rm(homeRoot, { recursive: true, force: true });
    }
  });

  it("treats a legacy link to canonical skills as the same resolved target", async () => {
    const homeRoot = await mkdtemp(join(tmpdir(), "omg-paths-linked-home-"));
    const geminiHomeRoot = join(homeRoot, ".gemini");
    const canonicalSkillsRoot = join(geminiHomeRoot, "skills");
    const legacyParent = join(homeRoot, ".agents");
    const legacyRoot = join(legacyParent, "skills");
    process.env.HOME = homeRoot;
    process.env.USERPROFILE = homeRoot;
    process.env.GEMINI_HOME = geminiHomeRoot;

    try {
      const canonicalHelpDir = join(canonicalSkillsRoot, "help");
      await mkdir(canonicalHelpDir, { recursive: true });
      await mkdir(legacyParent, { recursive: true });
      await writeFile(join(canonicalHelpDir, "SKILL.md"), "# canonical help\n");
      await symlink(
        canonicalSkillsRoot,
        legacyRoot,
        process.platform === "win32" ? "junction" : "dir",
      );

      const overlap = await detectLegacySkillRootOverlap();

      assert.equal(overlap.canonicalExists, true);
      assert.equal(overlap.legacyExists, true);
      assert.equal(overlap.canonicalSkillCount, 1);
      assert.equal(overlap.legacySkillCount, 1);
      assert.equal(overlap.sameResolvedTarget, true);
      assert.deepEqual(overlap.overlappingSkillNames, ["help"]);
      assert.deepEqual(overlap.mismatchedSkillNames, []);
    } finally {
      await rm(homeRoot, { recursive: true, force: true });
    }
  });
});

describe("omgStateDir", () => {
  it("uses provided projectRoot", () => {
    assert.equal(omgStateDir("/my/project"), join("/my/project", ".omg", "state"));
  });

  it("defaults to cwd when no projectRoot given", () => {
    assert.equal(omgStateDir(), join(process.cwd(), ".omg", "state"));
  });
});

describe("omgProjectMemoryPath", () => {
  it("uses provided projectRoot", () => {
    assert.equal(
      omgProjectMemoryPath("/my/project"),
      join("/my/project", ".omg", "project-memory.json"),
    );
  });

  it("defaults to cwd when no projectRoot given", () => {
    assert.equal(
      omgProjectMemoryPath(),
      join(process.cwd(), ".omg", "project-memory.json"),
    );
  });
});

describe("omgNotepadPath", () => {
  it("uses provided projectRoot", () => {
    assert.equal(omgNotepadPath("/my/project"), join("/my/project", ".omg", "notepad.md"));
  });

  it("defaults to cwd when no projectRoot given", () => {
    assert.equal(omgNotepadPath(), join(process.cwd(), ".omg", "notepad.md"));
  });
});

describe("omgPlansDir", () => {
  it("uses provided projectRoot", () => {
    assert.equal(omgPlansDir("/my/project"), join("/my/project", ".omg", "plans"));
  });

  it("defaults to cwd when no projectRoot given", () => {
    assert.equal(omgPlansDir(), join(process.cwd(), ".omg", "plans"));
  });
});

describe("omgLogsDir", () => {
  it("uses provided projectRoot", () => {
    assert.equal(omgLogsDir("/my/project"), join("/my/project", ".omg", "logs"));
  });

  it("defaults to cwd when no projectRoot given", () => {
    assert.equal(omgLogsDir(), join(process.cwd(), ".omg", "logs"));
  });
});

describe("packageRoot", () => {
  it("resolves to a directory containing package.json", () => {
    const root = packageRoot();
    assert.equal(existsSync(join(root, "package.json")), true);
  });
});

describe("OMX launcher path resolution", () => {
  const originalEntryPath = process.env[OMX_ENTRY_PATH_ENV];
  const originalStartupCwd = process.env[OMX_STARTUP_CWD_ENV];

  afterEach(() => {
    if (typeof originalEntryPath === "string") {
      process.env[OMX_ENTRY_PATH_ENV] = originalEntryPath;
    } else {
      delete process.env[OMX_ENTRY_PATH_ENV];
    }
    if (typeof originalStartupCwd === "string") {
      process.env[OMX_STARTUP_CWD_ENV] = originalStartupCwd;
    } else {
      delete process.env[OMX_STARTUP_CWD_ENV];
    }
  });

  it("resolves relative launcher paths against the recorded startup cwd", async () => {
    const startupCwd = await mkdtemp(join(tmpdir(), "omg-launcher-start-"));
    const laterCwd = await mkdtemp(join(tmpdir(), "omg-launcher-later-"));
    try {
      const launcherDir = join(startupCwd, "dist", "cli");
      const launcherPath = join(launcherDir, "omg.js");
      await mkdir(launcherDir, { recursive: true });
      await writeFile(launcherPath, "#!/usr/bin/env node\n", "utf-8");

      const resolved = resolveOmxEntryPath({
        argv1: "dist/cli/omg.js",
        cwd: laterCwd,
        env: {
          ...process.env,
          [OMX_STARTUP_CWD_ENV]: startupCwd,
        },
      });

      assert.equal(resolved, launcherPath);
    } finally {
      await rm(startupCwd, { recursive: true, force: true });
      await rm(laterCwd, { recursive: true, force: true });
    }
  });

  it("records launcher context once so later cwd changes keep the absolute entry path", async () => {
    const startupCwd = await mkdtemp(join(tmpdir(), "omg-launcher-record-"));
    try {
      const launcherDir = join(startupCwd, "dist", "cli");
      const launcherPath = join(launcherDir, "omg.js");
      await mkdir(launcherDir, { recursive: true });
      await writeFile(launcherPath, "#!/usr/bin/env node\n", "utf-8");

      delete process.env[OMX_ENTRY_PATH_ENV];
      delete process.env[OMX_STARTUP_CWD_ENV];
      rememberOmxLaunchContext({
        argv1: "dist/cli/omg.js",
        cwd: startupCwd,
        env: process.env,
      });

      assert.equal(process.env[OMX_STARTUP_CWD_ENV], startupCwd);
      assert.equal(process.env[OMX_ENTRY_PATH_ENV], launcherPath);
    } finally {
      await rm(startupCwd, { recursive: true, force: true });
    }
  });

  it("falls back to the packaged CLI entry when argv1 points at a non-CLI script", async () => {
    const startupCwd = await mkdtemp(join(tmpdir(), "omg-launcher-cli-fallback-start-"));
    const packageRootDir = await mkdtemp(join(tmpdir(), "omg-launcher-cli-fallback-root-"));
    try {
      const hookDir = join(startupCwd, "dist", "scripts");
      const hookPath = join(hookDir, "codex-native-hook.js");
      const cliDir = join(packageRootDir, "dist", "cli");
      const cliPath = join(cliDir, "omg.js");
      await mkdir(hookDir, { recursive: true });
      await mkdir(cliDir, { recursive: true });
      await writeFile(hookPath, "#!/usr/bin/env node\n", "utf-8");
      await writeFile(cliPath, "#!/usr/bin/env node\n", "utf-8");

      const resolved = resolveOmxCliEntryPath({
        argv1: "dist/scripts/codex-native-hook.js",
        cwd: startupCwd,
        env: {
          ...process.env,
          [OMX_STARTUP_CWD_ENV]: startupCwd,
        },
        packageRootDir,
      });

      assert.equal(resolved, cliPath);
    } finally {
      await rm(startupCwd, { recursive: true, force: true });
      await rm(packageRootDir, { recursive: true, force: true });
    }
  });

  it("keeps the resolved path when argv1 already points at the CLI entry", async () => {
    const startupCwd = await mkdtemp(join(tmpdir(), "omg-launcher-cli-direct-start-"));
    try {
      const cliDir = join(startupCwd, "dist", "cli");
      const cliPath = join(cliDir, "omg.js");
      await mkdir(cliDir, { recursive: true });
      await writeFile(cliPath, "#!/usr/bin/env node\n", "utf-8");

      const resolved = resolveOmxCliEntryPath({
        argv1: "dist/cli/omg.js",
        cwd: startupCwd,
        env: {
          ...process.env,
          [OMX_STARTUP_CWD_ENV]: startupCwd,
        },
      });

      assert.equal(resolved, cliPath);
    } finally {
      await rm(startupCwd, { recursive: true, force: true });
    }
  });

  it("falls back from a non-OMX host binary to the packaged CLI entry", async () => {
    const startupCwd = await mkdtemp(join(tmpdir(), "omg-launcher-cli-host-start-"));
    const packageRootDir = await mkdtemp(join(tmpdir(), "omg-launcher-cli-host-root-"));
    try {
      const hostPath = join(startupCwd, "codex-host");
      const cliDir = join(packageRootDir, "dist", "cli");
      const cliPath = join(cliDir, "omg.js");
      await writeFile(hostPath, "#!/usr/bin/env node\n", "utf-8");
      await mkdir(cliDir, { recursive: true });
      await writeFile(cliPath, "#!/usr/bin/env node\n", "utf-8");

      const resolved = resolveOmxCliEntryPath({
        argv1: hostPath,
        cwd: startupCwd,
        env: {
          ...process.env,
          [OMX_STARTUP_CWD_ENV]: startupCwd,
        },
        packageRootDir,
      });

      assert.equal(resolved, cliPath);
    } finally {
      await rm(startupCwd, { recursive: true, force: true });
      await rm(packageRootDir, { recursive: true, force: true });
    }
  });

});
