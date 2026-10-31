# Token Pipeline Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task, with review checkpoints.

**Goal:** Replace the one-off token CSS generator with a reusable, design-tool-agnostic DTCG-to-CSS pipeline using Style Dictionary and explicit direct/curated input modes.

**Architecture:** Design-tool exports or manual imports enter through a versioned DTCG JSON boundary. Project configuration chooses direct input or a curated project token file; Style Dictionary transforms the selected files into the CSS variables already consumed by the application. No build-time Figma/Penpot calls or vendor-specific sync connectors are added.

**Tech Stack:** Next.js 16, Tailwind CSS v4, DTCG JSON, Style Dictionary, Node.js, Vitest, Storybook.

---

## Files and responsibilities

- `tokens/pipeline.config.json` — project-selected input mode, input file patterns, and generated CSS path.
- `tokens/tokens.json` — existing curated token source; preserve current visual values during the migration.
- `tokens/imports/` — location where a project can place a direct DTCG export; do not add the supplied 19,513-line export.
- `tokens/imports/README.md` — explain the file handoff and DTCG requirement for imported files.
- `tokens/fixtures/pilot.tokens.json` — small, committed DTCG fixture for tests and the visible token-change proof.
- `tokens/fixtures/pilot.pipeline.config.json` — isolated direct-mode configuration for the fixture.
- `scripts/token-source.mjs` — load and validate pipeline configuration and resolve the selected source patterns.
- `scripts/style-dictionary.config.mjs` — Style Dictionary transforms and custom CSS output format, including light/dark selectors and the existing CSS variable contract.
- `scripts/build-tokens.mjs` — CLI entry point; select project mode, invoke Style Dictionary, and report actionable failures.
- `scripts/token-pipeline.test.mjs` — tests for configuration, direct/curated selection, references, units, and generated CSS.
- `vitest.config.ts` — include the script-level token tests in the existing Vitest run.
- `src/styles/tokens.css` — generated output only; never edit by hand.
- `src/app/globals.css` — map generated spacing variables into Tailwind v4's theme namespace where needed.
- `src/stories/Tokens.stories.tsx` — display generated color, spacing, and radius values for visual verification.
- `README.md` and `AGENTS.md` — explain the tool-neutral handoff, project modes, build command, and generated-file guardrail.
- `package.json` and `pnpm-lock.yaml` — add Style Dictionary and retain the `tokens:build` entry point.

## Task 1: Define the DTCG source boundary

**Files:**

- Create: `tokens/pipeline.config.json`
- Create: `scripts/token-source.mjs`
- Create: `scripts/token-pipeline.test.mjs`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Write failing source-selection tests**

Add tests that load `tokens/pipeline.config.json` and verify, and extend
`vitest.config.ts`'s `test.include` to include `scripts/**/*.test.mjs`
alongside the existing `src/**/*.test.{ts,tsx}`:

```js
import { loadPipelineConfig, resolveSources } from "./token-source.mjs";

describe("token source configuration", () => {
  it("selects the curated source by default", async () => {
    const config = await loadPipelineConfig();
    expect(config.mode).toBe("curated");
    expect(resolveSources(config)).toEqual(["tokens/tokens.json"]);
  });

  it("selects direct DTCG inputs when direct mode is requested", async () => {
    const config = await loadPipelineConfig();
    expect(resolveSources(config, "direct")).toEqual([
      "tokens/imports/**/*.json",
    ]);
  });

  it("rejects unknown modes and empty source lists", async () => {
    const config = await loadPipelineConfig();
    expect(() => resolveSources(config, "vendor")).toThrow(/mode/i);
    expect(() => resolveSources({ ...config, sources: {} })).toThrow(/source/i);
  });
});
```

