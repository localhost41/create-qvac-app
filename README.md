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

CI runs the same health checks on pull requests and pushes to `main`.
