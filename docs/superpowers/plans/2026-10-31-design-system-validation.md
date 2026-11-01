# Design System Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one local and CI command that runs the existing design-system checks plus the requested type, lint, test, accessibility, and visual/E2E checks.

**Architecture:** A small Node.js runner invokes the repository's existing commands sequentially, captures each result, continues after failures, and exits nonzero if any check fails. GitHub Actions invokes that same package script; Storybook's existing accessibility and Vitest addons provide the a11y check.

**Tech Stack:** Node.js, pnpm, Vitest, Storybook 10, Playwright, GitHub Actions.

---

## Files and responsibilities

- `scripts/validate-design-system.mjs` — command list, sequential runner, result summary, and exit status.
- `scripts/validate-design-system.test.mjs` — unit tests for command ordering, failure aggregation, and command-start errors.
- `vitest.storybook.config.ts` — browser-backed Vitest workspace that runs the configured Storybook stories.
- `.storybook/preview.tsx` — set Storybook accessibility test mode to fail on violations.
- `package.json` — add `test:a11y` and `validate:design-system` scripts; do not add dependencies.
- `.github/workflows/design-system-validation.yml` — install project/browser prerequisites, run the shared aggregate command, and upload artifacts.
- `README.md` — document the aggregate and accessibility commands while retaining direct project-specific validation commands.

Do not edit the generated `src/styles/tokens.css` by hand. Do not edit the separate nested `shadcn/` Swamp workspace or the incomplete root `.swamp/` files.

### Task 1: Enable Storybook accessibility tests

**Files:**

- Create: `vitest.storybook.config.ts`
- Modify: `.storybook/preview.tsx`
- Modify: `package.json`

- [ ] **Step 1: Add the accessibility test command**

Add this entry to `package.json`'s `scripts` object:

```json
"test:a11y": "vitest run --config vitest.storybook.config.ts"
```

- [ ] **Step 2: Run the command to verify the configuration is missing**

Run: `pnpm test:a11y`

Expected: FAIL because `vitest.storybook.config.ts` does not exist yet.

- [ ] **Step 3: Add the Storybook Vitest configuration**