Keep the resolver independent of Figma, Penpot, or Tokens Studio APIs. It only
chooses repository files that contain the agreed DTCG input.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm exec vitest run scripts/token-pipeline.test.mjs`

Expected: FAIL because the config, resolver, and tests are not wired yet.

- [ ] **Step 3: Add the minimal config and resolver**

Use this project config shape:

```json
{
  "mode": "curated",
  "sources": {
    "direct": ["tokens/imports/**/*.json"],
    "curated": ["tokens/tokens.json"]
  },
  "output": "src/styles/tokens.css"
}
```

Export `loadPipelineConfig()` and `resolveSources(config, modeOverride)` from
`scripts/token-source.mjs`. Resolve paths relative to the repository root,
reject unknown modes, and throw a descriptive error when the selected source
list is missing or empty. Let Style Dictionary expand source globs and report
missing files.

- [ ] **Step 4: Include script tests in Vitest and rerun**

Rerun: `pnpm exec vitest run scripts/token-pipeline.test.mjs`

Expected: PASS for default curated mode, explicit direct mode, and invalid
configuration cases.

Run: `pnpm test`

Expected: existing Vitest tests and the new source-selection tests pass.

- [ ] **Step 5: Commit the source boundary**

```bash
git add tokens/pipeline.config.json scripts/token-source.mjs scripts/token-pipeline.test.mjs vitest.config.ts
git commit -m "feat: define token source modes"
```

## Task 2: Add Style Dictionary and prove the CSS output contract

**Files:**

- Create: `tokens/fixtures/pilot.tokens.json`
- Create: `tokens/fixtures/pilot.pipeline.config.json`
- Create: `scripts/style-dictionary.config.mjs`
- Modify: `scripts/build-tokens.mjs`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Test: `scripts/token-pipeline.test.mjs`

- [ ] **Step 1: Record current output as regression expectations**

Add tests that assert generation retains the current app-facing variables:

```js
expect(css).toContain("--background: #ffffff;");
expect(css).toContain("--foreground: #0a0a0a;");
expect(css).toContain("--primary: #171717;");
expect(css).toContain(".dark {");
expect(css).toContain("--background: #0a0a0a;");
expect(css).toContain("--radius: 0.625rem;");
expect(css).toContain('--font-family-sans: "Geist";');
expect(css).toContain("--token-spacing-1: 0.25rem;");
```

Use the existing generated file only as a reference for expected values; do
not edit `src/styles/tokens.css` directly.
Have the test call the exported `buildTokens({ configPath, modeOverride,
outputPath })` function, write output to a temporary directory, and read that
file for assertions.

- [ ] **Step 2: Run the token tests and confirm the new output test fails**

Run: `pnpm exec vitest run scripts/token-pipeline.test.mjs`

Expected: FAIL because Style Dictionary and the output formatter are not
implemented.

- [ ] **Step 3: Add Style Dictionary**

Run: `pnpm add -D style-dictionary`

Expected: `package.json` gains a development dependency and `pnpm-lock.yaml`
is updated. Do not add a vendor-specific Figma or Penpot dependency.

- [ ] **Step 4: Create a small canonical DTCG fixture**

Create `tokens/fixtures/pilot.tokens.json` with:

- A primitive color token.
- A light semantic `color.light.primary` token with value
  `{color.palette.primary.600}` and a dark semantic `color.dark.primary`
  token with a literal value.
- A `color.light.pipeline-proof` marker token present only in this fixture.
- A `dimension` spacing token and a `dimension` radius token.

Set the primitive to `#171717`, the dark primary to `#e5e5e5`, and the spacing
and radius to `0.25rem` and `0.625rem`, respectively. Set the marker to
`#abcdef`. Use valid DTCG syntax. Keep this fixture small and synthetic; do
not copy the full external export into the repository.

Create `tokens/fixtures/pilot.pipeline.config.json` with `mode` set to
`curated`, the fixture as its direct source, and the existing curated source
as its curated source. Its output path can be overridden by tests and CLI
arguments so test builds never overwrite application CSS.

- [ ] **Step 5: Implement the Style Dictionary output format**

In `scripts/style-dictionary.config.mjs`, configure Style Dictionary to:

- Read the selected source patterns from the loaded project config, including
  a fixture config supplied by a test or the CLI.
- Resolve DTCG aliases and fail the build when a reference is unresolved.
- Emit the existing color variable names in `:root` and `.dark`.
- Emit `--radius` from the project's radius token.
- Emit spacing variables under a project-owned namespace such as
  `--token-spacing-1`; do not overwrite Tailwind's base `--spacing` variable.
- Preserve valid CSS units for `dimension` values and use a formatter that
  produces deterministic output.

Use Style Dictionary's supported custom format/transform APIs rather than
reimplementing token traversal and alias resolution.

- [ ] **Step 6: Replace the custom generator implementation**

