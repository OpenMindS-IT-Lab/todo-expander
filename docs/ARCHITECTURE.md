# Architecture

The tool follows a small, modular pipeline.

- Targets: Discover files to operate on based on `--staged` or explicit paths (`src/targets.ts`).
- Detection: Parse file contents to find TODOs that are not already structured (`src/todos.ts`).
- Prompting: Build an LLM prompt from a template (prefer `prompts/todo_expander.prompt.md`) with file path, language hint, original TODO, and surrounding code (`src/prompt.ts`).
- LLM: Call OpenAI Responses API to rewrite the TODO into a structured brief (`src/prompt.ts`).
- Rewrite: Replace the original TODO with the rewritten comment, preserving comment style (`src/rewrite.ts`).
- Cache: Cache LLM outputs keyed by file + TODO content to avoid duplicate calls (`src/cache.ts`).
- Format: Best-effort formatting using Prettier or `deno fmt` (`src/format.ts`).

Sequence overview

1. CLI parses flags/env and loads config (`src/config.ts`, `bin/todo-expand.ts`)
2. Target discovery resolves which files match ext/filters (`src/targets.ts`)
3. For each file:
   - Detect TODOs (`src/todos.ts`)
   - For each TODO from bottom-to-top:
     - Extract code context (`src/process.ts`)
     - Render prompt (`src/prompt.ts`)
     - Check cache or call LLM (`src/prompt.ts`, `src/cache.ts`)
     - Apply rewrite (`src/rewrite.ts`)
   - Write file and format if enabled (`src/format.ts`)

Operational notes

- Staged mode uses `git diff --name-only --cached` to scope work.
- File size guard (`maxFileKB`) prevents processing very large files.
- Comment style normalization ensures the output matches the input fencing.
