# Design System Validation

**Status:** Approved design

**Date:** 2026-10-31

## Goal

Make design-system validation a repeatable local and CI operation that reports
the result of each required check and fails clearly when any check fails.

## Scope

The validation covers:

1. Token generation with `pnpm tokens:build`
2. Type checking with `pnpm typecheck`
3. Linting with `pnpm lint`
4. Unit tests with `pnpm test`
5. Storybook accessibility tests
6. Playwright visual and end-to-end tests with `pnpm test:e2e`

The target project is `deathbymigas/shadcn`. Swamp's initialized workspace is
the nested `shadcn/` directory, so the project directory must be an explicit
behavior input rather than an implicit current-working-directory assumption.

## Design

Use a local Swamp behavior extension at `shadcn/extensions/models/` as the
single source of validation logic, registered as
`@jessebasham/design-system-validation`. Its `validate` method accepts the
target project directory and runs the six checks in sequence. It invokes
commands with argument arrays rather than shell interpolation, records a
structured result for each check, and continues after a failed check so one
run reports all failures. The overall validation fails when any check exits
unsuccessfully.

The behavior writes an output resource containing the target, check names,
commands, exit statuses, and captured diagnostics. It must not turn a failed
check into a success-shaped result. The target directory is required at run
time to prevent accidentally validating the Swamp workspace instead of the
project.

### Accessibility

Use the already-installed `@storybook/addon-a11y` and
`@storybook/addon-vitest`. Configure the Storybook accessibility test mode to
`error`, add a dedicated Vitest configuration that discovers and runs
Storybook stories, and expose it as `pnpm test:a11y`. This keeps accessibility
checks distinct from the existing component and script unit-test suite without
adding an npm dependency.

### Local and CI use

Developers run the Swamp behavior from the initialized nested workspace and
pass the parent project directory explicitly (for example, `..`). GitHub
Actions invokes the same behavior on pull requests and pushes, preserving CI
status reporting. CI also installs the Chromium browser required by the
Storybook and Playwright checks, and uploads the validation artifacts.

Update the root README with the local Swamp invocation and the new a11y test
command. Leave the existing incomplete root `.swamp/` files untouched; they
are outside the initialized Swamp workspace.

## Failure handling

- Each check records its exit code and diagnostics.
- A failed check does not prevent later checks from running.
- The final behavior result and CI job fail if one or more checks fail.
- Failures to start a command or access the explicitly named project are
  reported as errors, not treated as passing checks.
- Token generation uses the existing command and may update the generated
  `src/styles/tokens.css`; generated files remain generated and are not edited
  by hand.

## Validation of this design

Implementation should verify behavior registration and definition validation,
the Storybook a11y test configuration, all six commands, and a complete
behavior run against the confirmed project. Unit tests should cover command
result aggregation and the requirement to continue after individual failures.

## Compatibility with prior scope

The token-pipeline design dated 2026-10-30 listed CI setup and visual regression
as out of scope for that token-pipeline work. This design adds CI and visual/E2E
validation for the broader design-system validation task; it does not change
the token pipeline's source or format decisions.