Update `scripts/build-tokens.mjs` to load the selected project config, create
the Style Dictionary instance, build the CSS platform, and print the generated
path. Keep the existing `pnpm tokens:build` command. Report invalid config,
missing sources, and unresolved aliases with a non-zero exit; do not silently
skip tokens. Export `buildTokens({ configPath, modeOverride, outputPath })`
so Vitest can run isolated builds without overwriting generated files. Parse
`--config` and `--output` in the CLI; expose mode selection in Task 3.

- [ ] **Step 7: Test output, references, and dimensions**

Add assertions that the fixture's alias resolves to its primitive value,
light/dark declarations are placed under the right selectors, spacing and
radius keep their units, and malformed aliases fail.

Run: `pnpm exec vitest run scripts/token-pipeline.test.mjs`

Expected: PASS, including a failure assertion for an unresolved alias.

- [ ] **Step 8: Build the curated source and compare existing variables**

Run:

```bash
pnpm tokens:build
git diff -- src/styles/tokens.css
```

Expected: the generator succeeds; existing app-facing color, radius, and
font variables retain their values; new spacing variables are generated; the
diff is limited to generated output.

- [ ] **Step 9: Commit the Style Dictionary build**

```bash
git add package.json pnpm-lock.yaml scripts/build-tokens.mjs scripts/style-dictionary.config.mjs scripts/token-pipeline.test.mjs tokens/fixtures/pilot.tokens.json tokens/fixtures/pilot.pipeline.config.json src/styles/tokens.css
git commit -m "feat: build design tokens with style dictionary"
```

## Task 3: Wire direct mode and Tailwind spacing

**Files:**

- Modify: `scripts/build-tokens.mjs`
- Modify: `scripts/token-source.mjs`
- Modify: `src/app/globals.css`
- Modify: `scripts/token-pipeline.test.mjs`
- Test: `tokens/fixtures/pilot.tokens.json`

- [ ] **Step 1: Add a failing direct-mode CLI test**

Run the CLI with the fixture config, `--mode direct`, and a temporary output
path. Assert that it emits `--pipeline-proof: #abcdef;`; that marker is not
present in the curated source.

```js
const result = spawnSync(
  "node",
  [
    "scripts/build-tokens.mjs",
    "--config",
    "tokens/fixtures/pilot.pipeline.config.json",
    "--mode",
    "direct",
    "--output",
    outputPath,
  ],
  { cwd: root, encoding: "utf8" },
);

expect(result.status).toBe(0);
expect(readFileSync(outputPath, "utf8")).toContain(
  "--pipeline-proof: #abcdef;",
);
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm exec vitest run scripts/token-pipeline.test.mjs`

Expected: FAIL because the CLI does not yet accept `--mode`.

- [ ] **Step 3: Add explicit direct/curated mode selection**

Expose the existing `buildTokens()` mode override through
`pnpm tokens:build -- --mode direct`. Retain the `--config <path>` and
`--output <path>` options added in Task 2. Keep curated mode as the committed
default. Validate the mode before invoking Style Dictionary and include the
selected source mode in build output.

- [ ] **Step 4: Add Tailwind mappings for generated spacing tokens**

In `src/app/globals.css`, map each pilot spacing variable into Tailwind v4's
`@theme inline` namespace without redefining Tailwind's base spacing scale.
For example, map `--spacing-1: var(--token-spacing-1);`. Keep the generated
variable names and Tailwind theme names distinct.

- [ ] **Step 5: Verify direct and curated builds**

Run:

```bash
pnpm exec vitest run scripts/token-pipeline.test.mjs
pnpm tokens:build
pnpm tokens:build -- --config tokens/fixtures/pilot.pipeline.config.json --mode direct --output /tmp/shadcn-token-pilot.css
```

Expected: tests pass; curated mode generates the app variables, and direct
mode includes the fixture-only marker under the same CSS format.
The direct-mode command writes to `/tmp/shadcn-token-pilot.css`; it must not
change `src/styles/tokens.css`. Remove only that named temporary output after
checking it.

- [ ] **Step 6: Commit direct mode and Tailwind mapping**

```bash
git add scripts/build-tokens.mjs scripts/token-source.mjs scripts/token-pipeline.test.mjs tokens/fixtures/pilot.pipeline.config.json src/app/globals.css
git commit -m "feat: support direct DTCG token inputs"
```

## Task 4: Demonstrate the token checkpoint and document the handoff

