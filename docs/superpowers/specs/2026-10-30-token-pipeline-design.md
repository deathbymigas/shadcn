# Reusable Token Pipeline Design

**Status:** Approved design
**Date:** 2026-10-30

## Goal

Make this repository a reusable design-to-code boilerplate that can work with
different design tools, teams, and project token policies. Projects should be
able to use a direct token export or curate an upstream export without making
the boilerplate depend on Tokens Studio, Figma, Penpot, or another specific
authoring tool.

The first implementation should pilot the curated workflow using the provided
Tokens Studio export as a compatibility example. That export remains outside
the repository; it is not a required project input or a new source of truth.

## Decisions

- **Interchange format:** DTCG JSON is the code-facing interchange contract.
  Source tools may export another format, but any tool-specific conversion
  belongs at the import boundary.
- **Source adapters:** Keep design-tool-specific export, retrieval, and
  conversion outside the token build. An adapter or manual import produces
  DTCG input; Style Dictionary consumes that input without knowing whether it
  came from Figma, Penpot, or another tool.
- **Build tool:** Style Dictionary is the planned transformation/build step.
- **Project workflow policy:** Each project chooses one of two explicit modes:
  - **Direct:** Build from the project's selected DTCG token input.
  - **Curated:** Keep an upstream export distinct from a reviewed,
    project-owned DTCG token source, and build from the curated source.
- **Handoff:** A build consumes files in the repository; it does not fetch
  tokens from a design tool. The baseline workflow is to export/download a
  token file from a supported tool, add or update the appropriate project
  input, review the diff, and commit it. Tool-specific sync may later deliver
  files through the same repository boundary.
- **Output contract:** Generated CSS must continue to provide the custom
  properties the app and Tailwind/shadcn theme currently consume. Generated
  files remain generated and must not be edited by hand.
- **Initial scope:** Pilot the curated workflow first while designing the
  configuration boundary so direct mode can also be supported. Do not require
  a particular design tool, plugin, sync service, or live tool connection.

## Proposed architecture

```text
Figma, Penpot, or another design/export tool
        |
        v
Manual export or source adapter
        |
        v
Versioned DTCG JSON handoff (code-facing boundary)
        |
        +--> direct mode: selected DTCG input ------------------+
        |                                                       |
        +--> curated mode: upstream export -> reviewed DTCG ----+--> Style Dictionary
                                                                    |
                                                                    v
                                                   generated CSS variables
                                                                    |
                                                                    v
                                                 Tailwind/shadcn and Storybook
```

The exact folder names and configuration shape are implementation details to
settle in the implementation plan. The source-adapter boundary should make
the source tool and project policy explicit, normalize inputs to DTCG, keep
upstream files distinguishable from production token inputs, and avoid
duplicating project-specific policy inside the generated CSS.

## Implementation plan

### 1. Inspect and map source exports

Treat the provided 19,513-line Tokens Studio export as an external sample, not
as an approved application token set or a required source tool.

- Inventory token sets, token types, modes, literal values, and aliases.
- Verify whether the export conforms to the DTCG input contract or needs a
  conversion step.
- Validate alias paths and targets, including how set boundaries affect
  resolution.
- Check dimensional values and units before generating CSS.
- Investigate the export's empty `$themes` metadata and its metadata reference
  to a `global` set that is not present as a top-level set.
- Classify sets as possible primitive, semantic/theme, utility, or
  framework-generated material. Treat these labels as hypotheses until the
  source structure and intended use are confirmed.
- Define the source-adapter contract: tool-specific export or retrieval
  produces versioned DTCG input; tool-specific details must not leak into
  Style Dictionary configuration or generated CSS.
- Check a representative Figma export and a Penpot export against the same
  contract when samples are available. If an export requires transformation,
  keep that mapping in its source adapter and record any unsupported
  constructs; do not claim cross-tool compatibility without evidence.

The first audit found candidate primitive palettes in `rdx/colors/*`, semantic
color candidates in `mode/*`, and framework-style utility mappings in `tw/*`.
The `mode/*` sets contain many literal colors; if they are intended as
semantic tokens, those values will not follow primitive palette changes. Do
not rewrite them automatically: first confirm the intended tier mapping and
select the pilot tokens.

### 2. Define project inputs and workflow selection

- Specify how a project supplies DTCG input files and selects direct or
  curated mode.
- Specify how a source adapter or manual import supplies those files, without
  requiring an API connection or a particular vendor.
- Keep original exports and curated production tokens clearly separated in
  curated mode.
