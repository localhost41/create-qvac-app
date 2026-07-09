# create-qvac-app

Public QVAC developer tooling from LocalHost Labs.

## Local development

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```

Run the CLI locally after building:

```bash
pnpm build
pnpm cli -- --help
```

Scaffold a Node TypeScript QVAC chat app:

```bash
pnpm cli -- my-qvac-chat --template node-chat
```

The generated app includes a README, `package.json`, TypeScript config, and
a basic chat example that calls the QVAC local HTTP server at
`http://localhost:8000/v1/chat/completions`.

CI runs the same health checks on pull requests and pushes to `main`.
