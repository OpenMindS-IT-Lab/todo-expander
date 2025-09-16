#!/usr/bin/env bash
# Lint staged files - macOS compatible

set -e

# Get staged files and filter for files that Deno can lint
staged_files=$(git diff --name-only --cached --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [ -n "$staged_files" ]; then
    echo "$staged_files" | while IFS= read -r file; do
        if [ -n "$file" ] && [ -f "$file" ]; then
            echo "Linting: $file"
            deno lint --fix "$file"
        fi
    done
else
    echo "No staged files to lint"
fi
