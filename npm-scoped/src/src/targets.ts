/** Target discovery utilities. */
import * as dntShim from "../_dnt.shims.js";

import { join } from '../deps/jsr.io/@std/path/1.1.2/mod.js'
import { expandGlob } from '../deps/jsr.io/@std/fs/1.0.19/mod.js'
import type { Cfg } from './config.js'

/**
 * Run a git command and return stdout as UTF-8 string.
 * @param args - Git arguments (e.g., ["diff", "--name-only", "--cached"]).
 * @param cwd - Working directory where the git command executes.
 * @returns Raw stdout string on success.
 * @throws Error when git exits with non-zero code.
 */
async function git(args: string[], { cwd }: { cwd: string }) {
  const p = new dntShim.Deno.Command('git', {
    args,
    cwd,
    stdout: 'piped',
    stderr: 'piped',
  })
  const { code, stdout, stderr } = await p.output()
  if (code !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed: ${new TextDecoder().decode(stderr)}`,
    )
  }
  return new TextDecoder().decode(stdout)
}

/**
 * Check if `path` is allowed by include/exclude filters.
 * @param path - Absolute path to test.
 * @param cfg - Resolved configuration containing include/exclude lists.
 */
function _isIncluded(path: string, cfg: Cfg) {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  return cfg.include.includes(ext) &&
    !cfg.exclude.some((skip) => path.includes(`/${skip}/`))
}

/**
 * Discover files to process based on mode and filters.
 *
 * - `staged`: reads git staged files
 * - `paths`: walks provided files/directories and filters by ext/size
 *
 * @param cwd - Project root directory.
 * @param mode - "staged" to read from git index, or "paths" to traverse arguments.
 * @param paths - File or directory arguments when `mode` is "paths".
 * @param include - Allowed file extensions (lowercase, no leading dot).
 * @param exclude - Directory segments to skip (matched within path segments).
 * @param maxFileKB - Skip files larger than this threshold.
 * @returns List of absolute file paths to process.
 */
export async function discoverTargets({
  cwd,
  mode,
  paths,
  include,
  exclude,
  maxFileKB,
}: {
  cwd: string
  mode: 'staged' | 'paths'
  paths: string[]
  include: string[]
  exclude: string[]
  maxFileKB: number
}): Promise<string[]> {
  if (mode === 'staged') {
    const out = await git(['diff', '--name-only', '--cached'], { cwd })
    const files = out.split('\n').map((s) => s.trim()).filter(Boolean)
    const abs = files.map((f) => join(cwd, f))
    const filtered: string[] = []
    for (const file of abs) {
      try {
        const info = await dntShim.Deno.stat(file)
        if (!info.isFile) continue
        const ext = file.split('.').pop()?.toLowerCase() || ''
        if (!include.includes(ext)) continue
        if (exclude.some((seg) => file.includes(`/${seg}/`))) continue
        if (info.size > maxFileKB * 1024) continue
        filtered.push(file)
      } catch (_) {
        // ignore missing files
      }
    }
    return filtered
  }

  // paths mode: accept files/dirs
  const results: string[] = []
  for (const p of paths) {
    const abs = join(cwd, p)
    try {
      const st = await dntShim.Deno.stat(abs)
      if (st.isFile) {
        const ext = abs.split('.').pop()?.toLowerCase() || ''
        if (!include.includes(ext)) continue
        if (exclude.some((seg) => abs.includes(`/${seg}/`))) continue
        if (st.size > maxFileKB * 1024) continue
        results.push(abs)
      } else if (st.isDirectory) {
        for await (
          const entry of expandGlob('**/*', { root: abs, includeDirs: false })
        ) {
          const file = entry.path
          const st2 = await dntShim.Deno.stat(file)
          const ext = file.split('.').pop()?.toLowerCase() || ''
          if (!include.includes(ext)) continue
          if (exclude.some((seg) => file.includes(`/${seg}/`))) continue
          if (st2.size > maxFileKB * 1024) continue
          results.push(file)
        }
      }
    } catch (_) {
      // ignore
    }
  }
  return results
}
