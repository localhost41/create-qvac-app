#!/usr/bin/env node
import { mkdirSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import type { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";

export const HELP_TEXT = `create-qvac-app

Usage:
  create-qvac-app <project-directory> [options]

Options:
  --template node-chat  Scaffold a Node TypeScript QVAC chat app without prompting
  -h, --help            Show help text
`;

export interface CliIo {
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;
}

const NODE_CHAT_TEMPLATE = "node-chat";
const TEMPLATES = [
  {
    name: NODE_CHAT_TEMPLATE,
    description: "Node TypeScript QVAC chat app",
    create: createNodeChatApp,
  },
] as const;

type TemplateName = (typeof TEMPLATES)[number]["name"];

function packageNameFromDirectory(projectDirectory: string): string {
  return basename(resolve(projectDirectory))
    .toLowerCase()
    .replace(/^[._]+/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "qvac-chat-app";
}

function writeProjectFile(
  projectRoot: string,
  relativePath: string,
  contents: string,
): void {
  const destination = join(projectRoot, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, contents);
}

function createNodeChatApp(projectDirectory: string): void {
  const projectRoot = resolve(projectDirectory);
  mkdirSync(projectRoot, { recursive: true });

  if (readdirSync(projectRoot).length > 0) {
    throw new Error(`Target directory is not empty: ${projectDirectory}`);
  }

  const packageName = packageNameFromDirectory(projectDirectory);

  writeProjectFile(
    projectRoot,
    "package.json",
    `${JSON.stringify(
      {
        name: packageName,
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          dev: "pnpm build && pnpm start",
          build: "tsc -p tsconfig.json",
          start: "node dist/index.js",
        },
        devDependencies: {
          "@types/node": "^26.0.0",
          typescript: "^5.9.0",
        },
      },
      null,
      2,
    )}\n`,
  );

  writeProjectFile(
    projectRoot,
    "README.md",
    `# ${packageName}

Node TypeScript QVAC chat example.

## Run

Start the QVAC local HTTP server, then run:

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

The example sends a single chat request to \`http://127.0.0.1:11434/v1/chat/completions\`.
Set \`QVAC_BASE_URL\` to use a different local endpoint.
`,
  );

  writeProjectFile(
    projectRoot,
    "tsconfig.json",
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          esModuleInterop: true,
          outDir: "dist",
          skipLibCheck: true,
        },
        include: ["src"],
      },
      null,
      2,
    )}\n`,
  );

  writeProjectFile(
    projectRoot,
    "src/index.ts",
    `const baseUrl = process.env.QVAC_BASE_URL ?? "http://127.0.0.1:11434";

function chatCompletionsUrl(rawBaseUrl: string): string {
  const normalized = rawBaseUrl.replace(/\\/+$/, "");
  return normalized.endsWith("/v1")
    ? \`\${normalized}/chat/completions\`
    : \`\${normalized}/v1/chat/completions\`;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

async function main(): Promise<void> {
  const endpoint = chatCompletionsUrl(baseUrl);
  let response: Response;
  try {
    response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "qvac-local",
      messages: [
        {
          role: "user",
          content: "Say hello from a Node TypeScript QVAC app.",
        },
      ],
    }),
  });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      \`QVAC request failed at \${endpoint}. Is QVAC running? Check QVAC_BASE_URL. \${reason}\`,
    );
  }

  if (!response.ok) {
    throw new Error(\`QVAC request failed at \${endpoint}: \${response.status} \${response.statusText}\`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const message = data.choices?.[0]?.message?.content ?? "(no response text)";
  console.log(message);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
`,
  );
}

function isTemplateName(value: string): value is TemplateName {
  return TEMPLATES.some((template) => template.name === value);
}

async function pickTemplate(io: CliIo): Promise<TemplateName | undefined> {
  io.stdout.write("Choose a template:\n");

  TEMPLATES.forEach((template, index) => {
    io.stdout.write(`  ${index + 1}. ${template.name} - ${template.description}\n`);
  });

  const reader = createInterface({
    input: io.stdin,
    output: io.stdout,
  });

  try {
    const answer = (await reader.question("Template: ")).trim();
    const selectedIndex = Number.parseInt(answer, 10);

    if (
      Number.isInteger(selectedIndex) &&
      selectedIndex >= 1 &&
      selectedIndex <= TEMPLATES.length
    ) {
      return TEMPLATES[selectedIndex - 1].name;
    }

    if (isTemplateName(answer)) {
      return answer;
    }

    io.stderr.write(`Unknown template: ${answer}\n\n${HELP_TEXT}`);
    return undefined;
  } finally {
    reader.close();
  }
}

export async function runCli(
  args: string[] = process.argv.slice(2),
  io: CliIo = {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
  },
): Promise<number> {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    io.stdout.write(HELP_TEXT);
    return 0;
  }

  const [projectDirectory, ...options] = args;
  let template: TemplateName | undefined;

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];

    if (option === "--template") {
      const value = options[index + 1];

      if (!value) {
        io.stderr.write(`Missing value for --template\n\n${HELP_TEXT}`);
        return 1;
      }

      if (!isTemplateName(value)) {
        io.stderr.write(`Unknown template: ${value}\n\n${HELP_TEXT}`);
        return 1;
      }

      template = value;
      index += 1;
      continue;
    }

    io.stderr.write(`Unknown option: ${option}\n\n${HELP_TEXT}`);
    return 1;
  }

  template ??= await pickTemplate(io);

  if (!template) {
    return 1;
  }

  try {
    TEMPLATES.find((candidate) => candidate.name === template)?.create(projectDirectory);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`${message}\n`);
    return 1;
  }

  io.stdout.write(`Created QVAC ${template} app in ${resolve(projectDirectory)}\n`);
  return 0;
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  process.exitCode = await runCli();
}
