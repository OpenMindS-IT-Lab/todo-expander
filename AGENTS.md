# Repository Guidelines

## Project Structure & Modules

- `bin/todo-expand.ts`: CLI entrypoint.
- `src/`: Core modules (`config.ts`, `process.ts`, `prompt.ts`, `rewrite.ts`, etc.).
- `scripts/`: Build and validation utilities (`build_npm.ts`, `validate-schema.ts`).
- `templates/`, `prompts/`, `schema/`: Prompt templates and JSON schema assets.
- `docs/`: References (see `ARCHITECTURE.md`, `MODULES.md`).
- `npm/`: Generated Node package (via `dnt`); do not edit by hand.
- `dist/`: Compiled CLI binary output (created by builds).
- `.githooks/`, `run/`: Local hooks and maintenance scripts.

## Build, Test, and Dev Commands

- Run locally: `deno run -A bin/todo-expand.ts --help`
- Process staged files: `deno task todo:staged`
- Process a file: `deno task todo:file path/to/file.ts`
- Build CLI binary: `deno task build:cli` (output in `dist/`)
- Build/pack npm: `deno task build:npm` then `deno task pack:npm`
- Lint/format: `deno task fmt` and `deno task lint`
- Validate configs/schemas: `deno task schema:validate`
- Quick health check: `deno task health:check`
- Install hooks: `deno task githooks:install`

## Coding Style & Naming

- Formatter: `deno fmt` (2 spaces, width 80, single quotes, no semicolons, no tabs).
- Lint: `deno lint` (use `--fix` before commits).
- TypeScript strict; prefer named exports.
- Filenames: lowercase (`config.ts`, `build_npm.ts`); follow existing patterns.
- Identifiers: `camelCase` functions/vars, `PascalCase` types; JSDoc for public APIs.

## Testing Guidelines

- No formal test suite yet. Use: `deno task health:check` and targeted runs (e.g., `--print-config`).
- If adding tests, place `*.test.ts` near sources and run with `deno test`.
- Keep examples deterministic; avoid network calls in unit tests.

## Commit & PR Guidelines

- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore(scope): ...` (see `git log`).
- PRs must include: purpose, key changes, commands used, before/after snippet (when relevant).
- Link issues, update docs/schema when flags or config change.
- CI-quality locally: run `deno task fmt && deno task lint && deno task schema:validate`.

## Security & Configuration

- Secrets: use `.env` (see `.env.example`); do not commit secrets.
- Required env: `OPENAI_API_KEY` (optionally `OPENAI_MODEL`).
- Validate `.todoexpandrc.json` with `deno task schema:validate` before submitting.

## Agent-Specific Notes

- Keep diffs minimal; do not rename/move files without reason.
- Preserve public APIs and CLI flags; update docs when behavior changes.
