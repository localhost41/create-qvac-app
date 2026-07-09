import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("scaffolds a Node TypeScript chat app", async () => {
    const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
    const tempDirectory = await mkdtemp(join(tmpdir(), "create-qvac-app-"));
    const appDirectory = join(tempDirectory, "node-chat");
    const { stderr, stdout } = await execFileAsync(process.execPath, [
      cliPath,
      appDirectory,
      "--template",
      "node-chat",
    ]);

    expect(stderr).toBe("");
    expect(stdout).toContain("Created QVAC node-chat app");
    expect(existsSync(join(appDirectory, "README.md"))).toBe(true);
    expect(existsSync(join(appDirectory, "package.json"))).toBe(true);
    expect(existsSync(join(appDirectory, "src/index.ts"))).toBe(true);

    expect(readFileSync(join(appDirectory, "README.md"), "utf8")).toContain(
      "http://localhost:8000/v1/chat/completions",
    );
    expect(readFileSync(join(appDirectory, "src/index.ts"), "utf8")).toContain(
      "QVAC_BASE_URL",
    );
  });
});
