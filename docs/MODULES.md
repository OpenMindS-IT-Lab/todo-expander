# Modules

bin/todo-expand.ts

- CLI entrypoint. Parses flags, loads config/env, discovers targets, and orchestrates processing.

src/config.ts

- `Cfg`: Resolved configuration type.
- `loadConfig(...)`: Merge defaults with CLI/env, normalizing list flags.

src/targets.ts

- `discoverTargets(...)`: Resolve files either from staged git changes or provided paths, respecting include/exclude and size limits.

src/todos.ts

- `detectTodos(content)`: Return positions and raw text for single-line and block TODOs that are not yet structured.

src/process.ts

- `processFile({ absPath, relPath, cfg, apiKey, dryRun })`: High-level per-file workflow; reads/writes content, formats, and tracks stats.
- Internal helpers for bottom-up TODO rewriting, batched LLM calls, cross-file cache reuse, context extraction, cache keys, and language inference.

src/prompt.ts

- `renderPrompt(...)`: Prefer external template; fallback to a compact inline prompt.
- `renderPromptBatch(...)`: Build one prompt for multiple TODOs with stable separators.
- `runLLM(...)`: Call OpenAI Responses API and extract text.

src/rewrite.ts

- `applyRewrites(...)`: Replace a TODO with new structured comment, normalizing to original style (line vs block).

src/cache.ts

- `readCache(path)`: Read JSON cache or return `{}`.
- `writeCache(path, data)`: Persist JSON cache.

src/format.ts

- `formatFiles(files)`: Best-effort formatting via Prettier or `deno fmt` fallback.

src/log.ts

- Color helpers for consistent terminal output.
