# Design System Contract + DSDS Adoption Plan

> **For agentic workers:** Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task, with review checkpoints.

**Goal:** Adopt the Design System Contract (machine-readable component APIs) and DSDS (documentation for humans, agents, and linters) as the canonical documentation layer above tokens, components, and Figma/Storybook references. Replace ad-hoc Figma Code Connect mappings with standardized contracts; add verifiable, cross-referenced documentation that catches drift automatically.

**Architecture:**

```
tokens/tokens.json (DTCG) ──┐
                            ├───► DSDS token entries (source: ./tokens/tokens.json)
src/components/ui/*.tsx ────┤       │
                            ├───► DSDS component entries (specs: contracts/*.json, uses: tokens)
contracts/*.contract.json ──┘       │
                            │       │
                            └───► DSDS linter (CI) + Docs site + Agent context
```

**Tech Stack:** Design System Contract v0.1 (JSON + JSON Schema), DSDS 0.23 (YAML), `@design-system-docspec/linter`, `ts-morph` for TypeScript↔Contract validation, Vitest, existing token pipeline.

---

## Implementation Status

| Task                                 | Status              | Notes                                                                                                              |
| ------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1. Contract foundation               | Complete            | Local schemas, manifest generator, TypeScript drift validation, and contract tests are present.                    |
| 2. Pilot contracts                   | Complete            | Core component contracts and matching TypeScript APIs are covered.                                                 |
| 3. Full contract coverage            | Complete            | Contracts cover the current documented UI components.                                                              |
| 4. DSDS layer                        | Complete            | System, token, component, and theme manifests are linted.                                                          |
| 5. Agent integration and CI          | Complete            | Repository guidance and CI validation are in place.                                                                |
| 6. Figma Code Connect interop        | Deferred (optional) | No Code Connect mappings or contract adapter are present; the optional hybrid path was not required for adoption.  |
| 7. Full validation and documentation | Complete            | Validation, Storybook review, fresh-conversation smoke test, and workflow/troubleshooting docs are recorded below. |

---

## Files and Responsibilities

| File/Directory                   | Responsibility                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `contracts/`                     | Design System Contract files (one per component) + `manifest.json`                                     |
| `contracts/schemas/`             | Local copies of Contract JSON Schemas for offline validation                                           |
| `docs/`                          | DSDS entries: `system.dsds.yaml`, `tokens/*.dsds.yaml`, `components/*.dsds.yaml`, `themes/*.dsds.yaml` |
| `scripts/contract-from-ts.mjs`   | Extract prop types from TypeScript; merge with hand-written contract                                   |
| `scripts/validate-contracts.mjs` | CI check: TypeScript props match contract; no drift                                                    |
| `scripts/generate-manifest.mjs`  | Generate `manifest.json` with SHA-256 content addresses                                                |
| `scripts/dsds-lint.mjs`          | Wrapper for DSDS linter with project-specific config                                                   |
| `vitest.config.ts`               | Include contract/DSDS tests                                                                            |
| `package.json`                   | Add deps: `@design-system-docspec/linter`, `json-schema`, `ts-morph`, `canonical-json`                 |
| `README.md` / `AGENTS.md`        | Document Contract + DSDS workflow, agent instructions                                                  |
| `.github/workflows/lint.yml`     | Add DSDS lint + contract validation to CI                                                              |

---

## Task 1: Establish Design System Contract Foundation

**Files:**

- Create: `contracts/schemas/component.contract.schema.json`
- Create: `contracts/schemas/manifest.schema.json`
- Create: `contracts/manifest.json`
- Create: `scripts/generate-manifest.mjs`
- Create: `scripts/contract-from-ts.mjs`
- Create: `scripts/validate-contracts.mjs`
- Modify: `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`

### Step 1: Write failing contract schema validation tests

Add tests that validate contract files against the official JSON Schemas:

