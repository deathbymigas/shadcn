import { readFileSync } from "node:fs";
import { globSync } from "glob";
import { join } from "node:path";
import { extractContractsFromTS } from "./contract-from-ts.mjs";

/**
 * Validate that hand-written contracts match TypeScript component definitions.
 * @param {string} rootDir - Project root directory
 * @returns {Promise<Object>} Validation result with errors
 */
export async function validateContracts(rootDir) {
  const contractFiles = globSync("contracts/*.contract.json", { cwd: rootDir });

  // Extract TypeScript prop information
  const tsContracts = await extractContractsFromTS(rootDir);

  const errors = [];

  for (const file of contractFiles) {
    const componentName = file
      .replace("contracts/", "")
      .replace(".contract.json", "");
    const contractPath = join(rootDir, file);
    const contract = JSON.parse(readFileSync(contractPath, "utf8"));

    const tsContract = tsContracts[componentName];
    if (!tsContract) {
      errors.push({
        component: componentName,
        type: "MISSING_TS_COMPONENT",
        message: `No TypeScript component found for contract ${componentName}`,
      });
      continue;
    }

    // Check each prop in contract exists in TypeScript
    const contractProps = contract.props?.properties || {};
    const tsProps = tsContract.properties || {};
    const tsAdditionalProps = tsContract.additionalProperties === true;

    for (const [propName, contractProp] of Object.entries(contractProps)) {
      const tsProp = tsProps[propName];

      if (!tsProp) {
        // Check if additionalProperties is true (open contract) - either in hand-written contract or extracted TS
        if (
          contract.props?.additionalProperties === true ||
          tsAdditionalProps
        ) {
          continue;
        }
        errors.push({
          component: componentName,
          prop: propName,
          type: "EXTRA_CONTRACT_PROP",
          message: `Contract has prop "${propName}" not found in TypeScript`,
        });
        continue;
      }

      // Validate enum values match
      if (contractProp.enum && tsProp.enum) {
        const contractEnums = new Set(contractProp.enum);
        const tsEnums = new Set(tsProp.enum);
        const missingInTS = [...contractEnums].filter((e) => !tsEnums.has(e));
        const missingInContract = [...tsEnums].filter(
          (e) => !contractEnums.has(e),
        );

        if (missingInTS.length > 0) {
          errors.push({
            component: componentName,
            prop: propName,
            type: "ENUM_MISMATCH_CONTRACT_EXTRA",
            message: `Contract enum has values not in TypeScript: ${missingInTS.join(", ")}`,
          });
        }
        if (missingInContract.length > 0) {
          errors.push({
            component: componentName,
            prop: propName,
            type: "ENUM_MISMATCH_TS_EXTRA",
            message: `TypeScript has enum values not in contract: ${missingInContract.join(", ")}`,
          });
        }
      }

      // Validate type matches
      if (
        contractProp.type &&
        tsProp.type &&
        contractProp.type !== tsProp.type
      ) {
        // Allow string/boolean/number compatibility for now
        const typeGroups = {
          string: ["string"],
          number: ["number", "integer"],
          boolean: ["boolean"],
        };
        let compatible = false;
        for (const [, group] of Object.entries(typeGroups)) {
          if (
            group.includes(contractProp.type) &&
            group.includes(tsProp.type)
          ) {
            compatible = true;
            break;
          }
        }
        if (!compatible) {
          errors.push({
            component: componentName,
            prop: propName,
            type: "TYPE_MISMATCH",
            message: `Type mismatch: contract="${contractProp.type}" vs TypeScript="${tsProp.type}"`,
          });
        }
      }
    }

    // Check for TypeScript props not in contract (when additionalProperties: false)
    if (contract.props?.additionalProperties === false) {
      for (const [propName] of Object.entries(tsProps)) {
        if (!contractProps[propName]) {
          // Skip common React props that are spread
          if (
            ["ref", "key", "children", "className", "style"].includes(propName)
          )
            continue;
          // Skip HTML attribute spread (checked via ComponentProps)
          if (
            propName.startsWith("on") &&
            propName[2] === propName[2]?.toUpperCase()
          )
            continue;

          errors.push({
            component: componentName,
            prop: propName,
            type: "MISSING_CONTRACT_PROP",
            message: `TypeScript has prop "${propName}" not declared in contract (additionalProperties: false)`,
          });
        }
      }
    }

    // Validate required props
    const contractRequired = new Set(contract.props?.required || []);
    const tsRequired = new Set(tsContract.required || []);

    // Props that are commonly required in TypeScript due to destructuring but optional in design
    const designOptionalProps = new Set([
      "className",
      "style",
      "render",
      "children",
    ]);

    for (const req of tsRequired) {
      if (!contractRequired.has(req) && !designOptionalProps.has(req)) {
        errors.push({
          component: componentName,
          prop: req,
          type: "MISSING_REQUIRED_IN_CONTRACT",
          message: `TypeScript requires prop "${req}" but contract doesn't list it as required`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a single component contract against TypeScript.
 * @param {string} componentName - Component name (e.g., "button")
 * @param {Object} contract - Hand-written contract object
 * @param {string} rootDir - Project root directory
 * @returns {Promise<Object>} Validation result
 */
export async function validateContractAgainstTS(
  componentName,
  contract,
  rootDir,
) {
  const tsContracts = await extractContractsFromTS(rootDir);
  const tsContract = tsContracts[componentName];

  if (!tsContract) {
    return {
      valid: false,
      errors: [
        {
          type: "MISSING_TS_COMPONENT",
          message: `No TypeScript component found for ${componentName}`,
        },
      ],
    };
  }

  const errors = [];
  const contractProps = contract.props?.properties || {};
  const tsProps = tsContract.properties || {};
  const tsAdditionalProps = tsContract.additionalProperties === true;

  for (const [propName, contractProp] of Object.entries(contractProps)) {
    const tsProp = tsProps[propName];

    if (!tsProp) {
      if (contract.props?.additionalProperties === true || tsAdditionalProps)
        continue;
      errors.push({
        type: "EXTRA_CONTRACT_PROP",
        message: `Contract has prop "${propName}" not found in TypeScript`,
      });
      continue;
    }

    if (contractProp.enum && tsProp.enum) {
      const contractEnums = new Set(contractProp.enum);
      const tsEnums = new Set(tsProp.enum);
      const missingInTS = [...contractEnums].filter((e) => !tsEnums.has(e));
      const missingInContract = [...tsEnums].filter(
        (e) => !contractEnums.has(e),
      );

      if (missingInTS.length > 0) {
        errors.push({
          type: "ENUM_MISMATCH_CONTRACT_EXTRA",
          message: `Contract enum has values not in TypeScript: ${missingInTS.join(", ")}`,
        });
      }
      if (missingInContract.length > 0) {
        errors.push({
          type: "ENUM_MISMATCH_TS_EXTRA",
          message: `TypeScript has enum values not in contract: ${missingInContract.join(", ")}`,
        });
      }
    }
  }

  if (contract.props?.additionalProperties === false) {
    for (const [propName] of Object.entries(tsProps)) {
      if (!contractProps[propName]) {
        if (["ref", "key", "children", "className", "style"].includes(propName))
          continue;
        if (
          propName.startsWith("on") &&
          propName[2] === propName[2]?.toUpperCase()
        )
          continue;
        // Also skip if TS contract has additionalProperties true
        if (tsAdditionalProps) continue;

        errors.push({
          type: "MISSING_CONTRACT_PROP",
          message: `TypeScript has prop "${propName}" not declared in contract`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = process.argv[2] || ".";
  validateContracts(rootDir)
    .then((result) => {
      if (result.valid) {
        console.log("✓ All contracts match TypeScript");
        process.exit(0);
      } else {
        console.error("✗ Contract validation failed:");
        for (const err of result.errors) {
          console.error(
            `  [${err.component || "unknown"}] ${err.type}: ${err.message}`,
          );
        }
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Validation error:", err);
      process.exit(1);
    });
}
