/**
 * Read JSON cache from disk.
 * @param path - Absolute path to a JSON file.
 * @returns Parsed object, or `{}` if the file does not exist or cannot be read.
 */
import * as dntShim from "../_dnt.shims.js";

export async function readCache(path: string): Promise<Record<string, string>> {
  try {
    const text = await dntShim.Deno.readTextFile(path)
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/**
 * Persist JSON cache to disk, ensuring parent directory exists (best-effort).
 * @param path - Absolute path to the JSON cache file.
 * @param data - Key-value mapping of cache entries.
 */
export async function writeCache(path: string, data: Record<string, string>) {
  try {
    await dntShim.Deno.mkdir(new URL('./', `file://${path}`).pathname, {
      recursive: true,
    })
  } catch {
    /* ignore */
  }
  await dntShim.Deno.writeTextFile(path, JSON.stringify(data, null, 2))
}