```js
// scripts/contract.test.mjs
import { readFileSync } from "fs";
import { resolve } from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);

const componentSchema = JSON.parse(readFileSync("contracts/schemas/component.contract.schema.json", "utf8"));
const manifestSchema = JSON.parse(readFileSync("contracts/schemas/manifest.schema.json", "utf8"));

const validateComponent = ajv.compile(componentSchema);
const validateManifest = ajv.compile(manifestSchema);

describe("Design System Contract schemas", () => {
  it("validates a minimal valid component contract", () => {
    const contract = {
      $schema: "https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json",
      contractId: "button",
      component: "Button",
      props: { properties: {}, required: [], additionalProperties: false },
    };
    expect(validateComponent(contract)).toBe(true);
  });

  it("rejects contract with unknown props", () => {
    const contract = {
      $schema: "https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json",
      contractId: "button",
      component: "Button",
      props: { properties: { foo: { type: "string" } }, required: [], additionalProperties: false },
    });
    // Should pass - unknown props allowed when additionalProperties: true
    // But our contracts will use additionalProperties: false
  });

  it("validates manifest with content-addressed artifacts", () => {
    const manifest = {
      $schema: "https://knapsack-oss.github.io/design-system-contract/schemas/v0/manifest.schema.json",
      contractVersion: "0.1.0",
      artifacts: [
        {
          path: "button.contract.json",
          address: "sha256:b11ac43d1cf8120534e96ec2d90c24a4c2d9b20364fe01e27632ee7ad63b7dd4",
          origin: "synced",
        },
      ],
    };
    expect(validateManifest(manifest)).toBe(true);
  });

  it("rejects manifest with invalid SHA format", () => {
    const manifest = {
      $schema: "https://knapsack-oss.github.io/design-system-contract/schemas/v0/manifest.schema.json",
      contractVersion: "0.1.0",
      artifacts: [{ path: "button.contract.json", address: "sha256:not-a-hash", origin: "synced" }],
    };
    expect(validateManifest(manifest)).toBe(false);
  });
});
```

### Step 2: Run focused test and confirm it fails

```bash
pnpm exec vitest run scripts/contract.test.mjs
```

Expected: FAIL — schemas not downloaded, scripts not written.

### Step 3: Download official JSON Schemas

```bash
mkdir -p contracts/schemas
curl -sL https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json \
  -o contracts/schemas/component.contract.schema.json
curl -sL https://knapsack-oss.github.io/design-system-contract/schemas/v0/manifest.schema.json \
  -o contracts/schemas/manifest.schema.json
```

### Step 4: Implement manifest generator

`scripts/generate-manifest.mjs`:

- Reads all `contracts/*.contract.json`
- Canonicalizes each (RFC 8785 / `canonical-json`)
- Computes SHA-256
- Emits `manifest.json` with `contractVersion: "0.1.0"` and `origin: "synced"`

