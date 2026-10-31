import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadPipelineConfig, resolveSources } from "./token-source.mjs";
import { buildTokens } from "./build-tokens.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

describe("token source configuration", () => {
  it("selects the curated source by default", async () => {
    const config = await loadPipelineConfig();
    expect(config.mode).toBe("curated");
    expect(resolveSources(config)).toEqual(["tokens/tokens.json"]);
  });

  it("selects direct DTCG inputs when direct mode is requested", async () => {
    const config = await loadPipelineConfig();
    expect(resolveSources(config, "direct")).toEqual([
      "tokens/imports/**/*.json",
    ]);
  });

  it("rejects unknown modes and empty source lists", async () => {
    const config = await loadPipelineConfig();
    expect(() => resolveSources(config, "vendor")).toThrow(/mode/i);
    expect(() => resolveSources({ ...config, sources: {} })).toThrow(/source/i);
  });
});

describe("token output contract", () => {
  let css;

  beforeAll(async () => {
    const result = await buildTokens({
      configPath: join(root, "tokens", "pipeline.config.json"),
      modeOverride: "curated",
      outputPath: join(root, "src", "styles", "tokens.css"),
    });
    css = readFileSync(result.outputPath, "utf8");
  });

  it("emits light theme color variables in :root", () => {
    expect(css).toContain("--background: #ffffff;");
    expect(css).toContain("--foreground: #0a0a0a;");
    expect(css).toContain("--primary: #171717;");
  });

  it("emits dark theme color variables in .dark", () => {
    expect(css).toContain(".dark {");
    expect(css).toContain("--background: #0a0a0a;");
  });

  it("emits radius variable", () => {
    expect(css).toContain("--radius: 0.625rem;");
  });

  it("emits font family variables", () => {
    expect(css).toContain('--font-family-sans: "Geist";');
  });

  it("emits spacing variables with project namespace", () => {
    expect(css).toContain("--token-spacing-1: 0.25rem;");
  });
});

describe("alias resolution and units", () => {
  let css;

  beforeAll(async () => {
    const result = await buildTokens({
      configPath: join(root, "tokens", "fixtures", "pilot.pipeline.config.json"),
      modeOverride: "direct",
      outputPath: join(root, "tmp", "pilot-test.css"),
    });
    css = readFileSync(result.outputPath, "utf8");
  });

  it("resolves alias references to primitive values", () => {
    expect(css).toContain("--primary: #171717;");
  });

  it("places light/dark declarations under correct selectors", () => {
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
  });

  it("preserves CSS units for dimension values", () => {
    expect(css).toContain("--token-spacing-1: 0.25rem;");
    expect(css).toContain("--radius: 0.625rem;");
  });
});

describe("unresolved alias handling", () => {
  it("fails build when alias cannot be resolved", async () => {
    // Create a temp fixture with an unresolved alias
    const tempFixture = {
      color: {
        palette: {
          primary: {
            "600": { $value: "#171717", $type: "color" }
          }
        },
        light: {
          primary: { $value: "{color.palette.primary.999}", $type: "color" }
        }
      }
    };
    const tempPath = join(root, "tmp", "unresolved-alias.tokens.json");
    const tempConfig = {
      mode: "curated",
      sources: { curated: [tempPath], direct: [] },
      output: join(root, "tmp", "unresolved-output.css")
    };
    const tempConfigPath = join(root, "tmp", "unresolved-config.json");
    writeFileSync(tempPath, JSON.stringify(tempFixture, null, 2));
    writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));

    await expect(
      buildTokens({
        configPath: tempConfigPath,
        modeOverride: "curated",
        outputPath: tempConfig.output,
      })
    ).rejects.toThrow(/unresolved|reference/i);
  });
});

describe("direct mode CLI", () => {
  it("builds from direct DTCG input and includes fixture-only marker", async () => {
    const outputPath = join(root, "tmp", "shadcn-token-pilot.css");
    const result = spawnSync("node", [
      "scripts/build-tokens.mjs",
      "--config",
      "tokens/fixtures/pilot.pipeline.config.json",
      "--mode",
      "direct",
      "--output",
      outputPath,
    ], { cwd: root, encoding: "utf8" });

    expect(result.status).toBe(0);
    const css = readFileSync(outputPath, "utf8");
    expect(css).toContain("--pipeline-proof: #abcdef;");
  });

  it("does not include fixture-only marker in curated mode", async () => {
    const outputPath = join(root, "tmp", "shadcn-token-curated.css");
    const result = spawnSync("node", [
      "scripts/build-tokens.mjs",
      "--config",
      "tokens/fixtures/pilot.pipeline.config.json",
      "--mode",
      "curated",
      "--output",
      outputPath,
    ], { cwd: root, encoding: "utf8" });

    expect(result.status).toBe(0);
    const css = readFileSync(outputPath, "utf8");
    expect(css).not.toContain("--pipeline-proof: #abcdef;");
  });
});

describe("source token change isolation", () => {
  it("propagates primitive change through alias to light theme output", async () => {
    // Read the committed pilot fixture
    const fixturePath = join(root, "tokens", "fixtures", "pilot.tokens.json");
    const originalFixture = JSON.parse(readFileSync(fixturePath, "utf8"));

    // Create a modified copy with primitive changed from #171717 to #123456
    const modifiedFixture = JSON.parse(JSON.stringify(originalFixture));
    modifiedFixture.color.palette.primary["600"].$value = "#123456";

    // Write to temp location
    const tempFixturePath = join(root, "tmp", "pilot-modified.tokens.json");
    const tempConfigPath = join(root, "tmp", "pilot-modified-config.json");
    const tempOutputPath = join(root, "tmp", "pilot-modified.css");

    const tempConfig = {
      mode: "curated",
      sources: { curated: [tempFixturePath], direct: [] },
      output: tempOutputPath,
    };

    writeFileSync(tempFixturePath, JSON.stringify(modifiedFixture, null, 2));
    writeFileSync(tempConfigPath, JSON.stringify(tempConfig, null, 2));

    // Build from modified fixture
    const result = await buildTokens({
      configPath: tempConfigPath,
      modeOverride: "curated",
      outputPath: tempOutputPath,
    });

    const css = readFileSync(result.outputPath, "utf8");

    // Assert the aliased light primary token reflects the new primitive value
    expect(css).toContain("--primary: #123456;");

    // Verify the committed fixture is unchanged
    const committedFixture = JSON.parse(readFileSync(fixturePath, "utf8"));
    expect(committedFixture.color.palette.primary["600"].$value).toBe("#171717");

    // Verify the generated app CSS is unchanged (still has original value)
    const appCss = readFileSync(join(root, "src", "styles", "tokens.css"), "utf8");
    expect(appCss).toContain("--primary: #171717;");
  });
});

