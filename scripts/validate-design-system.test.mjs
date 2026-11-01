import { describe, expect, it, vi } from "vitest";
import {
  executeCommand,
  runValidation,
  VALIDATION_CHECKS,
} from "./validate-design-system.mjs";

const EXPECTED_CHECKS = [
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
    expect(VALIDATION_CHECKS).toEqual(EXPECTED_CHECKS);
    expect(execute.mock.calls).toEqual(
      EXPECTED_CHECKS.map(({ command, args }) => [
        command,
        args,
        { cwd: "/project" },
      ]),
    );
    expect(result.results[1]).toMatchObject({
      name: "contracts",
      status: "failed",
      exitCode: 1,
      stderr: "contract mismatch",
    });
    expect(result.exitCode).toBe(1);
  });

  it("returns success when every check passes", async () => {
    const execute = vi.fn(async () => ({
      exitCode: 0,
      stdout: "",
      stderr: "",
    }));

    const result = await runValidation({ cwd: "/project", execute });

    expect(execute).toHaveBeenCalledTimes(8);
    expect(result.results).toHaveLength(8);
    expect(result.results.every(({ status }) => status === "passed")).toBe(
      true,
    );
    expect(result.exitCode).toBe(0);
  });

  it("preserves signal termination as a failed check", async () => {
    const execute = vi.fn().mockResolvedValue({
      exitCode: null,
      signal: "SIGTERM",
      stdout: "",
      stderr: "",
    });

    const result = await runValidation({ cwd: "/project", execute });

    expect(result.results[0]).toMatchObject({
      status: "failed",
      exitCode: null,
      signal: "SIGTERM",
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

describe("executeCommand", () => {
  it("records signal termination and retains only a bounded output tail", async () => {
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrWrite = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    try {
      const output = "x".repeat(70_000);
      const script = [
        "let writes = 0",
        "const terminate = () => { if (++writes === 2) process.kill(process.pid, 'SIGTERM') }",
        `process.stdout.write(${JSON.stringify(output)}, terminate)`,
        `process.stderr.write(${JSON.stringify(output)}, terminate)`,
      ].join(";");
      const result = await executeCommand(process.execPath, ["-e", script], {
        cwd: process.cwd(),
      });

      expect(result.exitCode).toBeNull();
      expect(result.signal).toBe("SIGTERM");
      expect(result.stdout).toHaveLength(64 * 1024);
      expect(result.stderr).toHaveLength(64 * 1024);
      expect(result.stdoutTruncated).toBe(true);
      expect(result.stderrTruncated).toBe(true);
      expect(stdoutWrite).toHaveBeenCalled();
      expect(stderrWrite).toHaveBeenCalled();
    } finally {
      stdoutWrite.mockRestore();
      stderrWrite.mockRestore();
    }
  });
});
