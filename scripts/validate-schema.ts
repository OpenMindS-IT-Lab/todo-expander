#!/usr/bin/env deno run --allow-read --allow-net
/**
 * Schema validation script for todo-expander configuration files
 *
 * This script validates:
 * 1. The JSON schema itself is valid
 * 2. All template configs validate against the schema
 * 3. Example configs in documentation validate against the schema
 */

import { join } from 'https://deno.land/std@0.223.0/path/mod.ts'
import { walk } from 'https://deno.land/std@0.223.0/fs/walk.ts'

// JSON Schema validator - using a simple fetch-based approach for Deno
const AJV_URL = 'https://esm.sh/ajv@8.12.0'
const AJV_FORMATS_URL = 'https://esm.sh/ajv-formats@2.1.1'

interface ValidationResult {
  valid: boolean
  errors?: any[]
}

/**
 * Load and validate the schema file itself
 */
async function loadSchema(): Promise<any> {
  const schemaPath = join(Deno.cwd(), 'schema', 'todoexpand.schema.json')
  const schemaContent = await Deno.readTextFile(schemaPath)

  try {
    const schema = JSON.parse(schemaContent)
    console.log('✅ Schema file is valid JSON')
    return schema
  } catch (error) {
    console.error(`❌ Schema file contains invalid JSON: ${error.message}`)
    throw error
  }
}

/**
 * Validate a configuration object against the schema
 */
async function validateConfig(
  schema: any,
  config: any,
  source: string,
): Promise<ValidationResult> {
  try {
    // Import AJV and formats dynamically
    const { default: Ajv } = await import(AJV_URL)
    const { default: addFormats } = await import(AJV_FORMATS_URL)

    const ajv = new Ajv({ allErrors: true })
    addFormats(ajv) // Add format validation support

    const validate = ajv.compile(schema)
    const valid = validate(config)

    return {
      valid,
      errors: validate.errors || [],
    }
  } catch (error) {
    console.error(`Failed to validate ${source}: ${error.message}`)
    return { valid: false, errors: [{ message: error.message }] }
  }
}

/**
 * Find and validate all template configuration files
 */
async function validateTemplates(schema: any): Promise<boolean> {
  let allValid = true
  const templatesDir = join(Deno.cwd(), 'templates')

  console.log('\n📁 Validating template configurations...')

  for await (
    const entry of walk(templatesDir, {
      exts: ['.json'],
      includeDirs: false,
    })
  ) {
    if (entry.name === '.todoexpandrc.json') {
      const configContent = await Deno.readTextFile(entry.path)

      try {
        const config = JSON.parse(configContent)
        const result = await validateConfig(schema, config, entry.path)

        if (result.valid) {
          console.log(`  ✅ ${entry.path}`)
        } else {
          console.error(`  ❌ ${entry.path}`)
          for (const error of result.errors || []) {
            console.error(
              `     - ${error.instancePath || 'root'}: ${error.message}`,
            )
          }
          allValid = false
        }
      } catch (error) {
        console.error(`  ❌ ${entry.path}: Invalid JSON - ${error.message}`)
        allValid = false
      }
    }
  }

  return allValid
}

/**
 * Validate the current project's .todoexpandrc.json if it exists
 */
async function validateProjectConfig(schema: any): Promise<boolean> {
  const configPath = join(Deno.cwd(), '.todoexpandrc.json')

  try {
    const configContent = await Deno.readTextFile(configPath)
    const config = JSON.parse(configContent)

    console.log('\n📄 Validating project configuration...')
    const result = await validateConfig(schema, config, configPath)

    if (result.valid) {
      console.log(`  ✅ ${configPath}`)
      return true
    } else {
      console.error(`  ❌ ${configPath}`)
      for (const error of result.errors || []) {
        console.error(
          `     - ${error.instancePath || 'root'}: ${error.message}`,
        )
      }
      return false
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log('\n📄 No project .todoexpandrc.json found (OK)')
      return true
    }
    console.error(`\n❌ Error validating project config: ${error.message}`)
    return false
  }
}

/**
 * Validate example configurations embedded in the schema
 */
async function validateSchemaExamples(schema: any): Promise<boolean> {
  console.log('\n📚 Validating schema examples...')

  if (!schema.examples || !Array.isArray(schema.examples)) {
    console.log('  ⚠️  No examples found in schema')
    return true
  }

  let allValid = true

  for (let i = 0; i < schema.examples.length; i++) {
    const example = schema.examples[i]
    const result = await validateConfig(
      schema,
      example,
      `schema example ${i + 1}`,
    )

    if (result.valid) {
      console.log(`  ✅ Example ${i + 1}`)
    } else {
      console.error(`  ❌ Example ${i + 1}`)
      for (const error of result.errors || []) {
        console.error(
          `     - ${error.instancePath || 'root'}: ${error.message}`,
        )
      }
      allValid = false
    }
  }

  return allValid
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  console.log('🔍 Starting todo-expander schema validation...\n')

  try {
    // Load and validate schema
    const schema = await loadSchema()

    // Run all validations
    const results = await Promise.all([
      validateTemplates(schema),
      validateProjectConfig(schema),
      validateSchemaExamples(schema),
    ])

    const allValid = results.every((result) => result)

    if (allValid) {
      console.log('\n🎉 All validations passed!')
      Deno.exit(0)
    } else {
      console.error('\n❌ Some validations failed. See errors above.')
      Deno.exit(1)
    }
  } catch (error) {
    console.error(`\n💥 Validation script failed: ${error.message}`)
    Deno.exit(1)
  }
}

if (import.meta.main) {
  await main()
}
