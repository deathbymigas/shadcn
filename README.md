# designer-led design-to-code pipeline

Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui. Designer-led: Figma is the source of truth for tokens and components.

## Getting started

```bash
pnpm install
pnpm tokens:build   # generate CSS vars from tokens/tokens.json
pnpm dev            # http://localhost:3000
```

## Key commands

| Command                | Purpose                             |
| ---------------------- | ----------------------------------- |
| `pnpm dev`             | Dev server (port 3000)              |
| `pnpm build`           | Production build                    |
| `pnpm typecheck`       | TypeScript check                    |
| `pnpm lint`            | ESLint                              |
| `pnpm test`            | Vitest unit tests                   |
| `pnpm test:e2e`        | Playwright E2E + visual regression  |
| `pnpm tokens:build`    | Generate CSS vars from token source |
| `pnpm storybook`       | Component review (port 6006)        |
| `pnpm build-storybook` | Build the static Storybook site     |

## Token pipeline

The token pipeline is design-tool-agnostic, for now at least:

```
Design Tool (Figma, Penpot, etc.) → DTCG JSON Export → tokens/imports/ (direct mode)
                                                                   OR
                                                              tokens/tokens.json (curated mode)
                                                                      ↓
                                                        pnpm tokens:build
                                                                      ↓
                                                          src/styles/tokens.css (CSS vars)
                                                                      ↓
                                                        Tailwind @theme inline → components
```

### Source Modes

The pipeline supports two explicit project workflow policies:

- **Curated mode (default)** — Build from `tokens/tokens.json`, a reviewed, project-owned DTCG token source. The upstream design tool export remains separate.
- **Direct mode** — Build directly from selected DTCG files in `tokens/imports/`. Use when you want to build straight from a design tool export (after DTCG conversion).

**DTCG JSON is the code-facing contract.** Non-conforming exports need a conversion step at the import boundary. The pipeline does not call Figma, Penpot, or any design tool at build time.

### Using the Pipeline

1. **Curated workflow (default):**

   ```bash
   # Edit tokens/tokens.json, then:
   pnpm tokens:build
   ```

2. **Direct workflow:**

   ```bash
   # Place DTCG JSON in tokens/imports/, then:
   pnpm tokens:build -- --mode direct
   ```

3. **Verify visually:**
   ```bash
   pnpm storybook
   # Navigate to Design Tokens stories
   ```

### Generated Files

**Never edit generated files by hand:**

- `src/styles/tokens.css` — Generated CSS variables (edit `tokens/tokens.json` or `tokens/imports/*.json` instead)

## Component Contracts and DSDS

Component contracts and DSDS manifests describe the public API and usage guidance alongside each component. The contract is the source of truth for props, variant enums, slots, and states; the DSDS manifest links that contract to token usage, references, and agent guidance. Its `uses` entries point to token IDs declared in `docs/tokens/*.dsds.yaml`; those entries source design tokens from `tokens/tokens.json`, which the token pipeline builds into `src/styles/tokens.css`.

### Adding a component

1. Add `contracts/<component>.contract.json` with its props, slots, and states.
2. Add `docs/components/<component>.dsds.yaml`, linking the contract in `specs` and documenting traits, token usage, references, and guidance.
3. Implement `src/components/ui/<component>.tsx` to match the contract and manifest.
4. Add or update Storybook stories and controls so their variant and size options match the contract enums.
5. Regenerate the content-addressed manifest, then run contract validation, DSDS lint, tests, typecheck, and lint.

### Updating a variant

Update the prop's enum in the contract, then update the TypeScript component, matching DSDS traits/combos, and Storybook controls/stories. Regenerate `contracts/manifest.json` so its content address reflects the contract change, then validate contract/TypeScript parity and lint the DSDS files.

### Local validation

```bash
pnpm test
pnpm typecheck
pnpm lint
node scripts/generate-manifest.mjs
node scripts/validate-contracts.mjs
node scripts/dsds-lint.mjs
pnpm build-storybook
```

For interactive review, run `pnpm storybook`, then inspect the Design Tokens stories (colors, spacing, radius) and component stories in light and dark themes. Storybook imports the generated token stylesheet through `.storybook/preview.tsx`.

### Troubleshooting

- **Contract/TypeScript drift:** Update both the contract enum and the corresponding TypeScript variant definition; rerun `node scripts/validate-contracts.mjs` to see the mismatched prop.
- **Manifest address is stale:** Run `node scripts/generate-manifest.mjs` after editing a contract, then include the resulting `contracts/manifest.json` change.
- **DSDS lint warnings:** Review the named file and rule in the output. Guideline items must be ordered `must`, `should`, `may`, `should-not`, then `must-not`; warnings do not fail the current DSDS lint command.
- **Tokens look like browser defaults in Storybook:** Run `pnpm tokens:build`, confirm `.storybook/preview.tsx` imports `src/styles/tokens.css`, and reload the token story.
- **Light and dark values look identical:** Check the story's `.dark` wrapper and the corresponding `.dark` variables in generated `src/styles/tokens.css`.

## Storybook

Storybook loads the generated token CSS and Tailwind v4 utilities through its Vite configuration. Run `pnpm build-storybook` to verify the production Storybook bundle.

## Agent guidance

Shared project instructions live in `AGENTS.md`. Tool-specific configuration should load those instructions instead of maintaining a separate copy.

## Environment

Copy `.env.example` to `.env.local` and fill in. Never commit `.env.local`.
