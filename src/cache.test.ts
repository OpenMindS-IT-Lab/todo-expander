import { assertEquals } from '@std/assert'
import { readCache, writeCache } from './cache.ts'

Deno.test({
  name: 'cache: read missing returns empty object',
  permissions: { read: true },
  fn: async () => {
    const dir = await Deno.makeTempDir()
    const miss = `${dir}/nope/cache.json`
    const data = await readCache(miss)
    assertEquals(data, {})
  },
})

Deno.test({
  name: 'cache: write and read round-trip',
  permissions: { read: true, write: true },
  fn: async () => {
    const dir = await Deno.makeTempDir()
    const path = `${dir}/.git/.todoexpand-cache.json`
    const obj = { a: '1', b: 'two' }
    await writeCache(path, obj)
    const read = await readCache(path)
    assertEquals(read, obj)
  },
})
