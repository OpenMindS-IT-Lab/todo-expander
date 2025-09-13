import { Cfg } from './config.ts'
import { join } from 'https://deno.land/std@0.223.0/path/mod.ts'

function minifyTemplate(t: string): string {
  const lines = t
    .split('\n')
    .filter((ln) => !ln.trim().startsWith('```') && !ln.trim().startsWith('#'))
    .map((ln) => ln.replace(/\s+/g, ' ').trim())
  return lines.join('\n').replace(/\n{2,}/g, '\n').trim()
}

/**
 * Load the external prompt template if present; otherwise null to use fallback.
 * @returns Template string or null when not found.
 */
async function loadTemplate(): Promise<string | null> {
  // Prefer external prompt file for auditability
  const candidates = [
    join(Deno.cwd(), 'prompts/todo_expander.compact.prompt.md'),
  ]
  for (const p of candidates) {
    try {
      const text = await Deno.readTextFile(p)
      return minifyTemplate(text)
    } catch (_) {
      // continue
    }
  }
  return null
}

/**
 * Replace {{var}} placeholders in a template string.
 * @param tpl - Template string with `{{name}}` placeholders.
 * @param vars - Mapping of placeholder names to values.
 * @returns Interpolated template string.
 */
function fillTemplate(tpl: string, vars: Record<string, string>): string {
  let out = tpl
  for (const [k, v] of Object.entries(vars)) {
    const re = new RegExp(`\\{\\{${k}\\}\\}`, 'g')
    out = out.replace(re, v)
  }
  return out
}

/**
 * Build the final prompt used for the LLM request.
 * Prefers external template; falls back to a concise inline prompt.
 *
 * @param filePath - Relative file path for context.
 * @param language - Language hint (usually from extension) for comment style.
 * @param todoComment - Original TODO comment text.
 * @param codeContext - Nearby code used to ground instructions.
 * @param style - Succinct or verbose output preference.
 * @param sections - Section names to include in the brief.
 * @returns Fully-rendered prompt string.
 */
export async function renderPrompt({
  filePath,
  language,
  todoComment,
  codeContext,
  style,
  sections,
}: {
  filePath: string
  language: string
  todoComment: string
  codeContext: string
  style: Cfg['style']
  sections: string[]
}): Promise<string> {
  const tpl = await loadTemplate()
  const defaultSections = [
    'Context',
    'Goal',
    'Steps',
    'Constraints',
    'Acceptance',
  ]
  const isDefaultSections = sections.length === defaultSections.length &&
    sections.every((s, i) =>
      s.trim().toLowerCase() === defaultSections[i].toLowerCase()
    )

  const parts: string[] = []
  if (tpl) parts.push(tpl)
  else {parts.push(
      'Task: Rewrite the TODO into a structured brief as a comment. Return only the rewritten comment.',
    )}
  parts.push(`File: ${filePath}`)
  if (language) parts.push(`Language: ${language}`)
  if (style !== 'succinct') parts.push(`Style: ${style}`)
  if (!isDefaultSections) {
    parts.push(`Sections override: ${sections.join(', ')}`)
  }
  parts.push(
    'Original TODO:',
    todoComment,
    '',
    'Nearby code (context only):',
    codeContext,
  )
  return parts.join('\n')
}

/** Build a batched prompt for multiple TODOs within the same file. */
export async function renderPromptBatch({
  filePath,
  language,
  todos,
  style,
  sections,
}: {
  filePath: string
  language: string
  todos: { todoComment: string; codeContext: string }[]
  style: Cfg['style']
  sections: string[]
}): Promise<string> {
  const tpl = await loadTemplate()
  const defaultSections = [
    'Context',
    'Goal',
    'Steps',
    'Constraints',
    'Acceptance',
  ]
  const isDefaultSections = sections.length === defaultSections.length &&
    sections.every((s, i) =>
      s.trim().toLowerCase() === defaultSections[i].toLowerCase()
    )

  const parts: string[] = []
  if (tpl) parts.push(tpl)
  else {parts.push(
      'Task: Rewrite the TODO into a structured brief as a comment. Return only the rewritten comment.',
    )}
  parts.push(`File: ${filePath}`)
  if (language) parts.push(`Language: ${language}`)
  if (style !== 'succinct') parts.push(`Style: ${style}`)
  if (!isDefaultSections) {
    parts.push(`Sections override: ${sections.join(', ')}`)
  }
  parts.push(
    'Return rewritten TODOs separated by --- on their own line in the same order.',
  )

  todos.forEach((t, idx) => {
    parts.push(
      `TODO ${idx + 1}:`,
      t.todoComment,
      '',
      'Nearby code (context only):',
      t.codeContext,
    )
    if (idx < todos.length - 1) parts.push('---')
  })
  return parts.join('\n')
}

/**
 * Call the OpenAI Responses API and return trimmed text output.
 * @param prompt - Rendered prompt string.
 * @param apiKey - OpenAI API key.
 * @param cfg - Resolved configuration (model/endpoint).
 * @returns Rewritten comment text, or null on error.
 */
export async function runLLM(
  { prompt, apiKey, cfg }: { prompt: string; apiKey: string; cfg: Cfg },
) {
  const body: Record<string, unknown> = {
    model: cfg.model,
    input: [
      {
        role: 'system',
        content:
          'You are a senior prompt engineer. Rewrite any inline TODO into a structured brief with sections: Context; Goal; Steps (re-runnable & idempotent); Constraints; Acceptance. Preserve current runtime behavior and visible UI. Keep the smallest possible diff; do not alter surrounding code or identifiers. Use the same comment style as the original (// vs /* */ vs #). Output only the rewritten comment in the same comment style; no extra text.',
      },
      { role: 'user', content: prompt },
    ],
  }

  const attemptOnce = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), cfg.timeout)
    try {
      const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        const text = await res.text()
        return { ok: false, status: res.status, text }
      }
      const data = await res.json()
      const text = data.output_text || data.content?.[0]?.text || null
      return { ok: true, text }
    } catch (err) {
      return { ok: false, error: err }
    } finally {
      clearTimeout(timeout)
    }
  }

  const totalAttempts = 1 + (cfg.retries ?? 0)
  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const res = await attemptOnce()
    if (res.ok) {
      if (!res.text) return null
      return (res.text as string).trim()
    }

    // classify error
    const status = (res as any).status as number | undefined
    const err = (res as any).error
    const isAbort = err &&
      (err.name === 'AbortError' || err.code === 'AbortError')
    const retriable = isAbort ||
      (status !== undefined &&
        (status === 408 || status === 429 || (status >= 500 && status <= 599)))

    const detail = status
      ? `status=${status}`
      : (isAbort
        ? `timeout after ${cfg.timeout}ms`
        : (err?.message || 'network error'))
    if (attempt < totalAttempts && retriable) {
      const delay = Math.min(
        5000,
        (cfg.retryBackoffMs ?? 500) * Math.pow(2, attempt - 1),
      )
      const jitter = Math.floor(Math.random() * Math.min(200, delay / 2))
      const sleepMs = delay + jitter
      console.error(
        `LLM request retry ${attempt}/${
          totalAttempts - 1
        } due to ${detail}; waiting ${sleepMs}ms...`,
      )
      await new Promise((r) => setTimeout(r, sleepMs))
      continue
    } else {
      console.error(`LLM request failed (${detail}). No more retries.`)
      return null
    }
  }
  return null
}
