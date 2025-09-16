#!/usr/bin/env -S deno run -A

import { build, emptyDir } from '@deno/dnt'
import { join } from '@std/path'

const outDir = './npm-scoped'

await emptyDir(outDir)

console.log('🏗️  Building scoped NPM package with dnt...')

await build({
  entryPoints: [
    {
      kind: 'bin',
      name: 'todo-expand',
      path: './bin/todo-expand.ts',
    },
  ],
  outDir,
  shims: {
    deno: true,
    crypto: true,
    undici: true,
  },
  package: {
    name: '@openminds-it-lab/todo-expander',
    version: '0.1.0',
    description:
      'Transform simple TODO comments into structured, Codex-ready task briefs using AI.',
    license: 'MIT',
    repository: {
      type: 'git',
      url: 'git+https://github.com/OpenMindS-IT-Lab/todo-expander.git',
    },
    bugs: {
      url: 'https://github.com/OpenMindS-IT-Lab/todo-expander/issues',
    },
    homepage: 'https://github.com/OpenMindS-IT-Lab/todo-expander#readme',
    author: {
      name: 'OpenMindS IT Lab',
      url: 'https://github.com/OpenMindS-IT-Lab',
    },
    keywords: [
      'todo',
      'ai',
      'codex',
      'developer-tools',
      'automation',
      'typescript',
      'cli',
      'openai',
      'gpt',
      'code-enhancement',
      'openminds',
      'it-lab',
    ],
    type: 'module',
    engines: {
      node: '>=18.0.0',
    },
    bin: {
      'todo-expand': './bin/todo-expand.js',
    },
    files: [
      'bin/',
      'esm/',
      'prompts/',
      'schema/',
      'templates/',
      'README.md',
      'LICENSE',
    ],
    scripts: {
      postinstall:
        'node -e "console.log(\'\\n🎉 @openminds-it-lab/todo-expander installed! Run: todo-expand init\\n\')"',
    },
    preferGlobal: true,
    publishConfig: {
      access: 'public',
      provenance: true,
    },
  },
  compilerOptions: {
    target: 'ES2022',
    lib: ['ES2022', 'DOM'],
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
  },
  typeCheck: false,
  test: false,
  declaration: false,
  scriptModule: false,
})

console.log('📁 Copying additional assets...')

// Copy additional assets that dnt doesn't handle automatically
const assetDirs = ['prompts', 'schema', 'templates']
for (const assetDir of assetDirs) {
  try {
    const src = join('.', assetDir)
    const dest = join(outDir, assetDir)
    console.log(`📄 Copying ${assetDir}/...`)
    await Deno.mkdir(dest, { recursive: true })
    for await (const entry of Deno.readDir(src)) {
      if (entry.isFile) {
        const srcFile = join(src, entry.name)
        const destFile = join(dest, entry.name)
        await Deno.copyFile(srcFile, destFile)
      } else if (entry.isDirectory) {
        const subSrc = join(src, entry.name)
        const subDest = join(dest, entry.name)
        await Deno.mkdir(subDest, { recursive: true })
        for await (const subEntry of Deno.readDir(subSrc)) {
          if (subEntry.isFile) {
            const subSrcFile = join(subSrc, subEntry.name)
            const subDestFile = join(subDest, subEntry.name)
            await Deno.copyFile(subSrcFile, subDestFile)
          }
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️  Could not copy ${assetDir}: ${error.message}`)
  }
}

// Copy root files
const rootFiles = ['README.md', 'LICENSE']
for (const file of rootFiles) {
  try {
    await Deno.copyFile(file, join(outDir, file))
    console.log(`📄 Copied ${file}`)
  } catch (error) {
    console.warn(`⚠️  Could not copy ${file}: ${error.message}`)
  }
}

console.log('🔧 Post-processing package.json...')

// Ensure the bin path is correct and create a Node wrapper for the ESM binary
const packageJsonPath = join(outDir, 'package.json')
const packageJson = JSON.parse(await Deno.readTextFile(packageJsonPath))

const binDir = join(outDir, 'bin')
const binWrapperPath = join(binDir, 'todo-expand.js')
const esmBinaryPath = './esm/bin/todo-expand.js'

await Deno.mkdir(binDir, { recursive: true })

const wrapperScript = `#!/usr/bin/env node
(async () => {
  try {
    await import('${esmBinaryPath.replace(/^\.\//, '../')}');
  } catch (err) {
    console.error('Failed to start todo-expand:', err.message);
    process.exit(1);
  }
})();
`

await Deno.writeTextFile(binWrapperPath, wrapperScript)
console.log('📄 Created ESM binary wrapper')

packageJson.bin = {
  'todo-expand': './bin/todo-expand.js',
}

await Deno.writeTextFile(packageJsonPath, JSON.stringify(packageJson, null, 2))

console.log('✅ Scoped NPM package build complete!')
console.log(`📦 Package built in: ${outDir}/`)
console.log('🧪 Test locally with:')
console.log(`   cd ${outDir} && npm pack`)
console.log(`   npm install -g ./todo-expander-*.tgz`)
console.log(`   todo-expand --help`)
