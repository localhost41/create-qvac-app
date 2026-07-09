import { execFile } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const TWO_MINUTES = 120_000;
const projectRoot = fileURLToPath(new URL("..", import.meta.url));

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

interface PackResult {
  filename: string;
}

describe("package tarball", () => {
  it(
    "packs an installable CLI tarball",
    async () => {
      const tempDirectory = await mkdtemp(join(tmpdir(), "create-qvac-app-pack-"));
      const packDirectory = join(tempDirectory, "pack");
      const consumerDirectory = join(tempDirectory, "consumer");
      mkdirSync(packDirectory);
      mkdirSync(consumerDirectory);

      const { stdout } = await runCommand(
        "npm",
        ["pack", "--json", "--pack-destination", packDirectory],
        projectRoot,
      );
      const [packResult] = JSON.parse(stdout) as PackResult[];
      const tarballPath = join(packDirectory, packResult.filename);

      expect(existsSync(tarballPath)).toBe(true);

      writeFileSync(
        join(consumerDirectory, "package.json"),
        `${JSON.stringify(
          {
            private: true,
            type: "module",
            dependencies: {
              "@localhostlabs/create-qvac-app": tarballPath,
            },
          },
          null,
          2,
        )}\n`,
      );

      await runCommand("pnpm", ["install"], consumerDirectory);
      const { stderr, stdout: helpText } = await runCommand(
        "pnpm",
        ["exec", "--", "create-qvac-app", "--help"],
        consumerDirectory,
      );

      expect(stderr).toBe("");
      expect(helpText).toContain("create-qvac-app");
      expect(helpText).toContain("--template node-chat");
    },
    TWO_MINUTES,
  );
});