**Files:**

- Modify: `src/stories/Tokens.stories.tsx`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Create: `tokens/imports/README.md`
- Modify: `scripts/token-pipeline.test.mjs`

- [ ] **Step 1: Extend the token story**

Add a story that visibly renders the pilot semantic colors, spacing, and
radius from generated CSS variables. Include a light and dark presentation.
Use the generated variables; do not hardcode the sample values in the story.

- [ ] **Step 2: Document the file handoff and source modes**

Update `README.md` and `AGENTS.md` to explain:

1. A design tool or manual process supplies token files to the repository.
2. DTCG JSON is the code-facing contract; non-conforming exports need a
   conversion at the source/import boundary.
3. Direct mode uses selected DTCG import files; curated mode builds the
   project-owned token source.
4. Place direct DTCG imports under `tokens/imports/`; review and commit
   token-source changes, then run `pnpm tokens:build`.
5. Inspect the token stories in Storybook; never edit generated CSS.
6. No build-time Figma/Penpot access or vendor sync service is required.

Do not claim Penpot or other source compatibility unless a representative
export has been tested. Record unavailable exports as unverified, not as
supported.

- [ ] **Step 3: Test a source-token change in isolation**

In Vitest, write a temporary copy of the fixture with its primitive
`color.palette.primary.600` changed from `#171717` to `#123456`. Build it to a
temporary CSS path and assert the aliased light output contains
`--primary: #123456;`. Keep the committed fixture and generated application
CSS unchanged.

- [ ] **Step 4: Run project validation**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build-storybook
```

Expected: all commands pass. Run `pnpm build` if token changes expose an
application build issue; run `pnpm test:e2e` if visual changes affect the
application page.

- [ ] **Step 5: Verify Storybook visually**

Run `pnpm storybook`, open the token story, and inspect light and dark modes.
Temporarily change `color.light.primary.$value` in `tokens/tokens.json` from
`#171717` to `#123456`, run `pnpm tokens:build`, and verify the primary swatch
changes without manual CSS edits. Restore the source value to `#171717`, rerun
`pnpm tokens:build`, and confirm the generated CSS returns to the committed
values. Confirm spacing and radius are visible and correspond to their
generated values. Stop Storybook after the check.

- [ ] **Step 6: Record design-tool compatibility honestly**

Use the supplied Tokens Studio export as an external compatibility sample.
Verify its set selection, alias resolution, units, and metadata before claiming
it can be used directly. If a Penpot export is available, check it against the
same DTCG contract; if not, document that Penpot compatibility remains
unverified. Do not implement live sync connectors in this task.

- [ ] **Step 7: Commit the documented, verified checkpoint**

```bash
git add src/stories/Tokens.stories.tsx README.md AGENTS.md scripts/token-pipeline.test.mjs tokens/fixtures/pilot.tokens.json
git commit -m "docs: document token source workflows"
```

## Self-review against the approved design

- **Tool-neutral source boundary:** Tasks 1, 3, and 4 keep Style Dictionary
  consuming DTCG files and avoid vendor API dependencies.
- **Direct and curated policies:** Tasks 1 and 3 configure and test both;
  curated remains the repository default.
- **Style Dictionary and generated CSS:** Task 2 replaces the custom generator
  and preserves the existing CSS contract.
- **Curated color/spacing/radius pilot:** Tasks 2 and 4 cover those categories,
  light/dark colors, and the Storybook checkpoint.
- **Input errors and references:** Tasks 1 and 2 test invalid configuration
  and unresolved aliases.
- **Figma/Penpot claims:** Task 4 requires sample-based validation and records
  unavailable Penpot input as unverified.
- **No full export, CI, branch protection, or live connector:** explicitly
  excluded from the tasks.

## Potential out-of-scope opportunities — human reference, not agent instructions

These are optional ideas for future discussion. They are not implementation
requirements for this plan; an agent must not start them as part of these
tasks.

- Add live-sync adapters for Figma, Penpot, or another design tool while
  preserving the DTCG file boundary.
- Add guided converters for non-DTCG exports after collecting representative
  files from each tool.
- Produce additional outputs (TypeScript, iOS, Android) when a consumer
  requires them.
- Add CI checks for unresolved references, theme parity, contrast, or raw
  values in components.
- Add Storybook visual regression after the local token-change checkpoint is
  stable.
