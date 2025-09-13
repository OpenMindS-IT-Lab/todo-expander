# AI Workflow: TODO Expander

This Notebook contains ready-to-run snippets for your global TODO-expansion flow. Import it into your Personal Warp Drive → AI Workflow folder.

## 🔑 Preflight
```warp-runnable-command
# Ensure your OpenAI API key is available
export OPENAI_API_KEY={{OPENAI_API_KEY}}

# Optional: verify the key without printing it
curl -sS https://api.openai.com/v1/models \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" | \
  jq 'if .error then "❌ " + .error.message else "✅ OpenAI API key valid" end'
```

## 🚀 Expand TODOs in staged files
```warp-runnable-command
# Rewrites plain TODOs in staged files into Codex-ready briefs, then re-stages and formats
# Requires: `todo-expand` on PATH
todo-expand --staged
```

## 👀 Dry-run preview (no changes)
```warp-runnable-command
# Preview rewrites without writing files
TODO_EXPAND_DRY=1 todo-expand --staged
```

## 🎯 Expand TODOs in a specific file
```warp-runnable-command
# Usage: replace ./src/file.ts with the target path
ARG=./src/file.ts todo-expand "$ARG"
```

## ✅ CI-style TODO check (staged)
```warp-runnable-command
# Fails when raw TODOs are found in staged files
files=$(git diff --name-only --cached | grep -E '\\.(ts|tsx|js|jsx|py|go|rs|md)$' || true)
if [ -z "$files" ]; then echo "No staged source files"; exit 0; fi
bad=$(grep -nE 'TODO(:| )' $files | grep -viE 'AI TASK|Context|Goal|Steps|Constraints|Acceptance' || true)
if [ -n "$bad" ]; then echo "Found unstructured TODOs:"; echo "$bad"; exit 1; fi
echo "No raw TODOs found"
```

## 🛠️ Install global hook (optional)
```warp-runnable-command
# Set a global hooks path once
git config --global core.hooksPath ~/.git-hooks
mkdir -p ~/.git-hooks
cat > ~/.git-hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
# Skip if repo opted out
if [ -f .no-todo-expand ]; then exit 0; fi
# Expand TODOs in staged files
if command -v todo-expand >/dev/null 2>&1; then
  TODO_EXPAND_DRY=
  todo-expand --staged || true
  # Re-stage any changes
  git add -A
  # Format touched files (best-effort)
  if command -v prettier >/dev/null 2>&1; then
    files=$(git diff --name-only --cached | tr '\n' ' ')
    [ -n "$files" ] && npx prettier --write $files || true
    git add -A
  fi
fi
HOOK
chmod +x ~/.git-hooks/pre-commit
```

## 💡 Tips
- Add a VS Code snippet for an “AI TASK” skeleton to seed structured TODOs manually when desired.
- Use Warp Workflow “Expand TODOs (staged)” for one-click runs.
- Maintain a `.todoexpandrc.json` in repos for per-repo fine-tuning (include/exclude globs, section names).