Create `vitest.storybook.config.ts`:

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    workspace: [
      {
        extends: true,
        plugins: [
          storybookTest({ configDir: path.join(dirname, ".storybook") }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
```

- [ ] **Step 4: Make accessibility violations fail the story tests**

In `.storybook/preview.tsx`, change the existing setting:

```ts
test: "todo";
```

to:

```ts
test: "error";
```

- [ ] **Step 5: Run the Storybook accessibility tests**

Run once if Chromium is not already installed:

```bash
pnpm exec playwright install chromium
```

Expected: Chromium installs successfully.

Then run:

```bash
pnpm test:a11y
```

Expected: PASS for all discovered stories with no accessibility violations. If a story fails, use the reported rule and story name to fix the specific source/story issue; do not disable the rule or add blanket exclusions.

- [ ] **Step 6: Commit the accessibility test setup**

```bash
git add package.json vitest.storybook.config.ts .storybook/preview.tsx
git commit -m "test: enable Storybook accessibility checks" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: Add the aggregate validation runner

**Files:**

- Create: `scripts/validate-design-system.test.mjs`
- Create: `scripts/validate-design-system.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write tests for complete check execution and failure aggregation**

Create `scripts/validate-design-system.test.mjs`:

```js
import { describe, expect, it, vi } from "vitest";
import { runValidation, VALIDATION_CHECKS } from "./validate-design-system.mjs";

describe("runValidation", () => {
  it("runs every check in order and fails when any check fails", async () => {
    let callCount = 0;
    const execute = vi.fn(async () => {
      callCount += 1;
      return {
        exitCode: callCount === 2 ? 1 : 0,
        stdout: "",
        stderr: callCount === 2 ? "contract mismatch" : "",
      };
    });

    const result = await runValidation({ cwd: "/project", execute });

    expect(execute).toHaveBeenCalledTimes(8);
    expect(
      execute.mock.calls.map(([command, args]) => [command, args]),
    ).toEqual(VALIDATION_CHECKS.map(({ command, args }) => [command, args]));
    expect(execute).toHaveBeenNthCalledWith(1, "pnpm", ["tokens:build"], {
      cwd: "/project",
    });
    expect(result.results[1]).toMatchObject({
      name: "contracts",
      status: "failed",
      exitCode: 1,
      stderr: "contract mismatch",
    });
    expect(result.exitCode).toBe(1);
  });

  it("records command-start errors and still runs later checks", async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error("spawn failed"))
      .mockResolvedValue({ exitCode: 0, stdout: "", stderr: "" });

    const result = await runValidation({ cwd: "/project", execute });

    expect(execute).toHaveBeenCalledTimes(8);
    expect(result.results[0]).toMatchObject({
      name: "tokens",
      status: "error",
      error: "spawn failed",
    });
    expect(result.results).toHaveLength(8);
    expect(result.exitCode).toBe(1);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm test -- scripts/validate-design-system.test.mjs`

Expected: FAIL because `scripts/validate-design-system.mjs` is not present.

- [ ] **Step 3: Implement the runner**

Create `scripts/validate-design-system.mjs`:

```js
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VALIDATION_CHECKS = [
  { name: "tokens", command: "pnpm", args: ["tokens:build"] },
  {
    name: "contracts",
    command: "node",
    args: ["scripts/validate-contracts.mjs"],
  },
  { name: "dsds", command: "node", args: ["scripts/dsds-lint.mjs"] },
  { name: "typecheck", command: "pnpm", args: ["typecheck"] },
  { name: "lint", command: "pnpm", args: ["lint"] },
  { name: "unit", command: "pnpm", args: ["test"] },
  { name: "a11y", command: "pnpm", args: ["test:a11y"] },
  { name: "e2e", command: "pnpm", args: ["test:e2e"] },
];

function executeCommand(command, args, { cwd }) {
  return new Promise((resolveResult) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveResult(result);
    };

    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      process.stdout.write(chunk);
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });

    child.once("error", (error) => {
      finish({
        exitCode: 1,
        stdout,
        stderr,
        error: error.message,
      });
    });

    child.once("close", (code) => {
      finish({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

export async function runValidation({
  cwd = process.cwd(),
  execute = executeCommand,
} = {}) {
  const results = [];

  for (const check of VALIDATION_CHECKS) {
    const startedAt = Date.now();
    let execution;

    try {
      execution = await execute(check.command, check.args, { cwd });
    } catch (error) {
      execution = {
        exitCode: 1,
        stdout: "",
        stderr: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }

    results.push({
      name: check.name,
      command: check.command,
      args: check.args,
      status: execution.error
        ? "error"
        : execution.exitCode === 0
          ? "passed"
          : "failed",
      exitCode: execution.exitCode,
      durationMs: Date.now() - startedAt,
      stdout: execution.stdout ?? "",
      stderr: execution.stderr ?? "",
      ...(execution.error ? { error: execution.error } : {}),
    });
  }

  return {
    results,
    exitCode: results.every((result) => result.status === "passed") ? 0 : 1,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await runValidation();

  for (const check of result.results) {
    console.log(
      `${check.status.toUpperCase()} ${check.name} (${check.durationMs} ms)`,
    );
    if (check.error) console.error(check.error);
  }

  const passed = result.results.filter(
    (check) => check.status === "passed",
  ).length;
  console.log(`${passed}/${result.results.length} checks passed`);
  process.exitCode = result.exitCode;
}
```

- [ ] **Step 4: Add the aggregate package script**

Add this entry to `package.json`'s `scripts` object:

```json
"validate:design-system": "node scripts/validate-design-system.mjs"
```

- [ ] **Step 5: Run the focused runner tests**

Run: `pnpm test -- scripts/validate-design-system.test.mjs`

Expected: PASS with 2 tests. Confirm the test proves all eight checks are attempted after both a nonzero exit and a command-start error.

- [ ] **Step 6: Commit the runner**

```bash
git add package.json scripts/validate-design-system.mjs scripts/validate-design-system.test.mjs
git commit -m "feat: add design system validation runner" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: Wire the aggregate into GitHub Actions

**Files:**

- Modify: `.github/workflows/design-system-validation.yml`

- [ ] **Step 1: Replace the Swamp-based CI job**

Replace the workflow with:

```yaml
name: Design System Validation

on:
  push:
    branches: [main]
    paths:
      - "contracts/**"
      - "docs/**"
      - "tokens/**"
      - "scripts/**"
      - "src/**"
      - "e2e/**"
      - "public/**"
      - ".storybook/**"
      - "package.json"
      - "pnpm-lock.yaml"
      - "tsconfig.json"
      - "next.config.ts"
      - "eslint.config.mjs"
      - "vitest.config.ts"
      - "vitest.setup.ts"
      - "vitest.storybook.config.ts"
      - "playwright.config.ts"
      - "README.md"
      - ".github/workflows/design-system-validation.yml"
  pull_request:
    paths:
      - "contracts/**"
      - "docs/**"
      - "tokens/**"
      - "scripts/**"
      - "src/**"
      - "e2e/**"
      - "public/**"
      - ".storybook/**"
      - "package.json"
      - "pnpm-lock.yaml"
      - "tsconfig.json"
      - "next.config.ts"
      - "eslint.config.mjs"
      - "vitest.config.ts"
      - "vitest.setup.ts"
      - "vitest.storybook.config.ts"
      - "playwright.config.ts"
      - "README.md"
      - ".github/workflows/design-system-validation.yml"

jobs:
  validate-design-system:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.28.2

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Chromium
        run: pnpm exec playwright install --with-deps chromium

      - name: Run design system validation
        run: pnpm validate:design-system

      - name: Upload validation artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: design-system-validation
          path: |
            src/styles/tokens.css
            contracts/manifest.json
            playwright-report/
            test-results/
          retention-days: 7
```

- [ ] **Step 2: Check workflow formatting**

Run: `pnpm exec prettier --check .github/workflows/design-system-validation.yml`

Expected: PASS. Preserve the existing path-filtered PR/push behavior and verify that no Swamp CLI or Swamp secrets remain in this workflow.

- [ ] **Step 3: Commit the CI integration**

```bash
git add .github/workflows/design-system-validation.yml
git commit -m "ci: run design system validation with pnpm" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 4: Document and verify the complete validation command

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add the new commands to the command table**

Add these rows to the README's Key commands table:

```markdown
| `pnpm test:a11y` | Storybook accessibility tests |
| `pnpm validate:design-system` | Full design-system validation |
```

- [ ] **Step 2: Document the aggregate command and keep manual extras**

Update the README's Local validation section to say:

````markdown
Run the complete design-system gate from the repository root:

```bash
pnpm validate:design-system
```

This runs token generation, contract validation, DSDS lint, typecheck, lint,
unit tests, Storybook accessibility tests, and Playwright visual/E2E tests.
Install Chromium once before the browser checks with
`pnpm exec playwright install chromium`.

The following focused commands remain useful when updating generated or
standalone artifacts:

```bash
node scripts/generate-manifest.mjs
pnpm build-storybook
```
````

- [ ] **Step 3: Format-check the README**

Run: `pnpm exec prettier --check README.md`

Expected: PASS.

- [ ] **Step 4: Run the complete validation command**

Run: `pnpm validate:design-system`

Expected: all eight checks pass and the command exits with status 0. Review any changes to `src/styles/tokens.css` as generated output; do not hand-edit it. If Playwright reports screenshot diffs, inspect them and do not rewrite baselines without user approval.

- [ ] **Step 5: Check the final diff and commit documentation**

Run: `git diff --check`

Expected: no whitespace errors. Review `git status --short` and stage only the intended README change and any generated output that is an expected result of the token build.

```bash
git add README.md
git commit -m "docs: document design system validation" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
