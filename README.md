# TODO Expander

Transform simple TODO comments into structured, Codex-ready task briefs using AI.

## Docs

- docs/ARCHITECTURE.md: Pipeline and design overview
- docs/MODULES.md: Module-by-module reference

## Overview

TODO Expander is a Deno-based CLI tool that automatically converts plain TODO comments into detailed, structured specifications that are ready for AI coding assistants. Instead of vague `// TODO: fix this later`, get comprehensive briefs with Context, Goal, Steps, Constraints, and Acceptance criteria.

### Before

```javascript
// TODO: Extract time formatting utility
```

### After

```javascript
// TODO: Extract time formatting utility
// Context
// - React + TypeScript; current formatter is inline and reused across views.
// Goal
// - Move the mm:ss formatter into src/utils/datetime.ts as a named export.
// Steps
// 1) Create src/utils/datetime.ts with: export const formatTime = (seconds: number): string => { /* same logic */ }
// 2) Replace local usage with: import { formatTime } from '../utils/datetime'
// 3) Remove the local function.
// 4) Add tests for: 0->"00:00", 5->"00:05", 65->"01:05", 3599->"59:59".
// Constraints
// - Pure function; no Date APIs; keep padStart semantics.
// Acceptance
// - Type-checks and tests pass; UI timer unchanged; no new warnings.
```

## Features

- 🤖 **AI-Powered**: Uses OpenAI's GPT models to intelligently expand TODOs
- 🎯 **Context-Aware**: Analyzes surrounding code for better understanding
- 💾 **Smart Caching**: Avoids redundant API calls with FNV-1a hashing
- 🔄 **Git Integration**: Works seamlessly with staged files
- 📝 **Comment Preservation**: Maintains original comment style (`//`, `#`, `/* */`)
- ⚡ **Parallel Processing**: Concurrent API requests for better performance
- 🎨 **Auto-Formatting**: Optionally formats modified files after processing
- 🔍 **Dry Run**: Preview changes before applying them

## Installation

### Prerequisites

