# shadcn — design-to-code pipeline

Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui. Designer-led: Figma is the source of truth for tokens and components.

## Commands

- Install: `pnpm install`
- Dev: `pnpm dev` (localhost:3000)
- Build: `pnpm build`
- Typecheck: `pnpm tsc --noEmit`
- Lint: `pnpm lint`
- Unit tests: `pnpm test` (vitest)
- E2E/visual: `pnpm test:e2e` (playwright)
- Tokens: `pnpm tokens:build` (Generate CSS vars from token source)
- Storybook: `pnpm storybook`
- Storybook build: `pnpm build-storybook`

## Design system

- Use components from `src/components/ui` only. Never create ad-hoc styled divs.
- Tokens live in `tokens/tokens.json` (curated source) or `tokens/imports/` (direct mode). Generated CSS vars land in `src/styles/tokens.css`. Never hardcode colors/spacing/radii.
- Follow Figma Code Connect mappings in `src/components/ui/*.figma.tsx`. If a component is missing, stop and ask.
- Font family changes require updating `next/font` in `src/app/layout.tsx` to match `tokens.json` → `typography.fontFamily`, then `pnpm tokens:build`.
- Dark mode via `.dark` class; both themes must be verified.
- Storybook loads `src/styles/tokens.css` and compiles Tailwind utilities through `@tailwindcss/vite` in `.storybook/main.ts`. Import both token and global CSS in `.storybook/preview.tsx`; verify rendered light and dark stories, not just a successful build.

## Token Pipeline

The token pipeline is **tool-neutral** and uses **DTCG JSON** as the code-facing contract.

### Architecture

```
Design Tool Export → DTCG JSON (import boundary) → tokens/imports/ (direct)
                                              OR → tokens/tokens.json (curated)
                                                      ↓
                                            Style Dictionary build
                                                      ↓
                                            src/styles/tokens.css
                                                      ↓
                                            Tailwind @theme inline + components
```

### Project Workflow Modes

| Mode                  | Source                     | Description                                                                         |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| **Curated (default)** | `tokens/tokens.json`       | Reviewed, project-owned DTCG source. Upstream export kept separate.                 |
| **Direct**            | `tokens/imports/**/*.json` | Build directly from DTCG imports. Use for rapid iteration from design tool exports. |

### Commands

```bash
# Curated mode (default)
pnpm tokens:build

# Direct mode
pnpm tokens:build -- --mode direct

# Custom config/output
pnpm tokens:build -- --config tokens/fixtures/pilot.pipeline.config.json --mode direct --output /tmp/test.css
```

### Source Contract

- **DTCG JSON** is the interchange format (https://design-tokens.github.io/community-group/format/)
- Non-DTCG exports (Tokens Studio, Figma Variables, Penpot) require conversion at the import boundary
- No build-time Figma/Penpot API calls or vendor sync connectors
- Generated files are **never edited by hand** — edit source, then rebuild

### Design Tool Compatibility

| Tool                     | Status         | Notes                                                                  |
| ------------------------ | -------------- | ---------------------------------------------------------------------- |
| Figma (Tokens Studio)    | **Tested**     | Sample export used for compatibility validation; needs DTCG conversion |
| Figma (native Variables) | **Untested**   | Expected to work with DTCG conversion                                  |
| Penpot                   | **UNVERIFIED** | No representative export tested. Do not claim support.                 |

### Adding/Updating Tokens

**Curated mode:**

1. Edit `tokens/tokens.json`
2. Run `pnpm tokens:build`
3. Verify in Storybook: `pnpm storybook` → Design Tokens

**Direct mode:**

1. Export from design tool
2. Convert to DTCG JSON
3. Place in `tokens/imports/`
4. Run `pnpm tokens:build -- --mode direct`
5. Verify in Storybook

### Guardrails

- Never edit `src/gen/`, `migrations/`, or `src/styles/tokens.css` (generated — edit source tokens and run `pnpm tokens:build`)
- Never touch `.env` or `secrets/`
- Don't add dependencies without asking
- Ask before changing layout primitives (Grid, Stack, Container)

## Done means

- Matches the linked Figma frame (screenshot attached to PR).
- Empty, loading, and error states implemented.
- Keyboard navigable; passes axe-core.
- Typecheck + lint + tests + visual baselines green.
- Vercel preview URL reviewed.

## Smells to avoid in this file

Keep ≤ 200 lines. Move rare procedures into focused `docs/` guides and link them where relevant. Move style rules to lint tooling. Explain when external references are useful.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-cutes the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
