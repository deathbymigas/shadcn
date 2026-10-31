# Token Imports Directory

This directory is for **direct DTCG token imports** from design tools or manual processes.

## How the Handoff Works

1. **Design tool or manual process** produces a token export file
2. **Export is converted to DTCG JSON** (the code-facing contract) at the import boundary
3. **Place DTCG JSON files here** under `tokens/imports/`
4. **Review and commit** the changes
5. **Run `pnpm tokens:build -- --mode direct`** to generate CSS variables

## Key Principles

- **DTCG JSON is the contract** — The token pipeline consumes [Design Tokens Community Group (DTCG) format](https://design-tokens.github.io/community-group/format/). Non-conforming exports (e.g., Tokens Studio, Figma Variables, Penpot) must be converted before placing files here.
- **No build-time Figma/Penpot access** — The pipeline reads committed files only. No API calls, no live sync connectors.
- **Tool-neutral boundary** — The same DTCG input works regardless of source tool (Figma, Penpot, manual, etc.).
- **Generated files are never edited by hand** — Edit source JSON, then run `pnpm tokens:build`.

## Direct Mode vs Curated Mode

| Mode        | Source                     | Use Case                                                         |
| ----------- | -------------------------- | ---------------------------------------------------------------- |
| **Direct**  | `tokens/imports/**/*.json` | Build directly from a design tool export (after DTCG conversion) |
| **Curated** | `tokens/tokens.json`       | Reviewed, project-owned token source (default)                   |

Curated mode is the default. To use direct mode:

```bash
pnpm tokens:build -- --mode direct
```

## Directory Structure

```
tokens/
├── imports/              # Direct DTCG imports (you place files here)
│   └── *.json           # One or more DTCG token files
├── fixtures/            # Test fixtures (committed, do not modify)
├── tokens.json          # Curated project token source (default source)
├── pipeline.config.json # Pipeline configuration
└── pipeline.config.json # Pipeline configuration
```

## Adding a New Token Import

1. Export tokens from your design tool
2. Convert to DTCG JSON format (see `tokens/fixtures/pilot.tokens.json` for structure)
3. Place the `.json` file(s) in this directory
4. Review the diff
5. Commit
6. Run `pnpm tokens:build -- --mode direct`
7. Verify in Storybook: `pnpm storybook` → Design Tokens → PilotTokens

## Verification

After building, verify the generated CSS in:

- `src/styles/tokens.css` (generated output)
- Storybook: `pnpm storybook` → Design Tokens stories

## Penpot Compatibility

**UNVERIFIED** — Penpot export compatibility has not been tested. This directory structure and the DTCG contract are designed to be tool-neutral, but no Penpot export sample has been validated. Do not claim Penpot support without testing a representative export.

## Converting Non-DTCG Exports

If your design tool exports a different format (Tokens Studio, Figma Variables, etc.), you must convert it to DTCG JSON before placing it here. The conversion logic belongs at the import boundary, not in the pipeline.
