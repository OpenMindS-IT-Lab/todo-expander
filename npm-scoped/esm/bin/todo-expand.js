#!/usr/bin/env -S deno run -A
import "../_dnt.polyfills.js";
import * as dntShim from "../_dnt.shims.js";
/**
 * todo-expand CLI (Deno)
 *
 * Modes:
 *  --staged      Operate on staged files
 *  [files...]    Operate on explicit files/dirs
 *  --dry-run     Do not write; print intended changes
 *
 * Environment:
 *  OPENAI_API_KEY (required)
 *  OPENAI_MODEL (optional)
 *
 * Permissions: run with -A or:
 *   --allow-read --allow-write --allow-env --allow-run=git --allow-net=api.openai.com
 */
import { parseArgs } from "../deps/jsr.io/@std/cli/1.0.22/parse_args.js";
import { relative } from "../deps/jsr.io/@std/path/1.1.2/mod.js";
import { exists } from "../deps/jsr.io/@std/fs/1.0.19/mod.js";
import { load as loadEnv } from "../deps/jsr.io/@std/dotenv/0.225.5/mod.js";
import { loadConfig, printConfig } from "../src/config.js";
import { discoverTargets } from "../src/targets.js";
import { processFile } from "../src/process.js";
import { initProject } from "../src/init.js";
import { bold, gray, green, yellow } from "../src/log.js";
// Load environment from .env and .env.local if present (explicit order)
try {
  await loadEnv({ envPath: ".env", export: true });
} catch (_) {
  // Ignore errors loading .env file
}
try {
  await loadEnv({ envPath: ".env.local", export: true });
} catch (_) {
  // Ignore errors loading .env.local file
}
/**
 * Fallback .env loader in case std/dotenv could not export variables.
 * Safe no-op on errors; does not override existing env vars.
 */
// Fallback: lightweight manual parser if dotenv fails to export
async function loadEnvFallback() {
  for (const p of [".env.local", ".env"]) {
    try {
      if (!(await exists(p))) {
        continue;
      }
      const txt = await dntShim.Deno.readTextFile(p);
      for (const raw of txt.split("\n")) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) {
          continue;
        }
        const eq = line.indexOf("=");
        if (eq === -1) {
          continue;
        }
        const key = line.slice(0, eq).trim();
        let val = line.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!dntShim.Deno.env.get(key)) {
          dntShim.Deno.env.set(key, val);
        }
      }
    } catch (_) {
      // ignore
    }
  }
}
await loadEnvFallback();
/** Print CLI usage and common options. */
function printHelp() {
  const help =
    `todo-expand - Rewrite TODOs into Codex-ready briefs (Senior Prompt Engineer style)

Usage:
  todo-expand [options] [paths...]
  todo-expand --print-config
  todo-expand init [--force] [--template=<type>] [--skip-package-json]

Common:
  --staged               Operate on git-staged files
  --dry-run, -n          Preview changes without writing
  --include=<exts>       Comma-separated extensions to include (default: ts,tsx,js,jsx)
  --exclude=<paths>      Comma-separated path segments to exclude (default: node_modules,build,dist,.git)
  --style=<s>            Prompt style: succinct | verbose (default: succinct)
  --sections=<list>      Custom sections (comma-separated). Default: Context,Goal,Steps,Constraints,Acceptance
  --context-lines=<n>    Lines of surrounding context to include (default: 12)
  --no-cache             Disable response caching
  --no-format            Skip formatting after rewrite
  --strict               Exit with non-zero on errors
  --print                Print rewritten comments to stdout
  --model=<name>         Override model (default: OPENAI_MODEL or gpt-4o-mini)
  --endpoint=<url>       OpenAI Responses API endpoint (default: https://api.openai.com/v1/responses)
  --timeout=<ms>         Per-request timeout in milliseconds (default: 45000)
  --retries=<n>          Retry attempts on timeout/429/5xx (default: 2)
  --retry-backoff-ms=<n> Base backoff in ms for retries (default: 500)
  --file-timeout=<ms>    Abort processing a file after this many ms (default: 120000)
  --concurrency=<n>      Concurrent LLM requests (default: 1)
  --help, -h             Show this help

Configuration:
  --config=<path>        Use specific config file instead of automatic discovery
  --print-config         Show resolved configuration and exit

Init Command:
  --force                Overwrite existing files during init
  --template=<type>      Template type: base | monorepo | non-git (auto-detected if not specified)
  --skip-package-json    Don't add npm script to package.json

Notes:
  - A timeout causes a client-side abort; the server may still complete the request.
  - Retries apply to timeouts, 429, and 5xx responses with exponential backoff and jitter.

Configuration Files (loaded in precedence order):
  1. CLI flags (highest precedence)
  2. Environment variables
  3. Project: .todoexpandrc.json (nearest parent directory)
  4. Global: ~/.config/todo-expand/config.json
  5. Built-in defaults (lowest precedence)

Environment:
  OPENAI_API_KEY         Required. Your OpenAI API key
  OPENAI_MODEL           Optional. Overrides model (e.g., gpt-4o)
  TODO_EXPAND_STYLE      Optional. succinct | verbose
  TODO_EXPAND_SECTIONS   Optional. Comma-separated list
  TODO_EXPAND_DRY        Optional. Set to 1 to default to dry-run

Examples:
  todo-expand --staged --dry-run
  todo-expand --staged
  todo-expand --print-config
  todo-expand --config=./custom.json --staged
  todo-expand src/components/Game.tsx
  todo-expand init
  todo-expand init --template=monorepo --force

Notes:
  - The tool loads .env and .env.local automatically when present.
  - The prompt is sourced from prompts/todo_expander.prompt.md.
  - Cache stored at .git/.todoexpand-cache.json or nearest .git directory.
`;
  console.log(help);
}
/**
 * CLI entrypoint. Parses flags, validates env, discovers targets, and processes files.
 *
 * Flags mirror configuration options; see `printHelp()` for details. Exits non-zero
 * when API key is missing or on unhandled errors.
 */
