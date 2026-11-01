import { describe, expect, it, vi } from "vitest";
import {
  runValidation,
  VALIDATION_CHECKS,
} from "./validate-design-system.mjs";

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
