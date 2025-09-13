import { gray } from "./log.ts"

/**
 * Replace a detected TODO in `content` with the `newComment`, normalizing
 * the output to match the original comment style (line vs block).
 *
 * @param content - Full file contents.
 * @param todo - TODO match with location/style metadata.
 * @param newComment - Rewritten TODO comment (may be multi-line without markers).
 * @returns Updated file contents with the TODO replaced.
 */
export function applyRewrites({
  content,
  todo,
  newComment,
}: {
  content: string
  todo: { start: number; end: number; raw: string; style: "line" | "block"; marker: string }
  newComment: string
}) {
  const lines = content.split("\n")

  // Normalize output to original style
  let normalized = newComment
  if (todo.style === "line") {
    const marker = todo.marker
    const prefixed = newComment
      .split("\n")
      .map((l: string) => (l.trim().startsWith(marker) ? l : `${marker} ${l}`))
      .join("\n")
    normalized = prefixed
  } else if (todo.style === "block") {
    const trimmed = newComment.trim()
    if (!trimmed.startsWith("/*")) {
      normalized = `/*\n${trimmed}\n*/`
    }
  }

  const before = lines.slice(0, todo.start)
  const after = lines.slice(todo.end + 1)
  const replacement = normalized.split("\n")
  const next = [...before, ...replacement, ...after].join("\n")
  return next
}
