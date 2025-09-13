import {
  assert,
  assertEquals,
} from 'https://deno.land/std@0.223.0/assert/mod.ts'
import { discoverTargets } from './targets.ts'

async function write(path: string, text: string) {
  await Deno.mkdir(new URL('./', `file://${path}`).pathname, {
    recursive: true,
  })
  await Deno.writeTextFile(path, text)
}

Deno.test({
  name: 'discoverTargets: respects include/exclude and size (paths mode)',
  permissions: { read: true, write: true },
  fn: async () => {
    const cwd = await Deno.makeTempDir()
    // Layout
    await write(`${cwd}/proj/src/a.ts`, 'export const a = 1\n')
    await write(`${cwd}/proj/src/b.js`, 'console.log(1)\n')
    await write(`${cwd}/proj/node_modules/pkg/index.ts`, 'export {}\n')
    await write(`${cwd}/proj/readme.md`, '# readme\n')
    // big file > 1KB
    await write(`${cwd}/proj/src/big.ts`, 'x'.repeat(2048))

    const out = await discoverTargets({
      cwd,
      mode: 'paths',
      paths: ['proj'],
      include: ['ts', 'js'],
      exclude: ['node_modules', 'dist', '.git'],
      maxFileKB: 1,
    })

    // Normalize to relative for assertions
    const rel = out.map((p) => p.replace(`${cwd}/`, ''))
    rel.sort()

    assertEquals(rel, ['proj/src/a.ts', 'proj/src/b.js'])
    assert(rel.every((p) => p.endsWith('.ts') || p.endsWith('.js')))
  },
})
