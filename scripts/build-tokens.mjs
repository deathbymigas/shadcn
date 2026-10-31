import StyleDictionary from "style-dictionary";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSources } from "./token-source.mjs";
import { cssFormat } from "./style-dictionary.config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Register custom format
StyleDictionary.registerFormat(cssFormat);

// Register custom transform to set token.type from $type (for DTCG compatibility)
StyleDictionary.registerTransform({
  name: "dtcg/set-type",
  type: "value",
  filter: (token) => token.$type !== undefined,
  transform: (token) => {
    token.type = token.$type;
  },
});

// Register custom transform to resolve aliases
StyleDictionary.registerTransform({
  name: "resolve-aliases",
  type: "value",
  filter: (token) => {
    const val = token.$value ?? token.value;
    return typeof val === "string" && val.startsWith("{");
  },
  transform: (token, platform, dictionary) => {
    const val = token.$value ?? token.value;
    const ref = val.slice(1, -1); // Remove { and }
    const parts = ref.split(".");
    let current = dictionary.tokens;

    for (const part of parts) {
      if (current && current[part]) {
        current = current[part];
      } else {
        throw new Error(`Unresolved alias reference: ${val} in token ${token.name}`);
      }
    }

    if (current && current.$value !== undefined) {
      return current.$value;
    }
    throw new Error(`Unresolved alias reference: ${val} in token ${token.name}`);
  },
});

/**
 * Build tokens using Style Dictionary
 * @param {Object} options
 * @param {string} options.configPath - Path to pipeline config
 * @param {string} [options.modeOverride] - Override mode (direct|curated)
 * @param {string} [options.outputPath] - Override output path
 * @returns {Promise<{outputPath: string}>}
 */
export async function buildTokens({ configPath, modeOverride, outputPath }) {
  const projectConfig = JSON.parse(readFileSync(configPath, "utf8"));
  const sources = resolveSources(projectConfig, modeOverride);
  const output = outputPath || resolve(root, projectConfig.output);

  // Create Style Dictionary instance
  const sd = new StyleDictionary({
    source: sources.map((src) => resolve(root, src)),
    platforms: {
      css: {
        transforms: [
          "attribute/cti",
          "name/kebab",
          "dtcg/set-type",
          "size/rem",
          "color/css",
          "resolve-aliases",
        ],
        options: {
          usesDtcg: true,
        },
        files: [
          {
            destination: output,
            format: "css/variables",
            options: {
              outputReferences: false,
            },
          },
        ],
      },
    },
    log: {
      verbosity: "silent",
    },
  });

  try {
    await sd.buildPlatform("css");
    console.log(`Wrote ${output}`);
    return { outputPath: output };
  } catch (error) {
    console.error("Token build failed:", error.message);
    throw error;
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  let configPath = join(root, "tokens", "pipeline.config.json");
  let modeOverride;
  let outputPath;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && i + 1 < args.length) {
      configPath = resolve(root, args[i + 1]);
      i++;
    } else if (args[i] === "--mode" && i + 1 < args.length) {
      modeOverride = args[i + 1];
      if (modeOverride !== "direct" && modeOverride !== "curated") {
        console.error(`Invalid mode: ${modeOverride}. Must be "direct" or "curated".`);
        process.exit(1);
      }
      i++;
    } else if (args[i] === "--output" && i + 1 < args.length) {
      outputPath = resolve(root, args[i + 1]);
      i++;
    }
  }

  console.log(`Building tokens in ${modeOverride || "curated (default)"} mode...`);
  await buildTokens({ configPath, modeOverride, outputPath });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});