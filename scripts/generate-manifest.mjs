import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import canonicalize from "canonical-json";

/**
 * Generate a Design System Contract manifest from a directory of contract files.
 * @param {string} contractsDir - Path to directory containing *.contract.json files
 * @returns {Promise<Object>} The generated manifest object
 */
export async function generateManifest(contractsDir) {
  const files = (await readdir(contractsDir))
    .filter((f) => f.endsWith(".contract.json"))
    .sort(); // Stable ordering

  const artifacts = [];

  for (const file of files) {
    const content = await readFile(join(contractsDir, file), "utf8");
    const parsed = JSON.parse(content);
    const canonical = canonicalize(parsed);
    const hash = createHash("sha256").update(canonical).digest("hex");
    artifacts.push({
      path: file,
      address: `sha256:${hash}`,
      origin: "synced",
    });
  }

  const manifest = {
    $schema:
      "https://knapsack-oss.github.io/design-system-contract/schemas/v0/manifest.schema.json",
    contractVersion: "0.1.0",
    artifacts,
  };

  return manifest;
}

/**
 * Write manifest to disk.
 * @param {string} contractsDir - Path to directory containing *.contract.json files
 * @param {string} outputPath - Path to write manifest.json (default: contractsDir/manifest.json)
 */
export async function writeManifest(contractsDir, outputPath) {
  const manifest = await generateManifest(contractsDir);
  const output = outputPath || join(contractsDir, "manifest.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `Generated ${output} with ${manifest.artifacts.length} artifacts`,
  );
}

function dirname(path) {
  return path.split("/").slice(0, -1).join("/") || ".";
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const contractsDir = process.argv[2] || "contracts";
  const outputPath = process.argv[3];

  writeManifest(contractsDir, outputPath).catch((err) => {
    console.error("Failed to generate manifest:", err);
    process.exit(1);
  });
}
