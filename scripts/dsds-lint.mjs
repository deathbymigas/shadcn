import { globSync } from "glob";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Lint all DSDS files in the docs directory.
 */
function lintDSDS() {
  const docsDir = join(process.cwd(), "docs");
  const files = globSync("**/*.dsds.yaml", { cwd: docsDir, absolute: true });

  console.log(`Linting ${files.length} DSDS files...`);

  // Run dsds-validate first (schema validation)
  const validateResult = spawnSync("./node_modules/.bin/dsds-validate", files, {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (validateResult.status !== 0) {
    console.error("Schema validation failed:");
    console.error(validateResult.stdout);
    console.error(validateResult.stderr);
    process.exit(1);
  }

  // Run dsds-lint (advisory rules)
  const lintResult = spawnSync("./node_modules/.bin/dsds-lint", files, {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (lintResult.stdout) {
    console.log(lintResult.stdout);
  }
  if (lintResult.stderr) {
    console.error(lintResult.stderr);
  }

  console.log("\nDSDS validation complete.");
}

lintDSDS();
