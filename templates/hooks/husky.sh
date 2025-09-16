#!/usr/bin/env sh
# Husky pre-commit hook for todo-expander
# Install: npx husky add .husky/pre-commit "bash .husky/todo-expand-hook"
# Save this file as: .husky/todo-expand-hook

# Skip if explicitly disabled
if [ -f .no-todo-expand ]; then
  echo "Skipping todo-expand (found .no-todo-expand)"
  exit 0
fi

# Only run if todo-expand is available
if command -v todo-expand >/dev/null 2>&1; then
  echo "Expanding TODOs in staged files..."
  
  # Run todo-expand on staged files
  if todo-expand --staged; then
    # Re-stage any modified files
    git add -A
    echo "TODO expansion complete"
  else
    echo "TODO expansion failed - check errors above"
    exit 1
  fi
else
  echo "Warning: todo-expand not found in PATH"
  echo "Install: npm install -g @openminds-it-lab/todo-expander"
fi