import { assert, assertEquals, assertMatch } from '@std/assert'
import { loadConfig, printConfig } from './config.ts'

async function write(path: string, text: string) {
  await Deno.mkdir(new URL('./', `file://${path}`).pathname, {
    recursive: true,
  })
  await Deno.writeTextFile(path, text)
}

Deno.test({
  name: 'config: loads defaults and override config path',
  permissions: { read: true, write: true, env: true },
  fn: async () => {
    const cwd = await Deno.makeTempDir()
    const overridePath = `${cwd}/override.json`
    await write(
      overridePath,
      JSON.stringify({ style: 'verbose', sections: ['Ctx', 'Goal'] }),
    )

    const { config, warnings, errors, sources } = await loadConfig({
      cwd,
      cli: {},
      configPath: overridePath,
    })

    assertEquals(errors.length, 0)
    assertEquals(warnings.length, 0)
    assertEquals(sources.override, overridePath)
    assertEquals(config.style, 'verbose')
    assertEquals(config.sections, ['Ctx', 'Goal'])
    // Defaults preserved for others
    assertEquals(Array.isArray(config.include), true)
    assertEquals(config.concurrency > 0, true)
    assert(typeof config.cachePath === 'string')
  },
})

Deno.test({
  name: 'config: project file without override, verbose implies verboseLogs',
  permissions: { read: true, write: true, env: true },
  fn: async () => {
    const cwd = await Deno.makeTempDir()
    await write(
      `${cwd}/.todoexpandrc.json`,
      JSON.stringify({ style: 'verbose' }),
    )

    const { config, sources } = await loadConfig({ cwd, cli: {} })
    assertEquals(sources.project, `${cwd}/.todoexpandrc.json`)
    assertEquals(config.style, 'verbose')
    assertEquals(config.verboseLogs, true)
  },
})

Deno.test({
  name: 'config: printConfig redacts internal fields and renders JSON',
  permissions: { read: true, write: true, env: true },
  fn: async () => {
    const cwd = await Deno.makeTempDir()
    const overridePath = `${cwd}/override.json`
    await write(overridePath, JSON.stringify({}))

    const { config, sources } = await loadConfig({
      cwd,
      cli: {},
      configPath: overridePath,
    })

    const out = printConfig(config, sources)
    assertMatch(out, /Final Configuration:/)
    assert(!out.includes('cachePath'), 'cachePath should be hidden')
  },
})