async function main() {
  // Check for init command first (before parsing flags)
  if (dntShim.Deno.args[0] === "init") {
    const initArgs = dntShim.Deno.args.slice(1); // Remove 'init' from args
    const initFlags = parseArgs(initArgs, {
      boolean: ["force", "skip-package-json", "help"],
      string: ["template"],
      alias: { h: "help" },
      default: {},
    });
    if (initFlags.help) {
      console.log(
        `todo-expand init - Initialize a project with todo-expander configuration

Usage:
  todo-expand init [options]

Options:
  --force                Overwrite existing files
  --template=<type>      Template type: base | monorepo | non-git (auto-detected if not specified)
  --skip-package-json    Don't add npm script to package.json
  --help, -h             Show this help

Templates:
  base      Standard single-repository project (default)
  monorepo  Multi-language monorepo with higher concurrency  
  non-git   Non-git project (cache disabled)

Examples:
  todo-expand init
  todo-expand init --template=monorepo
  todo-expand init --force --skip-package-json
`,
      );
      return;
    }
    const template = initFlags.template;
    if (template && !["base", "monorepo", "non-git"].includes(template)) {
      console.error(
        yellow(
          `Invalid template: ${template}. Must be one of: base, monorepo, non-git`,
        ),
      );
      dntShim.Deno.exit(1);
    }
    await initProject({
      cwd: dntShim.Deno.cwd(),
      force: initFlags.force || false,
      template: template, // Will be auto-detected in initProject if undefined
      skipPackageJson: initFlags["skip-package-json"] || false,
    });
    return;
  }
  // Regular CLI parsing for non-init commands
  const flags = parseArgs(dntShim.Deno.args, {
    boolean: [
      "staged",
      "dry-run",
      "no-cache",
      "no-format",
      "strict",
      "print",
      "print-config",
      "help",
    ],
    string: [
      "include",
      "exclude",
      "style",
      "sections",
      "model",
      "endpoint",
      "timeout",
      "concurrency",
      "context-lines",
      "retries",
      "retry-backoff-ms",
      "file-timeout",
      "config",
    ],
    alias: { n: "dry-run", h: "help" },
    default: {},
  });
  if (flags.help) {
    printHelp();
    return;
  }
  const dryRun = flags["dry-run"] ||
    dntShim.Deno.env.get("TODO_EXPAND_DRY") === "1";
  const cwd = dntShim.Deno.cwd();
  // Load config (with new config file system)
  const configResult = await loadConfig({
    cwd,
    configPath: flags.config,
    cli: {
      include: flags.include,
      exclude: flags.exclude,
      style: flags.style,
      sections: flags.sections,
      model: flags.model,
      endpoint: flags.endpoint,
      timeout: flags.timeout ? Number(flags.timeout) : undefined,
      concurrency: flags.concurrency ? Number(flags.concurrency) : undefined,
      contextLines: flags["context-lines"]
        ? Number(flags["context-lines"])
        : undefined,
      cache: flags["no-cache"] ? false : undefined,
      format: flags["no-format"] ? false : undefined,
      strict: flags.strict ?? undefined,
      print: flags.print ?? undefined,
      retries: flags.retries ? Number(flags.retries) : undefined,
      retryBackoffMs: flags["retry-backoff-ms"]
        ? Number(flags["retry-backoff-ms"])
        : undefined,
      perFileTimeoutMs: flags["file-timeout"]
        ? Number(flags["file-timeout"])
        : undefined,
    },
  });
  const cfg = configResult.config;
  // Handle configuration warnings and errors
  if (configResult.warnings.length > 0) {
    for (const warning of configResult.warnings) {
      console.warn(yellow(`Warning: ${warning}`));
    }
  }
  if (configResult.errors.length > 0) {
    for (const error of configResult.errors) {
      console.error(yellow(`Config Error: ${error}`));
    }
    if (cfg.strict) {
      dntShim.Deno.exit(1);
    }
  }
  // Handle --print-config flag
  if (flags["print-config"]) {
    console.log(printConfig(cfg, configResult.sources));
    return;
  }
  const apiKey = dntShim.Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error(
      yellow(
        "OPENAI_API_KEY is not set. Export it before running (see Notebook Preflight).",
      ),
    );
    dntShim.Deno.exit(2);
  }
  // Determine targets
  const argPaths = flags._.map(String);
  const targets = await discoverTargets({
    cwd,
    mode: flags.staged ? "staged" : "paths",
    paths: argPaths,
    include: cfg.include,
    exclude: cfg.exclude,
    maxFileKB: cfg.maxFileKB,
  });
  if (!targets.length) {
    console.log(gray("No matching target files."));
    return;
  }
  console.log(bold(`todo-expand: processing ${targets.length} file(s)`));
  let changedCount = 0;
  let todoCount = 0;
  let processed = 0;
  for (const abs of targets) {
    const rel = relative(cwd, abs);
    if (cfg.verboseLogs) {
      console.log(gray(`[start] ${rel}`));
    }
    try {
      const ok = await processFile({
        absPath: abs,
        relPath: rel,
        cfg,
        apiKey,
        dryRun,
      });
      if (ok.changed) {
        changedCount += ok.changed;
      }
      if (ok.todosFound) {
        todoCount += ok.todosFound;
      }
      processed++;
      if (cfg.verboseLogs) {
        console.log(
          gray(
            `[done]  ${rel}  (todos: ${ok.todosFound}, changed: ${ok.changed})`,
          ),
        );
      } else {
        if (processed % 5 === 0 || processed === targets.length) {
          console.log(
            gray(`progress: ${processed}/${targets.length} files...`),
          );
        }
      }
    } catch (err) {
      const error = err;
      console.error(yellow(`[error] ${rel}: ${error?.message || error}`));
    }
  }
  console.log(
    green(`Done. TODOs found: ${todoCount}, files changed: ${changedCount}`),
  );
}
if (globalThis[Symbol.for("import-meta-ponyfill-esmodule")](import.meta).main) {
  main().catch((err) => {
    console.error(err);
    dntShim.Deno.exit(1);
  });
}