```js
// scripts/generate-manifest.mjs
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import canonicalize from "canonical-json";

const contractsDir = "contracts";
const outputPath = join(contractsDir, "manifest.json");

const files = readdirSync(contractsDir).filter((f) =>
  f.endsWith(".contract.json"),
);
const artifacts = files.map((file) => {
  const content = readFileSync(join(contractsDir, file), "utf8");
  const canonical = canonicalize(JSON.parse(content));
  const hash = createHash("sha256").update(canonical).digest("hex");
  return { path: file, address: `sha256:${hash}`, origin: "synced" };
});

const manifest = {
  $schema:
    "https://knapsack-oss.github.io/design-system-contract/schemas/v0/manifest.schema.json",
  contractVersion: "0.1.0",
  artifacts,
};

writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Generated ${outputPath} with ${artifacts.length} artifacts`);
```

### Step 5: Implement TypeScript→Contract extraction

`scripts/contract-from-ts.mjs`:

- Uses `ts-morph` to parse `src/components/ui/*.tsx`
- Extracts component prop types, JSDoc descriptions, default values
- Outputs a "code-derived" contract fragment

```js
// scripts/contract-from-ts.mjs
import { Project } from "ts-morph";
import { globSync } from "glob";

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const files = globSync("src/components/ui/*.tsx");

const results = {};

for (const file of files) {
  const sourceFile = project.addSourceFileAtPath(file);
  const component = sourceFile.getExportedDeclarations().values().next()
    .value?.[0];
  if (!component) continue;

  const props = component.getProps?.() || [];
  const properties = {};
  const required = [];

  for (const prop of props) {
    const name = prop.getName();
    const type = prop.getType().getText();
    const hasDefault = prop.hasInitializer();
    const jsdoc = prop.getJsDocs()[0]?.getComment() || "";

    properties[name] = {
      type: mapTsTypeToJsonSchema(type),
      description: jsdoc,
    };
    if (!hasDefault && !prop.getNameNode?.().getText().includes("?")) {
      required.push(name);
    }
  }

  const componentName = sourceFile.getBaseName().replace(".tsx", "");
  results[componentName] = {
    properties,
    required,
    additionalProperties: false,
  };
}

function mapTsTypeToJsonSchema(tsType) {
  if (tsType.includes("|")) {
    const enums = tsType.split("|").map((t) => t.trim().replace(/['"]/g, ""));
    if (
      enums.every((e) => /^['"].*['"]$/.test(e) || /^(true|false)$/.test(e))
    ) {
      return { type: "string", enum: enums.map((e) => e.replace(/['"]/g, "")) };
    }
  }
  if (tsType === "boolean") return { type: "boolean" };
  if (tsType === "number") return { type: "number" };
  return { type: "string" };
}

console.log(JSON.stringify(results, null, 2));
```

### Step 6: Implement contract validation (TypeScript ↔ Contract)

`scripts/validate-contracts.mjs`:

- Loads each hand-written contract
- Loads corresponding TypeScript-derived fragment
- Fails if:
  - TypeScript has a prop not in contract (unless `additionalProperties: true`)
  - Contract has a `required` prop not required in TypeScript
  - Contract `enum` values don't match TypeScript union literal types

### Step 7: Run tests and commit

```bash
pnpm exec vitest run scripts/contract.test.mjs
pnpm test
git add contracts/schemas scripts/contract.test.mjs scripts/generate-manifest.mjs scripts/contract-from-ts.mjs scripts/validate-contracts.mjs package.json pnpm-lock.yaml
git commit -m "feat: add Design System Contract schemas and validation"
```

---

## Task 2: Pilot Contracts for Core Components

**Files:**

- Create: `contracts/button.contract.json`
- Create: `contracts/input.contract.json`
- Create: `contracts/dialog.contract.json`
- Create: `contracts/select.contract.json`
- Test: `scripts/contract.test.mjs` (add contract-specific tests)

### Step 1: Write hand-written contracts for 4 pilot components

Use design-led semantics (enum variants, explicit slots, states):

```json
// contracts/button.contract.json
{
  "$schema": "https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json",
  "contractId": "button",
  "component": "Button",
  "description": "A button triggers an action or event when activated.",
  "props": {
    "properties": {
      "variant": {
        "type": "string",
        "enum": [
          "default",
          "destructive",
          "outline",
          "secondary",
          "ghost",
          "link"
        ],
        "default": "default",
        "description": "Visual style variant"
      },
      "size": {
        "type": "string",
        "enum": ["default", "sm", "lg", "icon"],
        "default": "default",
        "description": "Button size"
      },
      "asChild": {
        "type": "boolean",
        "default": false,
        "description": "Render as child component (Radix Slot)"
      },
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "Whether the button is disabled"
      },
      "type": {
        "type": "string",
        "enum": ["button", "submit", "reset"],
        "default": "button"
      }
    },
    "required": [],
    "additionalProperties": false
  },
  "slots": [
    { "name": "default", "a11y": { "nameFrom": "content", "required": true } }
  ],
  "states": ["hover", "focus", "active", "disabled"],
  "shadcnRef": "button"
}
```

Repeat for Input, Dialog, Select with their actual prop APIs.

### Step 2: Add contract-specific tests

```js
// scripts/contract.test.mjs (add to existing)
import buttonContract from "../contracts/button.contract.json" with { type: "json" };

describe("Pilot component contracts", () => {
  it("button contract has correct variant enum", () => {
    expect(buttonContract.props.properties.variant.enum).toEqual([
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
    ]);
  });

  it("button contract has required slots", () => {
    expect(buttonContract.slots).toContainEqual(
      expect.objectContaining({
        name: "default",
        a11y: { nameFrom: "content", required: true },
      }),
    );
  });

  it("button contract matches TypeScript (no drift)", async () => {
    const { validateContractAgainstTS } =
      await import("./validate-contracts.mjs");
    const result = validateContractAgainstTS("button", buttonContract);
    expect(result.valid).toBe(true);
    if (!result.valid) console.log(result.errors);
  });
});
```

### Step 3: Generate manifest and validate

```bash
node scripts/generate-manifest.mjs
node scripts/validate-contracts.mjs
pnpm exec vitest run scripts/contract.test.mjs
```

Expected: All pass. Manifest has 4 artifacts with correct SHAs.

### Step 4: Commit pilot contracts

```bash
git add contracts/button.contract.json contracts/input.contract.json contracts/dialog.contract.json contracts/select.contract.json contracts/manifest.json scripts/contract.test.mjs
git commit -m "feat: add pilot component contracts (button, input, dialog, select)"
```

---

## Task 3: Complete Contract Coverage for All shadcn/ui Components

**Files:**

- Create: `contracts/*.contract.json` (remaining ~36 components)
- Modify: `scripts/contract.test.mjs` (add tests for each)

### Step 1: Inventory all shadcn/ui components

```bash
ls src/components/ui/*.tsx | sed 's/.*\///;s/\.tsx$//' | sort
```

### Step 2: Write contracts in batches of 8–10

For each batch:

1. Write hand-written contracts (design-led enums, slots, states)
2. Run `node scripts/validate-contracts.mjs` — fix drift
3. Run `node scripts/generate-manifest.mjs`
4. Add tests to `scripts/contract.test.mjs`
5. Run `pnpm exec vitest run scripts/contract.test.mjs`
6. Commit batch

### Step 3: Final validation

```bash
node scripts/validate-contracts.mjs  # Must pass with zero drift
node scripts/generate-manifest.mjs
pnpm test  # All tests including contract tests
```

---

## Task 4: Establish DSDS Documentation Layer

**Files:**

- Create: `docs/system.dsds.yaml`
- Create: `docs/tokens/color.dsds.yaml`
- Create: `docs/tokens/spacing.dsds.yaml`
- Create: `docs/tokens/radius.dsds.yaml`
- Create: `docs/components/button.dsds.yaml`
- Create: `docs/components/input.dsds.yaml`
- Create: `docs/components/dialog.dsds.yaml`
- Create: `docs/themes/light-dark.dsds.yaml`
- Create: `scripts/dsds-lint.mjs`
- Modify: `package.json`, `vitest.config.ts`

### Step 1: Write failing DSDS lint tests

```js
// scripts/dsds.test.mjs
import { lint } from "@design-system-docspec/linter";
import { readFileSync } from "fs";
import { globSync } from "glob";

describe("DSDS documentation", () => {
  it("loads all DSDS files without schema errors", async () => {
    const files = globSync("docs/**/*.dsds.yaml");
    const docs = files.map((f) => ({
      path: f,
      content: readFileSync(f, "utf8"),
    }));
    const result = await lint(docs);
    expect(result.errors).toHaveLength(0);
  });

  it("has no unverifiable must-level guidelines (DSDS-14)", async () => {
    const files = globSync("docs/**/*.dsds.yaml");
    const docs = files.map((f) => ({
      path: f,
      content: readFileSync(f, "utf8"),
    }));
    const result = await lint(docs);
    const dsds14 = result.warnings.filter((w) => w.code === "DSDS-14");
    expect(dsds14).toHaveLength(0);
  });

  it("all cross-references resolve (DSDS-11)", async () => {
    const files = globSync("docs/**/*.dsds.yaml");
    const docs = files.map((f) => ({
      path: f,
      content: readFileSync(f, "utf8"),
    }));
    const result = await lint(docs);
    const dsds11 = result.warnings.filter((w) => w.code === "DSDS-11");
    expect(dsds11).toHaveLength(0);
  });
});
```

### Step 2: Add DSDS linter dependency

```bash
pnpm add -D @design-system-docspec/linter yaml
```

### Step 3: Create system entry

```yaml
# docs/system.dsds.yaml
schemaVersion: "0.23.1"
name: "shadcn/ui Design System"
description: "A set of accessible, customizable components built with Radix UI and Tailwind CSS."
entries:
  - kind: system
    id: shadcn-ui
    name: "shadcn/ui"
    description: "The component library for this project."
    owner: "team"
    reviewed: "2026-10-30"
