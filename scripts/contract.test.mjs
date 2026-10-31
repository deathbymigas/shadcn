import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import canonicalize from "canonical-json";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const tempDir = mkdtempSync(join(tmpdir(), "shadcn-contract-test-"));

afterAll(() => rmSync(tempDir, { recursive: true, force: true }));

const ajv = new Ajv({
  strict: "log",
  allErrors: true,
  meta: true,
  schemaId: "auto",
  validateSchema: false, // Skip meta-schema validation
});
addFormats(ajv);

const componentSchema = JSON.parse(
  readFileSync(
    join(root, "contracts/schemas/component.contract.schema.json"),
    "utf8",
  ),
);
const manifestSchema = JSON.parse(
  readFileSync(join(root, "contracts/schemas/manifest.schema.json"), "utf8"),
);

const validateComponent = ajv.compile(componentSchema);
const validateManifest = ajv.compile(manifestSchema);

describe("Design System Contract schemas", () => {
  it("validates a minimal valid component contract", () => {
    const contract = {
      $schema:
        "https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json",
      contractId: "button",
      component: "Button",
      props: { properties: {}, required: [], additionalProperties: false },
    };
    expect(validateComponent(contract)).toBe(true);
  });

  it("rejects contract with invalid contractId format", () => {
    const contract = {
      $schema:
        "https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json",
      contractId: "Button", // Must be lowercase with hyphens
      component: "Button",
      props: { properties: {}, required: [], additionalProperties: false },
    };
    expect(validateComponent(contract)).toBe(false);
  });

  it("rejects contract missing required fields", () => {
    const contract = {
      $schema:
        "https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json",
      contractId: "button",
      // missing component
      props: { properties: {}, required: [], additionalProperties: false },
    };
    expect(validateComponent(contract)).toBe(false);
  });

  it("validates manifest with content-addressed artifacts", () => {
    const manifest = {
      $schema:
        "https://knapsack-oss.github.io/design-system-contract/schemas/v0/manifest.schema.json",
      contractVersion: "0.1.0",
      artifacts: [
        {
          path: "button.contract.json",
          address:
            "sha256:b11ac43d1cf8120534e96ec2d90c24a4c2d9b20364fe01e27632ee7ad63b7dd4",
          origin: "synced",
        },
      ],
    };
    expect(validateManifest(manifest)).toBe(true);
  });

  it("rejects manifest with invalid SHA format", () => {
    const manifest = {
      $schema:
        "https://knapsack-oss.github.io/design-system-contract/schemas/v0/manifest.schema.json",
      contractVersion: "0.1.0",
      artifacts: [
        {
          path: "button.contract.json",
          address: "sha256:not-a-hash",
          origin: "synced",
        },
      ],
    };
    expect(validateManifest(manifest)).toBe(false);
  });

  it("rejects manifest with unknown origin", () => {
    const manifest = {
      $schema:
        "https://knapsack-oss.github.io/design-system-contract/schemas/v0/manifest.schema.json",
      contractVersion: "0.1.0",
      artifacts: [
        {
          path: "button.contract.json",
          address:
            "sha256:b11ac43d1cf8120534e96ec2d90c24a4c2d9b20364fe01e27632ee7ad63b7dd4",
          origin: "unknown",
        },
      ],
    };
    expect(validateManifest(manifest)).toBe(false);
  });
});

describe("canonicalization and SHA-256 content addressing", () => {
  it("produces stable SHA regardless of key order", () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };
    const canon1 = canonicalize(obj1);
    const canon2 = canonicalize(obj2);
    expect(canon1).toBe(canon2);

    const hash1 = createHash("sha256").update(canon1).digest("hex");
    const hash2 = createHash("sha256").update(canon2).digest("hex");
    expect(hash1).toBe(hash2);
  });

  it("produces different SHA when values change", () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };
    const canon1 = canonicalize(obj1);
    const canon2 = canonicalize(obj2);
    const hash1 = createHash("sha256").update(canon1).digest("hex");
    const hash2 = createHash("sha256").update(canon2).digest("hex");
    expect(hash1).not.toBe(hash2);
  });
});

describe("manifest generator", () => {
  let generateManifest;

  beforeAll(async () => {
    // Import after writing the script
    const mod = await import("./generate-manifest.mjs");
    generateManifest = mod.generateManifest;
  });

  it("generates manifest from contract files", async () => {
    // Create temp contract files
    const contract1 = {
      $schema:
        "https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json",
      contractId: "button",
      component: "Button",
      props: { properties: {}, required: [], additionalProperties: false },
    };
    const contract2 = {
      $schema:
        "https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json",
      contractId: "input",
      component: "Input",
      props: { properties: {}, required: [], additionalProperties: false },
    };

    const tempContractsDir = join(tempDir, "contracts");
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(tempContractsDir, { recursive: true }),
    );
    writeFileSync(
      join(tempContractsDir, "button.contract.json"),
      JSON.stringify(contract1, null, 2),
    );
    writeFileSync(
      join(tempContractsDir, "input.contract.json"),
      JSON.stringify(contract2, null, 2),
    );

    const manifest = await generateManifest(tempContractsDir);

    expect(manifest.contractVersion).toBe("0.1.0");
    expect(manifest.artifacts).toHaveLength(2);
    expect(manifest.artifacts[0].path).toBe("button.contract.json");
    expect(manifest.artifacts[0].origin).toBe("synced");
    expect(manifest.artifacts[0].address).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(manifest.artifacts[1].path).toBe("input.contract.json");
    expect(manifest.artifacts[1].origin).toBe("synced");
    expect(manifest.artifacts[1].address).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("validates generated manifest against schema", async () => {
    const contract1 = {
      $schema:
        "https://knapsack-oss.github.io/design-system-contract/schemas/v0/component.contract.schema.json",
      contractId: "button",
      component: "Button",
      props: { properties: {}, required: [], additionalProperties: false },
    };

    const tempContractsDir = join(tempDir, "contracts2");
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(tempContractsDir, { recursive: true }),
    );
    writeFileSync(
      join(tempContractsDir, "button.contract.json"),
      JSON.stringify(contract1, null, 2),
    );

    const manifest = await generateManifest(tempContractsDir);
    expect(validateManifest(manifest)).toBe(true);
  });
});
