# JSON Schema for TODO Expander Configuration

This directory contains the JSON Schema for `.todoexpandrc.json` configuration files used by todo-expander.

## Schema URL

```
https://raw.githubusercontent.com/OpenMindS-IT-Lab/todo-expander/main/schema/todoexpand.schema.json
```

## Usage in Configuration Files

To enable IntelliSense and validation in your IDE, add the `$schema` property to your `.todoexpandrc.json`:

### Remote Schema (Recommended)

```json
{
  "$schema": "https://raw.githubusercontent.com/OpenMindS-IT-Lab/todo-expander/main/schema/todoexpand.schema.json",
  "style": "verbose",
  "include": ["ts", "tsx", "js", "jsx"],
  "exclude": ["node_modules", "build", "dist", ".git"],
  "sections": ["Context", "Goal", "Steps", "Constraints", "Acceptance"]
}
```

### Local Schema (Alternative)

If developing locally or the remote schema isn't available yet:

```json
{
  "$schema": "./node_modules/todo-expander/schema/todoexpand.schema.json",
  "style": "verbose"
}
```

**Note**: The remote schema URL will be available once the schema is published to the main repository branch.

## IDE Support

### VS Code

With the `$schema` property, VS Code will automatically:

- ✅ Provide IntelliSense with property suggestions
- ✅ Validate property types and values
- ✅ Show documentation on hover
- ✅ Highlight validation errors

### Other IDEs

Most modern IDEs that support JSON Schema will work with the schema URL:

- IntelliJ IDEA / WebStorm
- Vim with appropriate plugins
- Emacs with json-mode
- Neovim with LSP

## Schema Features

### Comprehensive Validation

- **Type checking**: Ensures correct data types for all properties
- **Value constraints**: Validates ranges for numeric values (timeouts, concurrency, etc.)
- **Enum validation**: Restricts `style` to "succinct" or "verbose"
- **Pattern matching**: File extensions must be lowercase alphanumeric
- **Array validation**: Ensures sections and includes are non-empty arrays

### Rich Documentation

- **Descriptions**: Every property has detailed documentation
- **Examples**: Multiple example configurations included
- **Default values**: Shows default values for all properties

### Example Configurations

The schema includes three complete example configurations:

1. **Base**: Standard single-repository project
2. **Monorepo**: Multi-language monorepo with higher concurrency
3. **Non-git**: Non-git project with caching disabled

## Validation

### Automatic Validation

Configuration files are automatically validated:

- During `todo-expand init` (when creating new configs)
- When loading configuration in the CLI
- In CI via the validation script

### Manual Validation

You can validate schemas manually:

```bash
# Validate all templates and project config
deno task schema:validate

# Or run the script directly
deno run --allow-read --allow-net scripts/validate-schema.ts
```

## Schema Properties

### Core Configuration

| Property   | Type                      | Default                                                     | Description                |
| ---------- | ------------------------- | ----------------------------------------------------------- | -------------------------- |
| `include`  | `string[]`                | `["ts", "tsx", "js", "jsx"]`                                | File extensions to process |
| `exclude`  | `string[]`                | `["node_modules", "build", "dist", ".git"]`                 | Directory segments to skip |
| `style`    | `"succinct" \| "verbose"` | `"succinct"`                                                | Brief verbosity style      |
| `sections` | `string[]`                | `["Context", "Goal", "Steps", "Constraints", "Acceptance"]` | Brief section names        |

### OpenAI Configuration

| Property         | Type      | Default                                        | Description                     |
| ---------------- | --------- | ---------------------------------------------- | ------------------------------- |
| `model`          | `string`  | `"gpt-4o-mini"`                                | OpenAI model ID                 |
| `endpoint`       | `string`  | `"https://api.openai.com/v1/chat/completions"` | API endpoint URL                |
| `timeout`        | `integer` | `45000`                                        | Request timeout (1000-300000ms) |
| `retries`        | `integer` | `2`                                            | Retry attempts (0-5)            |
| `retryBackoffMs` | `integer` | `500`                                          | Base retry delay (100-5000ms)   |

### Processing Configuration

| Property           | Type      | Default  | Description                          |
| ------------------ | --------- | -------- | ------------------------------------ |
| `concurrency`      | `integer` | `1`      | Parallel requests (1-10)             |
| `contextLines`     | `integer` | `12`     | Context lines around TODO (0-50)     |
| `maxFileKB`        | `integer` | `512`    | Max file size to process (1-10240KB) |
| `perFileTimeoutMs` | `integer` | `120000` | Per-file timeout (10000-600000ms)    |

### Behavior Configuration

| Property      | Type      | Default | Description                 |
| ------------- | --------- | ------- | --------------------------- |
| `cache`       | `boolean` | `true`  | Enable response caching     |
| `format`      | `boolean` | `true`  | Run formatter after rewrite |
| `print`       | `boolean` | `false` | Print rewritten comments    |
| `strict`      | `boolean` | `false` | Strict validation mode      |
| `verboseLogs` | `boolean` | `false` | Enable verbose logging      |

## Contributing

When adding new configuration properties:

1. **Update the schema**: Add the property to `todoexpand.schema.json`
2. **Add validation**: Include type, constraints, and description
3. **Update examples**: Add the property to relevant schema examples
4. **Update templates**: Add to appropriate template files
5. **Run validation**: Ensure `deno task schema:validate` passes
6. **Update documentation**: Add to this README and main docs

## Schema Development

### Local Testing

```bash
# Validate schema syntax
cat schema/todoexpand.schema.json | jq .

# Test against specific config
echo '{"style": "invalid"}' | ajv validate -s schema/todoexpand.schema.json

# Run full validation suite
deno task schema:validate
```

### CI Integration

The schema validation runs in CI to ensure:

- Schema file is valid JSON
- All template configurations validate
- Schema examples are valid
- Project configuration validates

## License

This schema is part of the todo-expander project and follows the same license terms.