```

### Step 4: Create token entries (pointing to DTCG source)

```yaml
# docs/tokens/color.dsds.yaml
schemaVersion: "0.23.1"
entries:
  - kind: token
    id: color
    name: Color
    description: "Color tokens for light and dark themes."
    source: ../tokens/tokens.json
    sections:
      - kind: guidelines
        for: all
        framing: when-to-use
        items:
          - level: must
            statement: Use semantic color tokens (e.g., color.primary) not palette tokens (e.g., color.blue.500) in components.
            checkedBy: assisted
          - level: should
            statement: Prefer color.foreground/background for text on surfaces.
            checkedBy: manual
```

```yaml
# docs/tokens/spacing.dsds.yaml
schemaVersion: "0.23.1"
entries:
  - kind: token
    id: spacing
    name: Spacing
    description: "Spacing scale tokens."
    source: ../tokens/tokens.json
    sections:
      - kind: guidelines
        for: all
        items:
          - level: must
            statement: Use token spacing variables (--token-spacing-*) not raw values.
            checkedBy: automated
```

```yaml
# docs/tokens/radius.dsds.yaml
schemaVersion: "0.23.1"
entries:
  - kind: token
    id: radius
    name: Border Radius
    description: "Border radius tokens."
    source: ../tokens/tokens.json
