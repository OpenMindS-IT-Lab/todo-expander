/**
 * Best-effort formatting pass.
 *
 * Strategy:
 * - Attempt Prettier via `npx prettier --write` (ignored if unavailable)
 * - Fallback to `deno fmt` for TS/JS/JSON/MD/YAML patterns
 *
 * @param files - Absolute file paths to format.
 * @remarks Errors are swallowed to avoid failing the main pipeline.
 */
export async function formatFiles(files: string[]) {
  // Prefer Prettier if available (via npx). Best-effort; ignore failures.
  try {
    const p = new Deno.Command('npx', {
      args: ['prettier', '--write', ...files],
    })
    await p.output()
    return
  } catch (_) {
    // Ignore errors when trying to write JSON
  }

  // Fallback to deno fmt for ts/js
  try {
    const tsLike = files.filter((f) =>
      /\.(ts|tsx|js|jsx|json|md|yml|yaml)$/.test(f)
    )
    if (tsLike.length) {
      const p = new Deno.Command('deno', { args: ['fmt', ...tsLike] })
      await p.output()
    }
  } catch (_) {
    // Ignore errors when trying to write YAML
  }
}
