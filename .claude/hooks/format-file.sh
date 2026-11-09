#!/usr/bin/env bash
# PostToolUse hook for Write and Edit: formats the changed file with Prettier.
# Prettier skips files from .prettierignore (Markdown, lockfile) and unknown file types.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // empty')
[[ -z $file || ! -f $file || $file != "$CLAUDE_PROJECT_DIR"/* ]] && exit 0
cd "$CLAUDE_PROJECT_DIR"

if ! out=$(node_modules/.bin/prettier --write --ignore-unknown --log-level warn "$file" 2>&1); then
  echo "Prettier failed on $file:" >&2
  echo "$out" | tail -n 20 >&2
  exit 2
fi
exit 0
