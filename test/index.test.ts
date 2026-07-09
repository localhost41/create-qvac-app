import { execFile, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { name } from "../src/index.js";

const execFileAsync = promisify(execFile);
const TWO_MINUTES = 120_000;

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ stderr: string; stdout: string }> {
  return execFileAsync(command, args, {
    cwd,
    env: {
      ...process.env,
      CI: "1",
    },
    timeout: TWO_MINUTES,
    maxBuffer: 1024 * 1024 * 10,
  });
}

async function runCliWithInput(
  cliPath: string,
  args: string[],
  input: string,
): Promise<{ code: number | null; stderr: string; stdout: string }> {
  const child = spawn(process.execPath, [cliPath, ...args], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  child.stdin.end(input);

  const code = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });

  return { code, stderr, stdout };
}

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

    const packageJson = JSON.parse(
      readFileSync(join(appDirectory, "package.json"), "utf8"),
    ) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(packageJson.scripts.dev).toBe("pnpm build && pnpm start");
    expect(packageJson.devDependencies).not.toHaveProperty("tsx");
  });

  it(
    "scaffolds an app that installs and builds from a clean directory",
    async () => {
      const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
      const tempDirectory = await mkdtemp(join(tmpdir(), "create-qvac-app-"));
      const appDirectory = join(tempDirectory, "first-run");

      await execFileAsync(process.execPath, [
        cliPath,
        appDirectory,
        "--template",
        "node-chat",
      ]);

      await runCommand("pnpm", ["install"], appDirectory);
      const { stderr, stdout } = await runCommand("pnpm", ["build"], appDirectory);

      expect(`${stdout}${stderr}`).toContain("tsc -p tsconfig.json");
      expect(existsSync(join(appDirectory, "dist/index.js"))).toBe(true);
    },
    TWO_MINUTES,
  );

  it("lets users choose a template", async () => {
    const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
    const tempDirectory = await mkdtemp(join(tmpdir(), "create-qvac-app-"));
    const appDirectory = join(tempDirectory, "picked-template");
    const { code, stderr, stdout } = await runCliWithInput(
      cliPath,
      [appDirectory],
      "1\n",
    );

    expect(code).toBe(0);
    expect(stderr).toBe("");
    expect(stdout).toContain("Choose a template:");
    expect(stdout).toContain("1. node-chat");
    expect(stdout).toContain("Created QVAC node-chat app");
    expect(existsSync(join(appDirectory, "README.md"))).toBe(true);
    expect(existsSync(join(appDirectory, "src/index.ts"))).toBe(true);
  });
});
