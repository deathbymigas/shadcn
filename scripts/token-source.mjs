import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

export async function loadPipelineConfig() {
  const configPath = join(root, "tokens", "pipeline.config.json");
  const content = readFileSync(configPath, "utf8");
  return JSON.parse(content);
}

export function resolveSources(config, modeOverride) {
  const mode = modeOverride ?? config.mode;
  const sources = config.sources;

  if (!sources || typeof sources !== "object" || Object.keys(sources).length === 0) {
    throw new Error("Invalid configuration: sources object is missing or empty");
  }

  const selectedSources = sources[mode];
  if (!selectedSources) {
    throw new Error(`Unknown mode: ${mode}`);
  }

  if (!Array.isArray(selectedSources) || selectedSources.length === 0) {
    throw new Error(`Source list for mode "${mode}" is missing or empty`);
  }

  return selectedSources;
}