import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { name } from "../src/index.js";

const execFileAsync = promisify(execFile);

describe("create-qvac-app", () => {
  it("exports the package name", () => {
    expect(name()).toBe("create-qvac-app");
  });

  it("shows CLI help text", async () => {
    const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
    const { stderr, stdout } = await execFileAsync(process.execPath, [
      cliPath,
      "--help",
    ]);

    expect(stderr).toBe("");
    expect(stdout).toContain("create-qvac-app");
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("--help");
  });
});
