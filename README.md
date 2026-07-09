# create-qvac-app

Public QVAC developer tooling from LocalHost Labs.

> **Alpha Release:** This package is currently in **alpha** (v0.1.0-alpha.1).  
> Expect breaking changes. Feedback is welcome.

## Quickstart

### Prerequisites

- Node.js 20 or newer.
- pnpm.
- A local QVAC HTTP server running before you run the generated app.

The `node-chat` template sends chat requests to
`http://localhost:8000/v1/chat/completions` by default. If your QVAC server
uses a different local URL, set `QVAC_BASE_URL` when running the app.

### Scaffold an app

Use the package with `pnpm dlx`:

```bash
pnpm dlx @localhostlabs/create-qvac-app my-qvac-chat --template node-chat
```

Or install the CLI globally:

```bash
pnpm add -g @localhostlabs/create-qvac-app
create-qvac-app my-qvac-chat --template node-chat
```

Run without `--template` to choose from available templates interactively:

```bash
create-qvac-app my-qvac-chat
```

### Install and run

After scaffolding, install dependencies and start the generated app:

```bash
cd my-qvac-chat
pnpm install
pnpm dev
```

The app sends one chat completion request to your local QVAC server and prints
the response text.

The generated app uses `tsc` and `node` directly, so first-run installs work
with pnpm 11 without approving ignored dependency build scripts.

To point at a non-default local endpoint:

```bash
QVAC_BASE_URL=http://localhost:8001 pnpm dev
```

## Troubleshooting

### QVAC server is not running

If `pnpm dev` fails with `fetch failed`, `ECONNREFUSED`, or a QVAC request
error, confirm the QVAC local HTTP server is running and listening on the URL
the app uses.

For the default endpoint:

```bash
curl http://localhost:8000/v1/chat/completions
```

If the server is on another port or host, restart the app with `QVAC_BASE_URL`:

```bash
QVAC_BASE_URL=http://localhost:8001 pnpm dev
```

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

Scaffold an app and choose a template:

```bash
pnpm cli -- my-qvac-chat
```

Or pass a template directly for noninteractive use:

```bash
pnpm cli -- my-qvac-chat --template node-chat
```

Available templates:

- `node-chat`: Node TypeScript QVAC chat app.

The generated app includes a README, `package.json`, TypeScript config, and
a basic chat example that calls the QVAC local HTTP server at
`http://localhost:8000/v1/chat/completions`.

### Testing packaging

To verify the package before publishing, run:

```bash
pnpm verify
```

This lints, runs the unit and generated-app first-run tests, creates a packed
tarball, installs that tarball into a clean temp project, and checks the
installed CLI can run.

CI runs the same health checks on pull requests and pushes to `main`.
