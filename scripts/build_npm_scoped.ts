#!/usr/bin/env -S deno run -A

/**
 * Build script for creating the @openminds-it-lab/todo-expander NPM package
 * This creates a proper standalone package rather than an alias
 */

import { build, emptyDir } from '@deno/dnt'
import { join } from '@std/path'

const outDir = './npm-scoped'

await emptyDir(outDir)

await build({
  entryPoints: ['./src/mod.ts'],
  outDir,
  shims: {
    deno: true,
  },
  package: {
    name: '@openminds-it-lab/todo-expander',
    version: '0.1.0',
    description: 'Expand TODOs using LLM-friendly workflows (OpenMinds IT Lab)',
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/OpenMindS-IT-Lab/todo-expander.git',
    },
    bugs: {
      url: 'https://github.com/OpenMindS-IT-Lab/todo-expander/issues',
    },
    homepage: 'https://github.com/OpenMindS-IT-Lab/todo-expander#readme',
    keywords: [
      'todo',
      'llm',
      'ai',
      'productivity',
      'development',
      'automation',
      'openminds',
      'it-lab',
    ],
    author: 'OpenMinds IT Lab',
    bin: {
      'todo-expand': './bin/todo-expand.js',
    },
    publishConfig: {
      access: 'public',
    },
    engines: {
      node: '>=18',
    },
  },
  postBuild() {
    // Copy the CLI binary
    Deno.copyFileSync('bin/todo-expand.ts', join(outDir, 'bin/todo-expand.js'))

    // Fix the shebang and imports for the CLI
    const cliContent = Deno.readTextFileSync(join(outDir, 'bin/todo-expand.js'))
    const fixedCli = cliContent
      .replace(/^.*deno run.*$/m, '#!/usr/bin/env node')
      .replace(/from ['"]@std\//g, "from '@deno/std/")

    Deno.writeTextFileSync(join(outDir, 'bin/todo-expand.js'), fixedCli)
  },
})

console.log('✅ Built @openminds-it-lab/todo-expander NPM package')
