# shadcn — designer-led design-to-code pipeline

Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui. Figma is the source of truth for tokens and components.

## Getting started

```bash
pnpm install
pnpm tokens:build   # generate CSS vars from tokens/tokens.json
pnpm dev            # http://localhost:3000
```

## Key commands

| Command                | Purpose                                |
| ---------------------- | -------------------------------------- |
| `pnpm dev`             | Dev server (port 3000)                 |
| `pnpm build`           | Production build                       |
| `pnpm typecheck`       | TypeScript check                       |
| `pnpm lint`            | ESLint                                 |
| `pnpm test`            | Vitest unit tests                      |
| `pnpm test:e2e`        | Playwright E2E + visual regression     |
| `pnpm tokens:build`    | Figma tokens → `src/styles/tokens.css` |
| `pnpm storybook`       | Component review (port 6006)           |
| `pnpm build-storybook` | Build the static Storybook site        |

## Token pipeline

`tokens/tokens.json` (from Figma variables) → `scripts/build-tokens.mjs` → `src/styles/tokens.css` (CSS vars) → Tailwind `@theme inline` → components.

Never edit `src/styles/tokens.css` by hand. Edit `tokens/tokens.json`, then run `pnpm tokens:build`.

Storybook loads the generated token CSS and Tailwind v4 utilities through its Vite configuration. Run `pnpm build-storybook` to verify the production Storybook bundle.

## OpenCode

- Rules: `AGENTS.md` (+ modular rules via `opencode.json` → `instructions`).
- Reviewer subagent: `.opencode/agents/reviewer.md` (invoke with `@reviewer`).
- Permissions/formatters: `opencode.json`.
- Claude Code compat is disabled-friendly: set `OPENCODE_DISABLE_CLAUDE_CODE=1` if you want native-only.

## Environment

Copy `.env.example` to `.env.local` and fill in. Never commit `.env.local`.
