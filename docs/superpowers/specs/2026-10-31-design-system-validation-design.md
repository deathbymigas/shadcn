# Design System Validation

**Status:** Revised design — pending review

**Date:** 2026-10-31

## Goal

Make design-system validation a repeatable local and CI operation that reports
the result of each required check and fails clearly when any check fails.
Swamp type and extension searches found no existing design-system validator.
Because this repository only needs local commands and PR/push checks, a custom
Swamp layer would add setup and maintenance without a required Swamp-specific
capability.

## Scope

The validation covers:

1. Token generation with `pnpm tokens:build`
2. Type checking with `pnpm typecheck`
3. Linting with `pnpm lint`
4. Unit tests with `pnpm test`
5. Storybook accessibility tests
6. Playwright visual and end-to-end tests with `pnpm test:e2e`

The target project is `deathbymigas/shadcn`.

## Design

Add a project script, `pnpm validate:design-system`, as the single source of
validation logic. A small Node.js runner invokes the six existing or dedicated
check commands with argument arrays, records a clear pass/fail summary for
each, and continues after failures so one run reports all results. The overall
script exits unsuccessfully if any check fails. It runs from the project root
and does not rely on Swamp's separate nested workspace.

### Accessibility

Use the already-installed `@storybook/addon-a11y` and
`@storybook/addon-vitest`. Configure the Storybook accessibility test mode to
`error`, add a dedicated Vitest configuration that discovers and runs
Storybook stories, and expose it as `pnpm test:a11y`. This keeps accessibility
checks distinct from the existing component and script unit-test suite without
adding an npm dependency.

### Local and CI use

Developers run `pnpm validate:design-system` from the project root. GitHub
Actions runs the same command on pull requests and pushes, preserving native CI
status reporting. CI installs the Chromium browser required by the Storybook
and Playwright checks and uploads the token CSS, contract manifest, and
Playwright report artifacts.

Update the root README with the aggregate validation command and the dedicated
a11y test command. Leave the separate nested Swamp workspace and the existing
incomplete root `.swamp/` files untouched; they are outside this validation
implementation.

## Failure handling

- Each check records its exit code and diagnostics.
- A failed check does not prevent later checks from running.
- The final script result and CI job fail if one or more checks fail.
- Failures to start a command or access the project root are
  reported as errors, not treated as passing checks.
- Token generation uses the existing command and may update the generated
  `src/styles/tokens.css`; generated files remain generated and are not edited
  by hand.

## Validation of this design

Implementation should verify the Storybook a11y test configuration, the
runner's command list and failure aggregation, all six checks, and the complete
aggregate command. Unit tests should confirm that all checks run after an
individual failure and that the final exit code reflects every result.

## Compatibility with prior scope

The token-pipeline design dated 2026-10-30 listed CI setup and visual regression
as out of scope for that token-pipeline work. This design adds CI and visual/E2E
validation for the broader design-system validation task; it does not change
the token pipeline's source or format decisions.

## Swamp decision

Swamp can provide typed inputs, queryable run history, data chaining, and
cross-project reuse. Those capabilities are not required for this repository's
local checks and CI gate, so no custom Swamp extension or Swamp Action is part
of this design. Swamp may be reconsidered if validation results need to feed
other behaviors or be queried across runs/projects.
