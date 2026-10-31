import { Project } from "ts-morph";
import { globSync } from "glob";
import { join } from "node:path";

/**
 * Extract component prop information from TypeScript source files.
 * @param {string} rootDir - Project root directory
 * @returns {Promise<Object>} Map of component name to prop information
 */
export async function extractContractsFromTS(rootDir) {
  const project = new Project({
    tsConfigFilePath: join(rootDir, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });

  const files = globSync("src/components/ui/*.tsx", { cwd: rootDir });
  const results = {};

  for (const file of files) {
    if (file.endsWith(".test.tsx")) continue;
    const sourceFile = project.addSourceFileAtPath(join(rootDir, file));
    const componentName = file
      .replace(".tsx", "")
      .replace("src/components/ui/", "");

    // Find the exported component (function or const)
    const exportedDeclarations = sourceFile.getExportedDeclarations();
    let component = null;

    for (const [, declarations] of exportedDeclarations) {
      for (const decl of declarations) {
        if (
          decl.getKindName() === "FunctionDeclaration" ||
          decl.getKindName() === "VariableDeclaration"
        ) {
          component = decl;
          break;
        }
      }
      if (component) break;
    }

    if (!component) {
      console.warn(`No exported component found in ${file}`);
      continue;
    }

    // Get props from the component - handle destructured parameters
    const properties = {};
    const required = [];
    let hasRestElement = false;

    let props = [];
    if (component.getKindName() === "FunctionDeclaration") {
      props = component.getParameters();
    } else if (component.getKindName() === "VariableDeclaration") {
      const initializer = component.getInitializer();
      if (initializer && initializer.getKindName() === "ArrowFunction") {
        props = initializer.getParameters();
      }
    }

    for (const prop of props) {
      // Handle destructured parameter: { className, variant, ...props }
      // Check if the parameter's compiler node has elements (destructured binding pattern)
      const compilerNode = prop.compilerNode;
      if (
        compilerNode?.name?.elements &&
        Array.isArray(compilerNode.name.elements)
      ) {
        // This is a destructured parameter
        for (const element of compilerNode.name.elements) {
          // Check for rest element (...props)
          if (element.dotDotDotToken) {
            hasRestElement = true;
            continue;
          }

          const propName =
            element.name?.escapedName || element.name?.getText?.();
          if (!propName) continue;

          // Get initializer (default value)
          const initializer = element.initializer;
          const isOptional = !!initializer || element.questionToken;

          // Get default value
          let defaultValue = null;
          if (initializer) {
            try {
              defaultValue = JSON.parse(initializer.getText());
            } catch {
              defaultValue = initializer.getText();
            }
          }

          // Get type - try to infer from the type annotation on the parameter
          // For now, use string as default; we'll get enums from CVA
          let type = "string";
          let enumValues = null;

          // Try to get JSDoc from the binding element
          let description = "";
          if (element.jsDoc && element.jsDoc.length > 0) {
            description = element.jsDoc[0].comment || "";
          }

          const propSchema = { type };
          if (description) propSchema.description = description;
          if (enumValues) propSchema.enum = enumValues;
          if (defaultValue !== null) propSchema.default = defaultValue;

          properties[propName] = propSchema;

          if (!isOptional) {
            required.push(propName);
          }
        }
      } else {
        // Non-destructured parameter (e.g., props)
        const name = prop.getName();
        if (name === "props" || name === "ref") continue;

        const typeNode = prop.getTypeNode();
        let type = "string";
        let enumValues = null;

        if (typeNode) {
          const typeText = typeNode.getText();
          const { jsonType, enum: extractedEnum } =
            mapTsTypeToJsonSchema(typeText);
          type = jsonType;
          enumValues = extractedEnum;
        }

        const isOptional = prop.hasQuestionToken() || prop.hasInitializer();

        let defaultValue = null;
        if (prop.hasInitializer()) {
          const initializer = prop.getInitializer();
          try {
            defaultValue = JSON.parse(initializer.getText());
          } catch {
            defaultValue = initializer.getText();
          }
        }

        let description = "";
        try {
          const jsdocs = prop.getJsDocs?.();
          if (jsdocs && jsdocs.length > 0) {
            description = jsdocs[0].getComment();
          }
        } catch {}

        const propSchema = { type };
        if (description) propSchema.description = description;
        if (enumValues) propSchema.enum = enumValues;
        if (defaultValue !== null) propSchema.default = defaultValue;

        properties[name] = propSchema;

        if (!isOptional) {
          required.push(name);
        }
      }
    }

    // Check for VariantProps (cva) usage - need to parse cva calls
    const cvaVariants = extractCVAVariants(sourceFile);
    if (cvaVariants) {
      for (const [variantName, variantValues] of Object.entries(cvaVariants)) {
        if (!properties[variantName]) {
          properties[variantName] = {
            type: "string",
            enum: variantValues,
            description: `Visual style variant: ${variantName}`,
          };
        } else {
          // Merge enum values into existing property
          properties[variantName].enum = variantValues;
          properties[variantName].type = "string";
          if (!properties[variantName].description) {
            properties[variantName].description =
              `Visual style variant: ${variantName}`;
          }
        }
      }
    }

    results[componentName] = {
      properties,
      required,
      additionalProperties: hasRestElement,
    };
  }

  return results;
}

/**
 * Map TypeScript type to JSON Schema type.
 * @param {string} tsType - TypeScript type text
 * @returns {{jsonType: string, enum: string[]|null}}
 */
function mapTsTypeToJsonSchema(tsType) {
  // Handle union types (enums)
  if (tsType.includes("|")) {
    const parts = tsType.split("|").map((t) => t.trim());
    // Check if all parts are string literals
    const stringLiterals = parts
      .map((p) => p.match(/^['"`](.+)['"`]$/))
      .filter((m) => m)
      .map((m) => m[1]);
    if (stringLiterals.length === parts.length) {
      return { jsonType: "string", enum: stringLiterals };
    }
    // Check if all parts are boolean literals
    const boolLiterals = parts.filter((p) => p === "true" || p === "false");
    if (boolLiterals.length === parts.length) {
      return { jsonType: "boolean", enum: boolLiterals };
    }
    // Fallback to string for other unions
    return { jsonType: "string", enum: null };
  }

  // Handle primitive types
  if (tsType === "boolean") return { jsonType: "boolean", enum: null };
  if (tsType === "number" || tsType === "number")
    return { jsonType: "number", enum: null };
  if (tsType === "string") return { jsonType: "string", enum: null };

  // Default to string
  return { jsonType: "string", enum: null };
}

/**
 * Extract CVA variant definitions from source file.
 * @param {import("ts-morph").SourceFile} sourceFile
 * @returns {Object|null} Map of variant name to allowed values
 */
function extractCVAVariants(sourceFile) {
  const variants = {};
  const variableDeclarations = sourceFile.getVariableDeclarations();

  for (const decl of variableDeclarations) {
    const name = decl.getName();
    if (!name.endsWith("Variants")) continue;

    const initializer = decl.getInitializer();
    if (!initializer || initializer.getKindName() !== "CallExpression")
      continue;

    const callExpr = initializer;
    const args = callExpr.getArguments();
    if (args.length < 2) continue;

    // Second argument should be the variants config object
    const configArg = args[1];
    if (configArg.getKindName() !== "ObjectLiteralExpression") continue;

    const configObj = configArg;
    const variantsProp = configObj.getProperty("variants");
    if (!variantsProp || variantsProp.getKindName() !== "PropertyAssignment")
      continue;

    const variantsObj = variantsProp.getInitializer();
    if (variantsObj.getKindName() !== "ObjectLiteralExpression") continue;

    for (const variantProp of variantsObj.getProperties()) {
      if (variantProp.getKindName() !== "PropertyAssignment") continue;
      const variantName = variantProp.getName();
      const variantValuesObj = variantProp.getInitializer();
      if (variantValuesObj.getKindName() !== "ObjectLiteralExpression")
        continue;

      const values = [];
      for (const valueProp of variantValuesObj.getProperties()) {
        if (valueProp.getKindName() === "PropertyAssignment") {
          // Strip quotes from string literal keys
          let valName = valueProp.getName();
          if (valName.startsWith('"') && valName.endsWith('"')) {
            valName = valName.slice(1, -1);
          } else if (valName.startsWith("'") && valName.endsWith("'")) {
            valName = valName.slice(1, -1);
          }
          values.push(valName);
        }
      }
      if (values.length > 0) {
        variants[variantName] = values;
      }
    }
  }

  return Object.keys(variants).length > 0 ? variants : null;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const rootDir = process.argv[2] || ".";
  extractContractsFromTS(rootDir)
    .then((results) => console.log(JSON.stringify(results, null, 2)))
    .catch((err) => {
      console.error("Extraction failed:", err);
      process.exit(1);
    });
}
