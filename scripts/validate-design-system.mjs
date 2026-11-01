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