```

### Step 5: Create component entries (pointing to contracts + tokens)

```yaml
# docs/components/button.dsds.yaml
schemaVersion: "0.23.1"
entries:
  - kind: component
    id: button
    name: Button
    description: "Triggers an action or event when activated."
    sourceFiles:
      - ../src/components/ui/button.tsx
    specs:
      - href: ../contracts/button.contract.json
        rel: contract
        role: Design System Contract
    traits:
      - id: variant
        type: enum
        values: [default, destructive, outline, secondary, ghost, link]
      - id: size
        type: enum
        values: [default, sm, lg, icon]
      - id: disabled
        type: boolean
    uses:
      - to: color.primary
      - to: color.foreground
      - to: color.background
      - to: radius.md
    combos:
      - id: primary-cta
        traits: { variant: default, size: default }
        description: "Primary call-to-action"
      - id: destructive-action
        traits: { variant: destructive }
        description: "Destructive action (delete, remove)"
    refs:
      - href: https://figma.com/design/.../Button
        rel: design
      - href: https://storybook.example.com/?path=/story/components-button--default
        rel: demo
    sections:
      - kind: guidelines
        for: all
        framing: when-to-use
        items:
          - level: must
            statement: Use <button> for actions, <a> for navigation.
            checkedBy: assisted
          - level: should
            statement: One primary button per screen.
            checkedBy: manual
      - kind: guidelines
        for: agent
        items:
          - level: must-not
            statement: Do not create custom button components; use the Button component from src/components/ui.
            checkedBy: assisted
          - level: must
            statement: Always pass accessible label via children or aria-label when using asChild with icon-only content.
            checkedBy: assisted
```

Repeat for Input, Dialog, Select (pilot), then all remaining components.

### Step 6: Create theme entry

```yaml
# docs/themes/light-dark.dsds.yaml
schemaVersion: "0.23.1"
entries:
  - kind: theme
    id: light-dark
    name: Light / Dark
    description: "System supports light and dark modes via .dark class."
    modes:
      - id: light
        name: Light
      - id: dark
        name: Dark
    tokens:
      - color.background
      - color.foreground
      - color.primary
      - color.muted
      - color.border
    sections:
      - kind: guidelines
        for: all
        items:
          - level: must
            statement: All color tokens must define both light and dark values.
            checkedBy: automated
```

### Step 7: Implement DSDS lint wrapper

```js
// scripts/dsds-lint.mjs
import { lint } from "@design-system-docspec/linter";
import { readFileSync } from "fs";
import { globSync } from "glob";
import process from "process";

