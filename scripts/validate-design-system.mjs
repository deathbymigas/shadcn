import { spawn } from "node:child_process";
import { constants as osConstants } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Keep only the most recent 64 Ki UTF-16 code units per stream; all output is streamed live.
const MAX_CAPTURED_OUTPUT_LENGTH = 64 * 1024;

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

function appendOutput(capture, chunk) {
  const output = capture.value + chunk;
  if (output.length > MAX_CAPTURED_OUTPUT_LENGTH) {
    capture.value = output.slice(-MAX_CAPTURED_OUTPUT_LENGTH);
    capture.truncated = true;
  } else {
    capture.value = output;
  }
}

export function executeCommand(
  command,
  args,
  {
    cwd,
    stdout: stdoutDestination = process.stdout,
    stderr: stderrDestination = process.stderr,
    signalSource = process,
  },
) {
  return new Promise((resolveResult) => {
    const stdout = { value: "", truncated: false };
    const stderr = { value: "", truncated: false };
    let settled = false;
    let receivedSignal = null;
    let outputError = null;
    let closeResult = null;
    let stdoutEnded = false;
    let stderrEnded = false;
    const listeners = [];
    let killTimer;
    const listen = (emitter, event, handler, once = false) => {
      emitter[once ? "once" : "on"](event, handler);
      listeners.push(() => emitter.removeListener(event, handler));
    };
    const finish = (result) => {
      if (settled) return;
      settled = true;
      for (const removeListener of listeners) removeListener();
      resolveResult(result);
    };
    const finishAfterStreams = () => {
      if (!closeResult || !stdoutEnded || !stderrEnded) return;
      finish({
        ...closeResult,
        stdout: stdout.value,
        stderr: stderr.value,
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated,
      });
    };

    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const failOutput = (error) => {
      if (settled) return;
      outputError = error;
      child.kill("SIGTERM");
      child.stdout.destroy();
      child.stderr.destroy();
      killTimer = setTimeout(() => child.kill("SIGKILL"), 500);
      killTimer.unref();
      finish({
        exitCode: 1,
        signal: null,
        interrupted: false,
        stdout: stdout.value,
        stderr: stderr.value,
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated,
        error: `Output destination failed: ${error.message}`,
      });
    };
    const handleSignal = (signal) => {
      receivedSignal = signal;
      child.kill(signal);
      if (killTimer) clearTimeout(killTimer);
      killTimer = setTimeout(() => child.kill("SIGKILL"), 500);
      killTimer.unref();
    };
    listen(signalSource, "SIGINT", () => handleSignal("SIGINT"), true);
    listen(signalSource, "SIGTERM", () => handleSignal("SIGTERM"), true);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (settled || outputError) return;
      appendOutput(stdout, chunk);
      try {
        if (!stdoutDestination.write(chunk)) {
          child.stdout.pause();
          const resume = () => child.stdout.resume();
          listen(stdoutDestination, "drain", resume, true);
        }
      } catch (error) {
        failOutput(error);
      }
    });
    child.stdout.once("end", () => {
      stdoutEnded = true;
      finishAfterStreams();
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      if (settled || outputError) return;
      appendOutput(stderr, chunk);
      try {
        if (!stderrDestination.write(chunk)) {
          child.stderr.pause();
          const resume = () => child.stderr.resume();
          listen(stderrDestination, "drain", resume, true);
        }
      } catch (error) {
        failOutput(error);
      }
    });
    child.stderr.once("end", () => {
      stderrEnded = true;
      finishAfterStreams();
    });

    const watchDestination = (destination) => {
      const handleError = (error) => failOutput(error);
      const handleClose = () => {
        if (!destination.writableFinished) {
          failOutput(new Error("destination closed before output completed"));
        }
      };
      listen(destination, "error", handleError);
      listen(destination, "close", handleClose);
    };
    watchDestination(stdoutDestination);
    if (stderrDestination !== stdoutDestination) {
      watchDestination(stderrDestination);
    }

    child.once("error", (error) => {
      if (killTimer) clearTimeout(killTimer);
      finish({
        exitCode: 1,
        stdout: stdout.value,
        stderr: stderr.value,
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated,
        error: error.message,
        signal: receivedSignal,
        interrupted: receivedSignal !== null,
      });
    });

    child.once("close", (code, signal) => {
      if (killTimer) clearTimeout(killTimer);
      closeResult = {
        exitCode: code,
        signal: receivedSignal ?? signal,
        interrupted: receivedSignal !== null,
      };
      finishAfterStreams();
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
        : execution.exitCode === 0 && !execution.signal
          ? "passed"
          : "failed",
      exitCode: execution.exitCode,
      signal: execution.signal ?? null,
      durationMs: Date.now() - startedAt,
      stdout: execution.stdout ?? "",
      stderr: execution.stderr ?? "",
      stdoutTruncated: execution.stdoutTruncated ?? false,
      stderrTruncated: execution.stderrTruncated ?? false,
      interrupted: execution.interrupted ?? false,
      ...(execution.error ? { error: execution.error } : {}),
    });

    if (execution.interrupted) break;
  }

  const interruptedResult = results.find((result) => result.interrupted);
  const signal = interruptedResult?.signal ?? null;
  return {
    results,
    interrupted: Boolean(interruptedResult),
    signal,
    exitCode: interruptedResult
      ? 128 + osConstants.signals[signal]
      : results.every((result) => result.status === "passed")
        ? 0
        : 1,
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
  const skipped = VALIDATION_CHECKS.length - result.results.length;
  const summary = `${passed}/${VALIDATION_CHECKS.length} checks passed`;
  console.log(
    result.signal
      ? `${summary} (interrupted by ${result.signal}; ${skipped} checks skipped)`
      : summary,
  );
  process.exitCode = result.exitCode;
}
