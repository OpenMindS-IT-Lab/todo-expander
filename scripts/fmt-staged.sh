#!/usr/bin/env bash
# Format staged files - macOS compatible

set -e

# Get staged files and filter for files that Deno can format
staged_files=$(git diff --name-only --cached --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|json|jsonc|md)$' | grep -v deno.lock || true)

if [ -n "$staged_files" ]; then
    echo "$staged_files" | while IFS= read -r file; do
        if [ -n "$file" ] && [ -f "$file" ]; then
            echo "Formatting: $file"
            deno run -A npm:prettier@^3.3.3 --log-level warn --write "$file"
        fi
    done
else
    echo "No staged files to format"
fi
