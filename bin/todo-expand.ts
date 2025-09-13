#!/usr/bin/env -S deno run -A
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

import { parseArgs } from 'https://deno.land/std@0.223.0/cli/parse_args.ts'
import { join, relative } from 'https://deno.land/std@0.223.0/path/mod.ts'
import { exists } from 'https://deno.land/std@0.223.0/fs/exists.ts'
import { load as loadEnv } from 'https://deno.land/std@0.223.0/dotenv/mod.ts'

import { loadConfig } from '../src/config.ts'
import { discoverTargets } from '../src/targets.ts'
import { processFile } from '../src/process.ts'
import { bold, gray, green, yellow } from '../src/log.ts'

// Load environment from .env and .env.local if present (explicit order)
try {
  await loadEnv({ envPath: ['.env.local', '.env'], export: true })
} catch (_) {}

/**
 * Fallback .env loader in case std/dotenv could not export variables.
 * Safe no-op on errors; does not override existing env vars.
 */
// Fallback: lightweight manual parser if dotenv fails to export
async function loadEnvFallback() {
  for (const p of ['.env.local', '.env']) {
    try {
      if (!(await exists(p))) continue
      const txt = await Deno.readTextFile(p)
      for (const raw of txt.split('\n')) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq === -1) continue
        const key = line.slice(0, eq).trim()
        let val = line.slice(eq + 1).trim()
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1)
        }
        if (!Deno.env.get(key)) Deno.env.set(key, val)
      }
    } catch (_) {
      // ignore
    }
  }
}
await loadEnvFallback()

/** Print CLI usage and common options. */
function printHelp() {
  const help =
    `todo-expand - Rewrite TODOs into Codex-ready briefs (Senior Prompt Engineer style)

Usage:
  todo-expand [options] [paths...]

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

Notes:
  - A timeout causes a client-side abort; the server may still complete the request.
  - Retries apply to timeouts, 429, and 5xx responses with exponential backoff and jitter.

Environment:
  OPENAI_API_KEY         Required. Your OpenAI API key
  OPENAI_MODEL           Optional. Overrides model (e.g., gpt-4o)
  TODO_EXPAND_STYLE      Optional. succinct | verbose
  TODO_EXPAND_SECTIONS   Optional. Comma-separated list
  TODO_EXPAND_DRY        Optional. Set to 1 to default to dry-run

Examples:
  todo-expand --staged --dry-run
  todo-expand --staged
  todo-expand src/components/Game.tsx

Notes:
  - The tool loads .env and .env.local automatically when present.
  - The prompt is sourced from prompts/todo_expander.prompt.md.
  - Cache stored at .git/.todoexpand-cache.json.
`
  console.log(help)
}

/**
 * CLI entrypoint. Parses flags, validates env, discovers targets, and processes files.
 *
 * Flags mirror configuration options; see `printHelp()` for details. Exits non-zero
 * when API key is missing or on unhandled errors.
 */
async function main() {
  const flags = parseArgs(Deno.args, {
    boolean: [
      'staged',
      'dry-run',
      'no-cache',
      'no-format',
      'strict',
      'print',
      'help',
    ],
    string: [
      'include',
      'exclude',
      'style',
      'sections',
      'model',
      'endpoint',
      'timeout',
      'concurrency',
      'context-lines',
      'retries',
      'retry-backoff-ms',
      'file-timeout',
    ],
    alias: { n: 'dry-run', h: 'help' },
    default: {},
  })

  if (flags.help) {
    printHelp()
    return
  }

  const dryRun = flags['dry-run'] || Deno.env.get('TODO_EXPAND_DRY') === '1'
  const cwd = Deno.cwd()

  // Load config (repo-level and global)
  const cfg = await loadConfig({
    cwd,
    cli: {
      include: flags.include,
      exclude: flags.exclude,
      style: flags.style,
      sections: flags.sections,
      model: flags.model,
      endpoint: flags.endpoint,
      timeout: flags.timeout ? Number(flags.timeout) : undefined,
      concurrency: flags.concurrency ? Number(flags.concurrency) : undefined,
      contextLines: flags['context-lines']
        ? Number(flags['context-lines'])
        : undefined,
      cache: flags['no-cache'] ? false : undefined,
      format: flags['no-format'] ? false : undefined,
      strict: flags.strict ?? undefined,
      print: flags.print ?? undefined,
      retries: flags.retries ? Number(flags.retries) : undefined,
      retryBackoffMs: flags['retry-backoff-ms']
        ? Number(flags['retry-backoff-ms'])
        : undefined,
      perFileTimeoutMs: flags['file-timeout']
        ? Number(flags['file-timeout'])
        : undefined,
    },
  })

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    console.error(
      yellow(
        'OPENAI_API_KEY is not set. Export it before running (see Notebook Preflight).',
      ),
    )
    Deno.exit(2)
  }

  // Determine targets
  const argPaths = flags._.map(String)
  const targets = await discoverTargets({
    cwd,
    mode: flags.staged ? 'staged' : 'paths',
    paths: argPaths,
    include: cfg.include,
    exclude: cfg.exclude,
    maxFileKB: cfg.maxFileKB,
  })

  if (!targets.length) {
    console.log(gray('No matching target files.'))
    return
  }

  console.log(bold(`todo-expand: processing ${targets.length} file(s)`))

  let changedCount = 0
  let todoCount = 0

  let processed = 0
  for (const abs of targets) {
    const rel = relative(cwd, abs)
    if (cfg.verboseLogs) {
      console.log(gray(`[start] ${rel}`))
    }
    try {
      const ok = await processFile({
        absPath: abs,
        relPath: rel,
        cfg,
        apiKey,
        dryRun,
      })
      if (ok.changed) changedCount += ok.changed
      if (ok.todosFound) todoCount += ok.todosFound
      processed++
      if (cfg.verboseLogs) {
        console.log(
          gray(
            `[done]  ${rel}  (todos: ${ok.todosFound}, changed: ${ok.changed})`,
          ),
        )
      } else {
        if (processed % 5 === 0 || processed === targets.length) {
          console.log(gray(`progress: ${processed}/${targets.length} files...`))
        }
      }
    } catch (err) {
      console.error(yellow(`[error] ${rel}: ${err?.message || err}`))
    }
  }

  console.log(
    green(`Done. TODOs found: ${todoCount}, files changed: ${changedCount}`),
  )
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err)
    Deno.exit(1)
  })
}
