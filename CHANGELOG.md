# Changelog

## Unreleased

- No unreleased changes.

## v0.1.0-alpha.3 - 2026-07-19

- Use QVAC CLI's `127.0.0.1:11434` endpoint in generated apps and documentation.
- Add npm discovery keywords and a benefit-oriented package description.
- Clarify that this is an independent community project.
- Upgrade npm in the release workflow to support OIDC trusted publishing.

## v0.1.0-alpha.2 - 2026-07-10

- Remove `tsx` from generated apps so pnpm 11 installs do not require approving
  ignored `esbuild` build scripts.
- Add generated-app install/build and packed-tarball installability checks.
- Add publish-ready package metadata and license file.
- Add Node 22, 24, and 26 CI coverage plus a deeper package verifier for
  packed-file contents, installed package imports, CLI help, and generated app
  build checks.

## v0.1.0-alpha.1 - 2025-01-30

- Initial repository scaffold.
- First pre-release of `@localhost41/create-qvac-app`.
- Includes Node TypeScript QVAC chat application template.