- Decide which input files are versioned for each mode and document the
  review/commit workflow.
- Make unsupported or malformed input fail with a clear error rather than
  silently omitting tokens.

The full sample export stays outside the repo. If automated tests need stable
input, create a small representative fixture rather than copying the full
export into the project.

### 3. Implement the Style Dictionary build

- Replace the custom token-to-CSS traversal with Style Dictionary.
- Add the smallest configuration needed to read the selected project input
  and emit the existing CSS variable contract.
- Preserve the app's current light/dark theme selectors and variable names
  unless the pilot identifies a necessary, reviewed mapping change.
- Include the token categories selected for the pilot: color, spacing, and
  radius; include typography where its exported shape can be mapped without
  inventing semantics.
- Verify references resolve and output values have appropriate CSS units.
- Keep generated output in the existing generated CSS location and update
  related documentation and commands.

### 4. Prove the curated pilot end to end

Select a small set of values from the sample export, subject to the audit:

- One primitive color and one semantic color in light and dark themes.
- One spacing value.
- One radius value.

Where the source export does not express a usable primitive-to-semantic
reference, document that finding and use an explicit reviewed mapping in the
curated DTCG input. Do not disguise literal values as aliases.

Then:

1. Build CSS from the curated DTCG input.
2. Verify generated values, alias resolution, units, and light/dark placement.
3. Confirm the application still consumes the expected CSS variables.
4. Build Storybook and inspect the relevant token stories in light and dark
   themes.
5. Change one source color, rebuild, and confirm the Storybook swatch changes
   without editing generated CSS.
6. Add focused tests for the input contract, reference handling, and output
   contract.

### 5. Exercise direct mode and document the boilerplate workflow

- Use the same configuration boundary to build directly from a selected DTCG
  input, without requiring the curated-source workflow.
- Verify both modes produce the agreed CSS contract and report invalid input
  clearly.
- Document, in project-facing README guidance, how to add/update token files,
  select a mode, run the build, and inspect Storybook.
- Describe manual file export as the baseline. Keep Git sync as an optional
  transport that updates repository files, not as a separate build mechanism.
- Document that Figma and Penpot are candidate source tools behind the same
  adapter boundary, while distinguishing verified export compatibility from
  future connector support.

## Acceptance criteria

- A project can select direct or curated mode without switching authoring
  tools or changing component code.
- The source-adapter boundary is tool-neutral; Style Dictionary consumes the
  same DTCG contract regardless of source tool.
- The pipeline consumes DTCG JSON at a documented boundary, or clearly
  identifies the conversion step required for a non-conforming export.
- Invalid input, unresolved aliases, or unsupported values produce explicit
  actionable errors.
- Style Dictionary emits CSS variables consumed by the existing app.
- The curated pilot covers representative color, spacing, and radius tokens,
  with light/dark behavior demonstrated for color.
- A source color change propagates through a build to the appropriate
  Storybook swatch; generated CSS is not hand-edited.
- Focused tests and relevant typecheck, lint, test, and Storybook build
  commands pass.
- The large sample export is not copied into the repo.
- User-facing documentation explains the input handoff and both project
  policies without requiring a specific token authoring plugin.
- Figma and Penpot are represented as candidate adapter sources. Compatibility
  claims are limited to exports actually tested.

## Out of scope for the initial implementation

- Fetching token data directly from design tools during local or CI builds.
- Implementing live Figma, Penpot, or other design-tool sync connectors.
- Requiring Tokens Studio, its Git sync, or any other vendor integration.
- Migrating the entire sample export or treating every exported set as
  application-ready.
- Designing a complete three-tier token taxonomy for every future project.
- Creating component-specific tokens before a concrete component need exists.
- Setting up CI, branch protection, or automated publishing.
- Redesigning application screens or changing component visuals beyond the
  reviewed token pilot.

## Future opportunities — human reference, not agent instructions

These are ideas to revisit if a project needs them. They are not requirements
for the initial implementation and should not be treated as instructions to
an agent to start additional work.

- Add optional live-sync adapters for Figma, Penpot, or other tools, keeping
  the same versioned DTCG boundary.
- Compare Tokens Studio and native Figma Variables exports, plus Penpot
  exports, against the DTCG input contract as sample files become available.
- Add a guided conversion/import command for common export formats.
- Generate additional targets such as TypeScript, iOS, or Android tokens if a
  consumer requires them.
- Add automated checks for theme key parity, contrast pairs, and raw token
  values in components once the project has settled its semantic model.
- Consider visual regression in Storybook/CI after the local checkpoint is
  reliable.
