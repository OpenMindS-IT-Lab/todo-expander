import { Cfg } from "./config.ts"
import { join } from "https://deno.land/std@0.223.0/path/mod.ts"

/**
 * Load the external prompt template if present; otherwise null to use fallback.
 * @returns Template string or null when not found.
 */
async function loadTemplate(): Promise<string | null> {
  // Prefer external prompt file for auditability
  const candidates = [
    join(Deno.cwd(), "prompts/todo_expander.prompt.md"),
  ]
  for (const p of candidates) {
    try {
      const text = await Deno.readTextFile(p)
      return text
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
    const re = new RegExp(`\\{\\{${k}\\}\\}`, "g")
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
  style: Cfg["style"]
  sections: string[]
}): Promise<string> {
  const tpl = await loadTemplate()
  const vars = {
    file_path: filePath,
    language: language || "",
    todo_comment: todoComment,
    code_context: codeContext,
    style: style,
    sections: sections.join(", "),
  } as Record<string, string>

  if (tpl) {
    return fillTemplate(tpl, vars)
  }

  // Fallback minimal instructions if template missing
  const prompt = `You are a senior prompt engineer. Rewrite TODOs into Codex-ready task briefs with:\n- Context\n- Goal\n- Steps (re-runnable, idempotent)\n- Constraints\n- Acceptance\nAlways preserve current runtime behavior and visible UI. Keep diffs minimal. Use the same comment style as the original (// vs /* */ vs #). Output ONLY the rewritten comment, no code outside the comment.\n\nFile: ${filePath}\nLanguage: ${language}\nStyle: ${style}\nSections: ${sections.join(", ")}\n\nOriginal TODO:\n${todoComment}\n\nNearby code context:\n${codeContext}\n`
  return prompt
}

/**
 * Call the OpenAI Responses API and return trimmed text output.
 * @param prompt - Rendered prompt string.
 * @param apiKey - OpenAI API key.
 * @param cfg - Resolved configuration (model/endpoint).
 * @returns Rewritten comment text, or null on error.
 */
export async function runLLM({ prompt, apiKey, cfg }: { prompt: string; apiKey: string; cfg: Cfg }) {
  const body: Record<string, unknown> = {
    model: cfg.model,
    input: [
      { role: "system", content: "Follow the provided prompt strictly. Return only the rewritten comment in the same comment style. Do not echo these instructions." },
      { role: "user", content: prompt },
    ],
  }
  // Some models reject temperature; omit unless explicitly set via env/flags in future

  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error("LLM error", res.status, await res.text())
    return null
  }

  const data = await res.json()
  // Using output_text for Responses API compatibility
  const text = data.output_text || data.content?.[0]?.text || null
  if (!text) return null
  return text.trim()
}
