# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

Todo-expander is a Deno-based CLI tool that transforms simple TODO comments into structured, Codex-ready task briefs. It uses OpenAI's API to intelligently expand plain TODO comments into detailed specifications with Context/Goal/Steps/Constraints/Acceptance sections.

## Architecture

The codebase follows a modular functional architecture:

- **CLI Entry Point** (`bin/todo-expand.ts`): Command-line interface with argument parsing and orchestration
- **Core Processing Pipeline** (`src/`):
  - `config.ts`: Configuration management with CLI overrides and environment variable support
  - `targets.ts`: File discovery (staged files via git or explicit paths)
  - `process.ts`: Main processing orchestrator that coordinates all steps
  - `todos.ts`: TODO detection (single-line `//`, `#` and block `/* */` comments)
  - `prompt.ts`: LLM prompt rendering and API interaction
  - `rewrite.ts`: String manipulation to replace TODO comments in-place
  - `cache.ts`: Response caching to avoid redundant LLM calls
  - `format.ts`: Code formatting integration
  - `log.ts`: Colored terminal output utilities

### Processing Flow

1. **Target Discovery**: Find files to process (staged git files or explicit paths)
2. **TODO Detection**: Parse files for unstructured TODO comments using regex patterns
3. **Context Extraction**: Extract surrounding code lines for LLM context
4. **Prompt Generation**: Use the structured prompt template (`prompts/todo_expander.prompt.md`)
5. **LLM Processing**: Call OpenAI API with caching support
6. **Content Rewriting**: Replace original TODOs with structured briefs in-place
7. **Formatting**: Run code formatter on modified files

### Key Design Decisions

- **Cache-First**: Uses FNV-1a hashing to cache LLM responses in `.git/.todoexpand-cache.json`
- **Bottom-Up Processing**: Processes TODOs from end to start to preserve line indices
- **In-Place Rewriting**: Maintains original comment style (`//`, `#`, `/* */`)
- **Context Aware**: Includes surrounding code lines for better LLM understanding

## Development Commands

### Essential Commands

```bash
# Run on staged files
deno task todo:staged

# Run on specific file(s)
deno task todo:file path/to/file.ts

# Build standalone CLI binary
deno task build:cli

# Format code
deno task fmt

# Lint code
deno task lint
```

### Development Testing

```bash
# Dry run on staged files (no file modifications)
deno run -A bin/todo-expand.ts --staged --dry-run

# Test with specific parameters
deno run -A bin/todo-expand.ts --include=ts,js --exclude=test --style=verbose path/to/file.ts

# Test with different models
OPENAI_MODEL=gpt-4 deno run -A bin/todo-expand.ts --staged
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` (required): OpenAI API key for LLM calls
- `OPENAI_MODEL` (optional): Model to use (default: `gpt-4o-mini`)
- `TODO_EXPAND_DRY` (optional): Set to `1` for dry-run mode

### CLI Flags

- `--staged`: Process only git-staged files
- `--dry-run` / `-n`: Preview changes without writing
- `--no-cache`: Skip response caching
- `--no-format`: Skip code formatting after rewrite
- `--include=ext1,ext2`: File extensions to include (default: ts,tsx,js,jsx)
- `--exclude=dir1,dir2`: Directories to exclude (default: node_modules,build,dist,.git)
- `--style=succinct|verbose`: Output style preference
- `--sections=Context,Goal,Steps`: Custom section names
- `--context-lines=N`: Lines of code context to include (default: 12)
- `--timeout=<ms>`: Per-request timeout (default: 45000)
- `--retries=<n>`: Retry attempts for timeout/429/5xx (default: 2)
- `--retry-backoff-ms=<n>`: Base backoff in ms for retries (default: 500)
- `--file-timeout=<ms>`: Abort processing a file after this many ms (default: 120000)
- `--concurrency=N`: Parallel LLM requests (default: 1)

### Future Config Files (TODO in codebase)

- `~/.config/todo-expand/config.json`: Global configuration
- `.todoexpandrc.json`: Per-repository configuration

## TODO Detection Patterns

The tool detects these TODO formats:

- Single-line: `// TODO: description`, `# TODO: description`
- Block comments: `/* TODO: multi-line description */`
- Case-insensitive matching for "TODO"
- Skips already-structured TODOs containing keywords: `AI TASK`, `Context`, `Goal`, `Steps`, `Constraints`, `Acceptance`

## Warp Integration

### Pre-built Workflows

The `warp/workflows/` directory contains ready-to-use Warp workflows:

- `expand-todos-staged.yaml`: Process staged files
- `expand-todos-file.yaml`: Process specific file (requires ARG environment variable)
- `expand-todos-dry.yaml`: Dry-run preview
- `check-raw-todos.yaml`: CI-style validation

### Notebook Integration

`warp/AI_Workflow_TODO_Expander_Notebook.md` contains runnable commands for common workflows, including:

- API key verification
- Global git hook setup
- CI-style TODO validation

### Usage with Warp

1. Set `OPENAI_API_KEY` in your environment
2. Run workflows via Warp's workflow picker
3. Use `ARG=path/to/file` for file-specific workflows

## Testing Strategy

When modifying the core logic:

1. **Test TODO Detection**: Verify `src/todos.ts` with various comment styles
2. **Test Context Extraction**: Ensure proper line extraction in `src/process.ts`
3. **Test Cache Behavior**: Verify cache hits/misses with identical TODO comments
4. **Test Rewriting Logic**: Ensure `src/rewrite.ts` preserves file structure and handles edge cases
5. **Integration Testing**: Run against real files with mixed TODO formats

## Permissions

The CLI requires extensive permissions (`-A`) or specifically:

- `--allow-read`: Read source files and config
- `--allow-write`: Write modified files and cache
- `--allow-env`: Access environment variables (API keys, model selection)
- `--allow-run=git`: Execute git commands for staged file detection
- `--allow-net=api.openai.com`: Make OpenAI API calls

## Common Issues

- **Missing API Key**: Tool will exit with code 2 if `OPENAI_API_KEY` is not set
- **Large Files**: Files over 512KB are skipped (configurable via `maxFileKB`)
- **Git Integration**: Staged file detection requires being in a git repository
- **Cache Location**: Cache is stored in `.git/.todoexpand-cache.json` (git-ignored by default)