const files = globSync("docs/**/*.dsds.yaml");
const docs = files.map((f) => ({ path: f, content: readFileSync(f, "utf8") }));

const result = await lint(docs);

for (const error of result.errors) {
  console.error(`ERROR ${error.code} ${error.path}: ${error.message}`);
}
for (const warning of result.warnings) {
  console.warn(`WARN ${warning.code} ${warning.path}: ${warning.message}`);
}

console.log(
  `\n${files.length} files linted: ${result.errors.length} errors, ${result.warnings.length} warnings.`,
);

if (result.errors.length > 0) process.exit(1);
```

### Step 8: Run tests and commit

```bash
pnpm exec vitest run scripts/dsds.test.mjs
node scripts/dsds-lint.mjs
pnpm test
git add docs scripts/dsds.test.mjs scripts/dsds-lint.mjs package.json pnpm-lock.yaml
git commit -m "feat: add DSDS documentation layer (system, tokens, components, themes)"
```

---

## Task 5: Agent Integration & CI

**Files:**

- Modify: `.github/workflows/lint.yml` (or create)
- Modify: `AGENTS.md`
- Modify: `README.md`

### Step 1: Add CI workflow

```yaml
# .github/workflows/lint.yml
name: Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm tsc --noEmit
      - run: node scripts/validate-contracts.mjs
      - run: node scripts/dsds-lint.mjs
      - run: pnpm test
```

### Step 2: Update AGENTS.md with contract/DSDS instructions

```markdown
## Design System Contract + DSDS

### For AI Agents Working in This Repo

**Before writing any component code:**

1. Read the relevant contract: `contracts/<component>.contract.json`
2. Read the DSDS entry: `docs/components/<component>.dsds.yaml`
3. Check `traits` for valid variant/size values
4. Check `uses` for required tokens
5. Check `for: agent` guidelines for common mistakes

**Contract format:**

- `props.properties` = JSON Schema for props
- `enum` props = variant axes (variant, size, tone, etc.)
- `slots` = named content slots with a11y requirements
- `states` = interactive states to style

**DSDS format:**

