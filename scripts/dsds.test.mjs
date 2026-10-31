import { describe, it, expect, beforeAll } from "vitest";
import { globSync } from "glob";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const root = join(__dirname, "..");
const docsDir = join(root, "docs");

describe("DSDS documentation", () => {
  let dsdsFiles;

  beforeAll(() => {
    dsdsFiles = globSync("**/*.dsds.yaml", { cwd: docsDir, absolute: true });
  });

  it("has at least one DSDS file", () => {
    expect(dsdsFiles.length).toBeGreaterThan(0);
  });

  it("all files pass schema validation (dsds-validate)", async () => {
    const result = spawnSync("./node_modules/.bin/dsds-validate", dsdsFiles, {
      cwd: root,
      encoding: "utf8",
    });

    if (result.status !== 0) {
      console.error("dsds-validate output:", result.stdout);
      console.error("dsds-validate error:", result.stderr);
    }

    expect(result.status).toBe(0);
  });

  it("has no DSDS-11 unresolved cross-references", () => {
    const result = spawnSync("./node_modules/.bin/dsds-lint", dsdsFiles, {
      cwd: root,
      encoding: "utf8",
    });

    const output = result.stdout + result.stderr;
    const dsds11Matches = output.match(/DSDS-11/g);
    expect(dsds11Matches).toBeNull();
  });

  it("has no DSDS-14 unverifiable must-level guidelines", () => {
    const result = spawnSync(
      "./node_modules/.bin/dsds-lint",
      [...dsdsFiles, "--json"],
      { cwd: root, encoding: "utf8" },
    );

    const output = JSON.parse(result.stdout);
    const dsds14Findings = output.files.flatMap((f) =>
      f.findings.filter((finding) => finding.rule === "DSDS-14"),
    );
    expect(dsds14Findings).toHaveLength(0);
  });

  it("has no DSDS-13/DSDS-16 missing token descriptions", () => {
    const result = spawnSync(
      "./node_modules/.bin/dsds-lint",
      [...dsdsFiles, "--json"],
      { cwd: root, encoding: "utf8" },
    );

    const output = JSON.parse(result.stdout);
    const dsds13Findings = output.files.flatMap((f) =>
      f.findings.filter((finding) => finding.rule === "DSDS-13"),
    );
    const dsds16Findings = output.files.flatMap((f) =>
      f.findings.filter((finding) => finding.rule === "DSDS-16"),
    );
    expect(dsds13Findings).toHaveLength(0);
    expect(dsds16Findings).toHaveLength(0);
  });

  it("component entries reference valid contract files", () => {
    for (const file of dsdsFiles) {
      const content = readFileSync(file, "utf8");
      if (content.includes("kind: component")) {
        // Check that specs.href points to existing contract
        const specMatch = content.match(/href:\s*(.+\.contract\.json)/);
        if (specMatch) {
          const contractPath = join(
            join(file, "..", ".."),
            specMatch[1].trim(),
          );
          expect(existsSync(contractPath)).toBe(true);
        }
      }
    }
  });

  it("component entries reference valid token IDs", () => {
    const tokenIds = new Set(["color", "spacing", "radius"]);

    for (const file of dsdsFiles) {
      const content = readFileSync(file, "utf8");
      if (content.includes("kind: component")) {
        // Check uses: entries reference valid token IDs
        const usesMatches = content.matchAll(/to:\s*([a-z.]+)/g);
        for (const match of usesMatches) {
          const tokenRef = match[1].trim();
          const baseToken = tokenRef.split(".")[0];
          expect(tokenIds.has(baseToken)).toBe(true);
        }
      }
    }
  });
});
