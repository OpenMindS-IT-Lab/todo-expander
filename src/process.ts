/** Processing pipeline for per-file TODO expansion and rewrite. */
import { Cfg } from "./config.ts"
import { detectTodos } from "./todos.ts"
import { renderPromptBatch, runLLM } from "./prompt.ts"
import { applyRewrites } from "./rewrite.ts"
import { formatFiles } from "./format.ts"
import { gray } from "./log.ts"
import { readCache, writeCache } from "./cache.ts"

/**
 * Process a single file: detect TODOs, expand via LLM, rewrite in-place,
 * and optionally format.
 *
 * @param absPath - Absolute path to the file on disk.
 * @param relPath - Path relative to project root (for prompts/logging).
 * @param cfg - Resolved configuration.
 * @param apiKey - OpenAI API key.
 * @param dryRun - When true, do not write changes; print context markers.
 * @returns Object with number of files changed (0/1) and TODOs discovered.
 */
export async function processFile({
  absPath,
  relPath,
  cfg,
  apiKey,
  dryRun,
}: {
  absPath: string
  relPath: string
  cfg: Cfg
  apiKey: string
  dryRun: boolean
}): Promise<{ changed: number; todosFound: number }> {
  const content = await Deno.readTextFile(absPath)
  const { todos } = detectTodos(content)
  if (!todos.length) return { changed: 0, todosFound: 0 }

  const cachePath = `${Deno.cwd()}/.git/.todoexpand-cache.json`
  const cache = cfg.cache ? await readCache(cachePath) : {}

  const start = Date.now()
  const updated = await rewriteTodos({
    content,
    todos,
    relPath,
    cfg,
    apiKey,
    dryRun,
    cache,
    fileStart: start,
  })
  if (cfg.cache) await writeCache(cachePath, cache)
  if (updated === null) return { changed: 0, todosFound: todos.length }

  if (!dryRun) {
    await Deno.writeTextFile(absPath, updated)
  } else {
    console.log(gray(`--- ${relPath} (dry-run)`))
  }

  if (!dryRun && cfg.format) {
    await formatFiles([absPath])
  }

  return { changed: 1, todosFound: todos.length }
}

/**
 * Expand and rewrite each detected TODO from bottom-to-top to preserve indices.
 * Uses cache when available to avoid repeat LLM calls.
 * @internal
 * @param content - Original file content.
 * @param todos - Detected TODO matches.
 * @param relPath - Relative path used to build stable cache keys and prompts.
 * @param cfg - Resolved configuration including sections/style.
 * @param apiKey - OpenAI API key for the LLM call.
 * @param dryRun - If true, only logs; still computes rewritten text in-memory.
 * @param cache - Mutable cache object updated with new LLM outputs.
 */
async function rewriteTodos({
  content,
  todos,
  relPath,
  cfg,
  apiKey,
  dryRun,
  cache,
  fileStart,
}: any): Promise<string | null> {
  let text = content
  // Process from bottom to top to keep indices stable
  const sorted = [...todos].sort((a, b) => b.start - a.start)
  const pending: any[] = []
  const contexts: string[] = []
  const fileKeys: string[] = []
  const todoKeys: string[] = []
  for (const todo of sorted) {
    // Per-file timeout check
    if (Date.now() - fileStart > (cfg.perFileTimeoutMs ?? 120000)) {
      console.error(
        gray(
          `[timeout] file exceeded ${cfg.perFileTimeoutMs}ms, skipping remaining TODOs`,
        ),
      )
      break
    }

    const codeContext = extractContext(text, todo, cfg.contextLines)
    const fileKey = cacheKey(relPath, todo.raw)
    const tKey = todoKey(todo.raw)
    const cached = cfg.cache ? (cache[fileKey] ?? cache[tKey]) : null
    if (cached) {
      if (cfg.cache && !cache[fileKey]) cache[fileKey] = cached
      const replaced = applyRewrites({ content: text, todo, newComment: cached })
      text = replaced
      continue
    }

    pending.push(todo)
    contexts.push(codeContext)
    fileKeys.push(fileKey)
    todoKeys.push(tKey)
  }

  if (pending.length) {
    const rendered = await renderPromptBatch({
      filePath: relPath,
      language: langFromPath(relPath),
      todos: pending.map((t, i) => ({ todoComment: t.raw, codeContext: contexts[i] })),
      style: cfg.style,
      sections: cfg.sections,
    })

    const out = await runLLM({ prompt: rendered, apiKey, cfg })
    if (out) {
      const parts = out.split("\n---\n")
      if (parts.length === pending.length) {
        for (let i = 0; i < pending.length; i++) {
          const todo = pending[i]
          const newComment = parts[i].trim()
          if (cfg.cache) {
            cache[fileKeys[i]] = newComment
            cache[todoKeys[i]] = newComment
          }
          const replaced = applyRewrites({ content: text, todo, newComment })
          text = replaced
        }
      }
    }
  }

  return text === content ? null : text
}

/**
 * Extract surrounding code lines around a TODO to provide LLM grounding.
 * @param content - Entire file content.
 * @param todo - TODO match with `start` and `end` line indices.
 * @param lines - Number of lines to include on each side.
 * @returns A string slice containing surrounding context.
 */
function extractContext(content: string, todo: any, lines: number) {
  const arr = content.split('\n')
  const start = Math.max(0, todo.start - lines)
  const end = Math.min(arr.length, todo.end + lines + 1)
  return arr.slice(start, end).join('\n')
}

/**
 * FNV-1a 32-bit hash to compact cache keys.
 * @param str - Input string.
 * @returns Lowercase 8-hex-digit string.
 */
function fnv1aHex(str: string): string {
  let h = 0x811c9dc5 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/**
 * Build stable cache key per-file and TODO content.
 * @param path - Relative file path.
 * @param raw - Raw TODO text.
 */
function cacheKey(path: string, raw: string) {
  return "f:" + fnv1aHex(path + "::" + raw)
}

function todoKey(raw: string) {
  return "t:" + fnv1aHex(raw)
}

/**
 * Infer language from file extension for prompt hints.
 * @param p - File path.
 * @returns Lowercased extension without dot (e.g., `ts`, `js`, `py`).
 */
function langFromPath(p: string) {
  const ext = p.split('.').pop()?.toLowerCase() || ''
  return ext
}
