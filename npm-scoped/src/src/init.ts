import * as dntShim from "../_dnt.shims.js";
import { exists } from '../deps/jsr.io/@std/fs/1.0.19/exists.js'
import { dirname, join } from '../deps/jsr.io/@std/path/1.1.2/mod.js'
import { bold, gray, green, yellow } from './log.js'

/**
 * Options for the init command
 */
export type InitOptions = {
  /** Current working directory */
  cwd: string
  /** Force overwrite existing files */
  force: boolean
  /** Template type to use (auto-detected if not provided) */
  template?: 'base' | 'monorepo' | 'non-git'
  /** Skip creating package.json script */
  skipPackageJson: boolean
}

/**
 * Template data for different project types
 */
const TEMPLATES = {
  base: {
    description: 'Standard single-repository project',
    configFile: 'templates/base/.todoexpandrc.json',
    envFile: 'templates/base/.env.example',
  },
  monorepo: {
    description: 'Multi-language monorepo with higher concurrency',
    configFile: 'templates/monorepo/.todoexpandrc.json',
    envFile: 'templates/base/.env.example',
  },
  'non-git': {
    description: 'Non-git project (cache disabled)',
    configFile: 'templates/non-git/.todoexpandrc.json',
    envFile: 'templates/base/.env.example',
  },
}

/**
 * Detect project type based on directory structure
 */
async function detectProjectType(
  cwd: string,
): Promise<'base' | 'monorepo' | 'non-git'> {
  // Check if git repository
  const hasGit = await exists(join(cwd, '.git'))
  if (!hasGit) {
    return 'non-git'
  }

  // Look for monorepo indicators
  const monorepoIndicators = [
    'lerna.json',
    'nx.json',
    'rush.json',
    'pnpm-workspace.yaml',
    'workspace.json',
  ]

  for (const indicator of monorepoIndicators) {
    if (await exists(join(cwd, indicator))) {
      return 'monorepo'
    }
  }

  // Check for multiple package.json files (common monorepo pattern)
  try {
    const entries = []
    for await (const entry of dntShim.Deno.readDir(cwd)) {
      if (
        entry.isDirectory &&
        !entry.name.startsWith('.') &&
        !entry.name.startsWith('node_modules')
      ) {
        const hasPackageJson = await exists(
          join(cwd, entry.name, 'package.json'),
        )
        if (hasPackageJson) {
          entries.push(entry.name)
        }
      }
    }
    if (entries.length >= 2) {
      return 'monorepo'
    }
  } catch {
    // Ignore errors in directory scanning
  }

  return 'base'
}

/**
 * Get the path to the todo-expander installation directory
 */
function getTodoExpanderRoot(): string {
  // This will be the directory containing this script
  const scriptPath = new URL(import.meta.url).pathname
  return dirname(dirname(scriptPath)) // Go up from src/ to root
}

/**
 * Copy a template file to the target location
 */
async function copyTemplate(
  templatePath: string,
  targetPath: string,
  force: boolean,
): Promise<boolean> {
  const todoExpanderRoot = getTodoExpanderRoot()
  const fullTemplatePath = join(todoExpanderRoot, templatePath)

  // Check if template exists
  if (!(await exists(fullTemplatePath))) {
    throw new Error(`Template file not found: ${templatePath}`)
  }

  // Check if target already exists
  if (!force && (await exists(targetPath))) {
    console.log(
      yellow(
        `Skipping ${targetPath} (already exists, use --force to overwrite)`,
      ),
    )
    return false
  }

  // Copy the template
  const content = await dntShim.Deno.readTextFile(fullTemplatePath)
  await dntShim.Deno.writeTextFile(targetPath, content)

  return true
}

/**
 * Add npm script to package.json if it exists
 */
async function addNpmScript(cwd: string, force: boolean): Promise<boolean> {
  const packageJsonPath = join(cwd, 'package.json')

  if (!(await exists(packageJsonPath))) {
    return false
  }

  try {
    const content = await dntShim.Deno.readTextFile(packageJsonPath)
    const packageJson = JSON.parse(content)

    // Initialize scripts object if it doesn't exist
    if (!packageJson.scripts) {
      packageJson.scripts = {}
    }

    // Check if script already exists
    if (packageJson.scripts['todos:expand'] && !force) {
      console.log(
        yellow(
          `Skipping package.json script (already exists, use --force to overwrite)`,
        ),
      )
      return false
    }

    // Add the script
    packageJson.scripts['todos:expand'] = 'todo-expand --staged'

    // Write back with proper formatting
    await dntShim.Deno.writeTextFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n',
    )
    return true
  } catch (error) {
    console.warn(
      yellow(
        `Warning: Could not update package.json: ${(error as Error).message}`,
      ),
    )
    return false
  }
}

/**
 * Print setup guidance after initialization
 */
function printGuidance(template: string, createdFiles: string[]) {
  console.log(green('\n✅ Project initialized successfully!\n'))

  console.log(bold('Files created:'))
  createdFiles.forEach((file) => {
    console.log(green(`  ✓ ${file}`))
  })

  console.log(bold('\nNext steps:'))
  console.log('1. Set your OpenAI API key:')
  console.log(gray('   export OPENAI_API_KEY="your-api-key-here"'))

  if (createdFiles.includes('.env.example')) {
    console.log('\n2. Copy .env.example to .env and fill in your API key:')
    console.log(gray('   cp .env.example .env'))
    console.log(gray('   # Edit .env and add your OPENAI_API_KEY'))
  }

  console.log('\n3. Test the configuration:')
  console.log(gray('   todo-expand --print-config'))

  console.log('\n4. Run on your files:')
  console.log(gray('   todo-expand --staged  # Process staged git files'))
  console.log(gray('   todo-expand src/       # Process specific directory'))

  if (template === 'base' || template === 'monorepo') {
    console.log('\n5. Optional - Set up git hooks:')
    console.log('   See templates/hooks/ for Husky and Lefthook examples')
  }

  console.log('')
}

/**
 * Main init command implementation
 */
export async function initProject(options: InitOptions): Promise<void> {
  const { cwd, force, template: templateOverride, skipPackageJson } = options

  console.log(bold('🚀 Initializing todo-expander project...\n'))

  // Detect or use provided template
  const detectedTemplate = templateOverride || (await detectProjectType(cwd))
  const template = TEMPLATES[detectedTemplate]

  console.log(
    `Template: ${bold(detectedTemplate)} (${template.description})\n`,
  )

  const createdFiles: string[] = []

  try {
    // 1. Create .todoexpandrc.json
    const configTarget = join(cwd, '.todoexpandrc.json')
    if (await copyTemplate(template.configFile, configTarget, force)) {
      createdFiles.push('.todoexpandrc.json')
      console.log(green('✓ Created .todoexpandrc.json'))
    }

    // 2. Create .env.example
    const envTarget = join(cwd, '.env.example')
    if (await copyTemplate(template.envFile, envTarget, force)) {
      createdFiles.push('.env.example')
      console.log(green('✓ Created .env.example'))
    }

    // 3. Add npm script if package.json exists and not skipped
    if (!skipPackageJson) {
      const addedScript = await addNpmScript(cwd, force)
      if (addedScript) {
        createdFiles.push('package.json (updated scripts)')
        console.log(green('✓ Added npm script to package.json'))
      }
    }

    // 4. Print guidance
    printGuidance(detectedTemplate, createdFiles)
  } catch (error) {
    console.error(`❌ Initialization failed: ${(error as Error).message}`)
    dntShim.Deno.exit(1)
  }
}
