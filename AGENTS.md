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
- Tokens: `pnpm tokens:build` (Figma tokens → CSS vars)
- Storybook: `pnpm storybook`

## Design system

- Use components from `src/components/ui` only. Never create ad-hoc styled divs.
- Tokens live in `tokens/tokens.json` (source of truth from Figma). Generated CSS vars land in `src/styles/tokens.css`. Never hardcode colors/spacing/radii.
- Follow Figma Code Connect mappings in `src/components/ui/*.figma.tsx`. If a component is missing, stop and ask.
- Dark mode via `.dark` class; both themes must be verified.

## Guardrails

- Never edit `src/gen/`, `migrations/`, or `src/styles/tokens.css` (generated — edit `tokens/tokens.json` and run `pnpm tokens:build`).
- Never touch `.env` or `secrets/`.
- Don't add dependencies without asking.
- Ask before changing layout primitives (Grid, Stack, Container).

## Done means

- Matches the linked Figma frame (screenshot attached to PR).
- Empty, loading, and error states implemented.
- Keyboard navigable; passes axe-core.
- Typecheck + lint + tests + visual baselines green.
- Vercel preview URL reviewed.

## Smells to avoid in this file

Keep ≤ 200 lines. Move rare procedures to `.opencode/skills/`. Move style rules to Biome/eslint. Pitch every external reference with why/when to read.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
