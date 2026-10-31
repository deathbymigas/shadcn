# designer-led design-to-code pipeline

Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui. Designer-led: Figma is the source of truth for tokens and components.

This project is designed to work with this Figma file template: https://www.figma.com/community/file/1342715840824755935/shadcn-ui-components-with-variables-tailwind-classes-updated-october-2026

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

The token pipeline is **tool-neutral** and **design-tool-agnostic**:

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

The pipeline supports two explicit **project workflow policies**:

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

### Design Tool Compatibility

| Tool                            | Status         | Notes                                                               |
| ------------------------------- | -------------- | ------------------------------------------------------------------- |
| Figma (Tokens Studio export)    | **Tested**     | Used as compatibility sample; DTCG conversion required              |
| Figma (native Variables export) | **Untested**   | Expected to work with DTCG conversion                               |
| Penpot                          | **UNVERIFIED** | No export sample tested; DTCG contract is tool-neutral in principle |

Do not claim compatibility without a tested representative export.

## Storybook

Storybook loads the generated token CSS and Tailwind v4 utilities through its Vite configuration. Run `pnpm build-storybook` to verify the production Storybook bundle.

## Agent guidance

Shared project instructions live in `AGENTS.md`. Tool-specific configuration should load those instructions instead of maintaining a separate copy.

## Environment

Copy `.env.example` to `.env.local` and fill in. Never commit `.env.local`.