- [Deno](https://deno.land/) (v1.30 or later)
- OpenAI API key

### Quick Install

```bash
# Clone the repository
git clone <repository-url>
cd todo-expander

# Build the CLI binary
deno task build:cli

# Add to PATH (optional)
sudo cp dist/todo-expand /usr/local/bin/
```

### Development Setup

```bash
# Run directly with Deno
deno run -A bin/todo-expand.ts --help

# Or use the task runner
deno task todo:file path/to/file.ts
```

## Usage

### Setup

Export your OpenAI API key:

```bash
export OPENAI_API_KEY="your-api-key-here"
```

### Basic Commands

```bash
# Process all staged files
todo-expand --staged

# Process specific files
todo-expand src/components/App.tsx src/utils/helpers.ts

# Dry run (preview changes without writing)
todo-expand --staged --dry-run

# Use different model
OPENAI_MODEL=gpt-4 todo-expand --staged
```

### Advanced Options

```bash
# Custom file extensions and exclusions
todo-expand --include=ts,js,py --exclude=test,spec --staged

# Verbose output with custom sections
todo-expand --style=verbose --sections="Context,Goal,Implementation,Testing" file.ts

# Skip caching and formatting
todo-expand --no-cache --no-format --staged

# Adjust context and concurrency
todo-expand --context-lines=20 --concurrency=5 --staged
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for LLM calls |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model to use |
| `TODO_EXPAND_DRY` | No | - | Set to `1` for dry-run mode |

### CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--staged` | Process only git-staged files | - |
| `--dry-run`, `-n` | Preview changes without writing | `false` |
| `--no-cache` | Skip response caching | `false` |
| `--no-format` | Skip code formatting after rewrite | `false` |
| `--include=ext1,ext2` | File extensions to include | `ts,tsx,js,jsx` |
| `--exclude=dir1,dir2` | Directories to exclude | `node_modules,build,dist,.git` |
| `--style=succinct\|verbose` | Output style preference | `succinct` |
| `--sections=Context,Goal,Steps` | Custom section names | `Context,Goal,Steps,Constraints,Acceptance` |
| `--context-lines=N` | Lines of code context to include | `12` |
| `--concurrency=N` | Parallel LLM requests | `3` |

## TODO Detection

The tool automatically detects and processes these TODO formats:

### Supported Formats

```javascript
// TODO: Single-line JavaScript/TypeScript comment
# TODO: Python/shell comment
/* TODO: Block comment */
/* TODO: 
   Multi-line block comment
*/
```

### Skipped TODOs

Already structured TODOs containing these keywords are skipped:

- `AI TASK`
- `Context`
- `Goal`
- `Steps`
- `Constraints`
- `Acceptance`

## Integration

### Git Hooks

Set up automatic TODO expansion on commit:

```bash
# Set global hooks directory
git config --global core.hooksPath ~/.git-hooks
mkdir -p ~/.git-hooks

# Create pre-commit hook
cat > ~/.git-hooks/pre-commit <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
# Skip if repo opted out
if [ -f .no-todo-expand ]; then exit 0; fi
# Expand TODOs in staged files
if command -v todo-expand >/dev/null 2>&1; then
  todo-expand --staged || true
  git add -A
fi
EOF

chmod +x ~/.git-hooks/pre-commit
```

### Pre-commit Formatting

Use a repo-tracked hook to auto-format staged files with `deno fmt` before committing:

```bash
# One-time: point git at the repo hooks directory and make the hook executable
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit

# Or via deno task
deno task githooks:install
```

The hook formats staged TS/JS/JSON/MD files and re-stages them so the commit includes the changes. Create a `.no-format-hook` file at the repo root to temporarily opt out.

### Warp Workflows

The project includes pre-built Warp workflows in `warp/workflows/`:

- `expand-todos-staged.yaml`: Process staged files
- `expand-todos-file.yaml`: Process specific file
- `expand-todos-dry.yaml`: Dry-run preview
- `check-raw-todos.yaml`: CI validation

### CI Integration

Validate that no unstructured TODOs exist in your codebase:

```bash
# Check for raw TODOs (exits with code 1 if found)
files=$(git diff --name-only --cached | grep -E '\.(ts|tsx|js|jsx|py|go|rs|md)$' || true)
if [ -n "$files" ]; then
  bad=$(grep -nE 'TODO(:| )' $files | grep -viE 'AI TASK|Context|Goal|Steps|Constraints|Acceptance' || true)
  if [ -n "$bad" ]; then
    echo "Found unstructured TODOs:"
    echo "$bad"
    exit 1
  fi
fi
```

## Development

### Available Tasks

```bash
# Run on staged files
deno task todo:staged

# Run on specific file
deno task todo:file path/to/file.ts

# Build standalone binary
deno task build:cli

# Format code
deno task fmt

# Lint code
deno task lint
```

### Testing Your Changes

```bash
# Test TODO detection
deno run -A bin/todo-expand.ts --staged --dry-run

# Test with specific parameters
deno run -A bin/todo-expand.ts --include=ts --style=verbose test-file.ts

# Test caching behavior
deno run -A bin/todo-expand.ts --staged  # First run
deno run -A bin/todo-expand.ts --staged  # Should use cache
```

### Architecture

The codebase follows a modular pipeline architecture:

1. **Target Discovery** (`src/targets.ts`): Find files to process
2. **TODO Detection** (`src/todos.ts`): Parse TODO comments
3. **Context Extraction** (`src/process.ts`): Get surrounding code
4. **Prompt Generation** (`src/prompt.ts`): Create LLM prompts
5. **API Interaction** (`src/prompt.ts`): Call OpenAI API
6. **Content Rewriting** (`src/rewrite.ts`): Replace TODOs in-place
7. **Formatting** (`src/format.ts`): Format modified files

## Permissions

The CLI requires these Deno permissions:

```bash
deno run \
  --allow-read \      # Read source files and config
  --allow-write \     # Write modified files and cache
  --allow-env \       # Access API keys and config
  --allow-run=git \   # Execute git for staged files
  --allow-net=api.openai.com \  # Make API calls
  bin/todo-expand.ts
```

Or use `-A` for all permissions (recommended for development).

## Troubleshooting

### Common Issues

#### Missing API Key

```bash
# Error: OPENAI_API_KEY is not set
export OPENAI_API_KEY="your-key-here"
```

#### Git Repository Required

```bash
# Error when using --staged outside git repo
cd /path/to/git/repository
todo-expand --staged
```

#### Large Files Skipped

```bash
# Files over 512KB are skipped by default
# Process specific files instead of using --staged
todo-expand large-file.ts
```

#### Cache Issues

```bash
# Clear cache if responses seem stale
rm .git/.todoexpand-cache.json
```

### Verification

Test your setup:

```bash
# Verify API key
curl -sS https://api.openai.com/v1/models \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" | \
  jq 'if .error then "❌ " + .error.message else "✅ API key valid" end'

# Test on a sample file
echo '// TODO: test comment' > test.js
todo-expand --dry-run test.js
rm test.js
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `deno task fmt` and `deno task lint`
5. Submit a pull request

## License

[License information would go here]

---

**Made with ❤️ and AI assistance**
