/**
 * Global configuration resolved from CLI flags, env, and defaults.
 */
export type Cfg = {
  /** File extensions to include (lowercase, without leading dot). */
  include: string[]
  /** Directory segments to exclude (matches if path contains `/<seg>/`). */
  exclude: string[]
  /** Preferred brief verbosity style. */
  style: 'succinct' | 'verbose'
  /** Ordered section names for the structured brief. */
  sections: string[]
  /** OpenAI model ID for the Responses API (e.g., `gpt-4o-mini`). */
  model: string
  /** OpenAI Responses API endpoint. */
  endpoint: string
  /** Network timeout (ms) for API requests. */
  timeout: number
  /** Maximum concurrent LLM requests when processing multiple TODOs. */
  concurrency: number
  /** Number of context lines to include above/below a TODO. */
  contextLines: number
  /** Enable on-disk response cache keyed by file + TODO content. */
  cache: boolean
  /** After rewrite, run a formatter pass (Prettier/`deno fmt`). */
  format: boolean
  /** Reserved for stricter validations in future iterations. */
  strict: boolean
  /** Print rewritten comments (useful for dry-run output). */
  print: boolean
  /** Maximum file size to process (kilobytes). */
  maxFileKB: number
  /** Verbose logging for per-file and per-TODO progress. */
  verboseLogs: boolean
  /** Number of retry attempts for LLM requests (excluding the first try). */
  retries: number
  /** Base backoff in ms for retry delays (exponential with jitter). */
  retryBackoffMs: number
  /** Per-file timeout; abort processing a file after this many ms. */
  perFileTimeoutMs: number
}

/**
 * Load and resolve configuration from CLI flags and environment variables.
 *
 * - Applies sane defaults
 * - Parses comma-separated list flags (include/exclude/sections)
 * - Honors `OPENAI_MODEL` and optional TODO_EXPAND_* envs
 *
 * @param cwd - Current working directory used for repo-level resolution.
 * @param cli - Partial options sourced from CLI flags (raw strings allowed).
 * @returns Fully-resolved configuration object used by the pipeline.
 */
export async function loadConfig({
  cwd,
  cli,
}: {
  cwd: string
  cli: Partial<
    Cfg & { sections: string | string[]; include: string; exclude: string }
  >
}): Promise<Cfg> {
  const defaults: Cfg = {
    include: ['ts', 'tsx', 'js', 'jsx'],
    exclude: ['node_modules', 'build', 'dist', '.git'],
    style: 'succinct',
    sections: ['Context', 'Goal', 'Steps', 'Constraints', 'Acceptance'],
    model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/responses',
    timeout: 45000,
    concurrency: 1,
    contextLines: 12,
    cache: true,
    format: true,
    strict: false,
    print: false,
    maxFileKB: 512,
    verboseLogs: false,
    retries: 2,
    retryBackoffMs: 500,
    perFileTimeoutMs: 120000,
  }

  // TODO: read ~/.config/todo-expand/config.json and ${cwd}/.todoexpandrc.json later
  const styleUsed: Cfg['style'] = (cli.style as Cfg['style']) ||
    ((Deno.env.get('TODO_EXPAND_STYLE') as Cfg['style']) || defaults.style)

  const resolved: Cfg = {
    ...defaults,
    include: cli.include
      ? cli.include.split(',').map((s) => s.trim())
      : defaults.include,
    exclude: cli.exclude
      ? cli.exclude.split(',').map((s) => s.trim())
      : defaults.exclude,
    style: styleUsed,
    sections: Array.isArray(cli.sections)
      ? (cli.sections as string[])
      : typeof cli.sections === 'string'
      ? cli.sections.split(',').map((s) => s.trim())
      : (Deno.env.get('TODO_EXPAND_SECTIONS')
        ? Deno.env.get('TODO_EXPAND_SECTIONS')!.split(',').map((s) => s.trim())
        : defaults.sections),
    model: cli.model || defaults.model,
    endpoint: cli.endpoint || defaults.endpoint,
    timeout: cli.timeout ?? defaults.timeout,
    concurrency: cli.concurrency ?? defaults.concurrency,
    contextLines: cli.contextLines ?? defaults.contextLines,
    cache: cli.cache ?? defaults.cache,
    format: cli.format ?? defaults.format,
    strict: cli.strict ?? defaults.strict,
    print: cli.print ?? defaults.print,
    maxFileKB: defaults.maxFileKB,
    verboseLogs: (cli as any).verboseLogs ??
      (styleUsed === 'verbose' ? true : defaults.verboseLogs),
    retries: (cli as any).retries ?? defaults.retries,
    retryBackoffMs: (cli as any).retryBackoffMs ?? defaults.retryBackoffMs,
    perFileTimeoutMs: (cli as any).perFileTimeoutMs ??
      defaults.perFileTimeoutMs,
  }

  return resolved
}
