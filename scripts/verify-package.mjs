#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));

function fail(message) {
  console.error(`Package verification failed: ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? rootDir,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.env,
    },
  });

  if (result.error) {
    fail(`${command} could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(
      `${command} ${args.join(" ")} exited with ${result.status}\n${result.stderr.trim()}`,
    );
  }

  return result;
}

const binEntries =
  typeof packageJson.bin === "string"
    ? [[packageJson.name, packageJson.bin]]
    : Object.entries(packageJson.bin ?? {});

for (const [name, binPath] of binEntries) {
  if (!existsSync(join(rootDir, binPath))) {
    fail(`bin "${name}" points to missing built file: ${binPath}`);
  }
}

const requiredPublishedFiles = new Set([
  "package.json",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  packageJson.main,
  packageJson.types,
  ...binEntries.map(([, binPath]) => binPath),
]);

const forbiddenPathFragments = [
  "node_modules/",
  "test/",
  "tests/",
  "src/",
  ".git/",
  ".github/",
  "tsconfig",
  "vitest",
];

const npmCacheDir = mkdtempSync(join(tmpdir(), "create-qvac-app-npm-cache-"));
const installRootDir = mkdtempSync(join(tmpdir(), "create-qvac-app-install-"));

try {
  const dryRun = run("npm", ["pack", "--dry-run", "--json"], {
    env: { npm_config_cache: npmCacheDir },
  });

  let dryRunOutput;
  try {
    dryRunOutput = JSON.parse(dryRun.stdout);
  } catch {
    fail(`npm pack dry-run returned invalid JSON\n${dryRun.stdout.trim()}`);
  }

  const packedPackage = dryRunOutput[0];
  const packedFiles = new Set((packedPackage?.files ?? []).map((file) => file.path));

  for (const requiredFile of requiredPublishedFiles) {
    if (!packedFiles.has(requiredFile)) {
      fail(`packed package is missing ${requiredFile}`);
    }
  }

  for (const file of packedFiles) {
    if (forbiddenPathFragments.some((fragment) => file.includes(fragment))) {
      fail(`packed package unexpectedly includes ${file}`);
    }
  }

  if (![...packedFiles].some((file) => file.endsWith(".d.ts"))) {
    fail("packed package does not include type declarations");
  }

  const packResult = run("npm", ["pack", rootDir, "--json"], {
    cwd: installRootDir,
    env: { npm_config_cache: npmCacheDir },
  });

  let packOutput;
  try {
    packOutput = JSON.parse(packResult.stdout);
  } catch {
    fail(`npm pack returned invalid JSON\n${packResult.stdout.trim()}`);
  }

  const tarballName = packOutput[0]?.filename;
  if (typeof tarballName !== "string") {
    fail("npm pack did not report a tarball filename");
  }

  const tarballPath = join(installRootDir, tarballName);
  const installProjectDir = join(installRootDir, "consumer");
  mkdirSync(installProjectDir);
  writeFileSync(
    join(installProjectDir, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
  );

  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarballPath], {
    cwd: installProjectDir,
    env: { npm_config_cache: npmCacheDir },
  });

  const importResult = run(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      [
        `import { name } from ${JSON.stringify(packageJson.name)};`,
        "if (name() !== 'create-qvac-app') throw new Error('unexpected package name export');",
      ].join("\n"),
    ],
    { cwd: installProjectDir },
  );

  if (importResult.stderr.trim() !== "") {
    fail(`installed package import emitted stderr\n${importResult.stderr.trim()}`);
  }

  const helpResult = run("npx", ["--no-install", "create-qvac-app", "--help"], {
    cwd: installProjectDir,
    env: { npm_config_cache: npmCacheDir },
  });

  if (
    !helpResult.stdout.includes("Usage:") ||
    !helpResult.stdout.includes("--template node-chat")
  ) {
    fail(`installed CLI help output was unexpected\n${helpResult.stdout.trim()}`);
  }

  const appDir = join(installRootDir, "smoke-qvac-chat");
  run("npx", ["--no-install", "create-qvac-app", appDir, "--template", "node-chat"], {
    cwd: installProjectDir,
    env: { npm_config_cache: npmCacheDir },
  });

  for (const generatedFile of ["package.json", "README.md", "src/index.ts"]) {
    if (!existsSync(join(appDir, generatedFile))) {
      fail(`generated app is missing ${generatedFile}`);
    }
  }

  run("pnpm", ["install"], { cwd: appDir });
  run("pnpm", ["build"], { cwd: appDir });

  console.log(`Package verification passed: ${packedPackage.filename}`);
} finally {
  rmSync(npmCacheDir, { recursive: true, force: true });
  rmSync(installRootDir, { recursive: true, force: true });
}