- `specs` → contract file
- `uses` → token IDs (from tokens/*.dsds.yaml)
- `refs` → Figma (design), Storybook (demo), shadcn registry
- `for: agent` sections = guidance for YOU
```

### Step 3: Update README with workflow docs

Document:

- How to add a new component (contract + DSDS + component)
- How to update a variant (update contract → validate → regenerate manifest)
- How to run DSDS lint locally
- How the token pipeline connects to DSDS token entries

---

## Task 6: Figma Code Connect Interop (Optional Hybrid)

**Files:**

- Modify: `src/components/ui/*.figma.tsx` (or create adapter)
- Create: `scripts/figma-codeconnect-from-contract.mjs`

### Step 1: Decide on hybrid approach

If keeping Figma Code Connect:

- Contracts remain canonical for agents
- Code Connect reads contracts (or a generated summary) for Figma plugin
- Write adapter that converts contract → Code Connect format

```js
// scripts/figma-codeconnect-from-contract.mjs
// Reads contracts/*.contract.json
// Generates simplified props for Figma Code Connect
// Outputs to src/components/ui/*.figma.gen.tsx (generated, not committed)
```

### Step 2: Validate both work

- Designer uses Figma plugin → sees correct variants
- Agent reads contract → gets same variant list
- Drift caught by `validate-contracts.mjs`

---

## Task 7: Full Project Validation & Documentation

### Step 1: Run full validation suite

```bash
pnpm test           # Vitest (unit + contract + DSDS tests)
pnpm typecheck      # TypeScript
pnpm lint           # ESLint
node scripts/validate-contracts.mjs  # Contract↔TS drift check
node scripts/dsds-lint.mjs           # DSDS lint
pnpm build-storybook                # Storybook builds
```

### Step 2: Visual verification in Storybook

- Open token stories: verify colors/spacing/radius render from generated CSS
- Open component stories: verify variants match contract enums
- Toggle light/dark: verify theme tokens apply

### Step 3: Agent smoke test

In a fresh conversation, ask an agent to:

1. "Add a new variant 'success' to Button"
2. Observe: Agent reads contract → sees variant enum → adds to enum → updates TypeScript → runs validate-contracts → passes
3. "Document the new variant in DSDS"
4. Observe: Agent updates button.dsds.yaml traits + combos → DSDS lint passes

### Step 4: Commit final documentation

```bash
git add .github/workflows/lint.yml AGENTS.md README.md
git commit -m "docs: add Contract + DSDS workflow to CI and agent instructions"
```

### Completion record (2026-10-31)

| Validation                            | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                           | Pass   | 4 test files, 40 tests passed.                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm typecheck`                      | Pass   | `tsc --noEmit` completed successfully.                                                                                                                                                                                                                                                                                                                                                               |
| `pnpm lint`                           | Pass   | ESLint completed successfully.                                                                                                                                                                                                                                                                                                                                                                       |
| `node scripts/validate-contracts.mjs` | Pass   | All contracts match TypeScript.                                                                                                                                                                                                                                                                                                                                                                      |
| `node scripts/dsds-lint.mjs`          | Pass   | 10 files linted, 0 warnings after fixing guideline order.                                                                                                                                                                                                                                                                                                                                            |
| `pnpm build-storybook`                | Pass   | Production Storybook build completed; Vite reported a chunk larger than 500 kB.                                                                                                                                                                                                                                                                                                                      |
| Storybook visual review               | Pass   | Light/dark color stories resolved generated variables; spacing token 1 rendered at 4 px and radius at 10 px. Button stories now expose all six contract variants, including rendered Ghost and Link stories.                                                                                                                                                                                         |
| Fresh-conversation agent smoke test   | Pass   | In an isolated worktree, the agent temporarily added `success` to the Button contract and TypeScript variant, regenerated the manifest, validated contract parity, documented the DSDS trait/combo, and passed DSDS lint. All temporary edits were restored; no commit was made. The smoke-test branch reported three advisory DSDS-19 ordering warnings before the ordering fixes in this worktree. |

Vitest also emitted a Vite `configLoader: 'native'` compatibility warning; it did not affect the test result.

---

## Self-Review Against Approved Design

- **Contract as canonical API:** Tasks 1–3 establish contracts as single source for component props/variants/slots/states
- **Content-addressed manifest:** Task 1 Step 4 generates SHA-256 manifest per spec
- **Design-led semantics:** Task 2 hand-writes contracts with enums, not inferred from TS
- **Drift prevention:** Task 1 Step 6 + CI validates TS ↔ Contract on every commit
- **DSDS above all:** Task 4 creates token/component/theme entries pointing to DTCG, contracts, Figma, Storybook
- **Verifiable guidelines:** Task 4 Step 5 requires `checkedBy` on all `must`/`should` rules
- **Agent guidance:** Task 4 `for: agent` sections + Task 5 AGENTS.md
- **Tool-neutral:** No Figma/Penpot API calls; contracts/DSDS are repository files
- **Interop:** DSDS `specs` → Contract, `uses` → DTCG tokens, `refs` → Figma/Storybook/Registry

---

## Out of Scope (Future Opportunities)

- Live Figma sync that updates contracts from Figma Variables
- DSDS docs site deployment (separate project)
- Visual regression testing via Storybook + Chromatic
- Generating TypeScript types from contracts (reverse of current flow)
- CEM (Custom Elements Manifest) output for web components consumers
- Automated contract generation from Storybook CSF args

---

## Potential Rollback Points

| Checkpoint                   | If Fails                     | Rollback To                                                     |
| ---------------------------- | ---------------------------- | --------------------------------------------------------------- |
| Task 1 (schemas + generator) | Schema validation too strict | Remove schemas, keep custom `.figma.tsx`                        |
| Task 2 (pilot contracts)     | Drift validation too noisy   | Loosen `additionalProperties` or make validation advisory       |
| Task 3 (full coverage)       | Maintenance burden high      | Keep pilot only; generate rest from TS                          |
| Task 4 (DSDS layer)          | Linter too verbose           | Disable DSDS-14 (guideline verifiability) or make warnings-only |
| Task 5 (CI)                  | CI time too long             | Run contract/DSDS validation in separate job                    |
