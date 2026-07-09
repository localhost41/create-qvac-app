#!/usr/bin/env node
import { pathToFileURL } from "node:url";

export const HELP_TEXT = `create-qvac-app

Usage:
  create-qvac-app [options]

Options:
  -h, --help  Show help text
`;

export interface CliIo {
  stdout: Pick<NodeJS.WriteStream, "write">;
  stderr: Pick<NodeJS.WriteStream, "write">;
}

export function runCli(
  args: string[] = process.argv.slice(2),
  io: CliIo = { stdout: process.stdout, stderr: process.stderr },
): number {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    io.stdout.write(HELP_TEXT);
    return 0;
  }

  io.stderr.write(`Unknown option: ${args[0]}\n\n${HELP_TEXT}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli();
}
