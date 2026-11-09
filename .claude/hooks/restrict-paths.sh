#!/usr/bin/env bash
# PreToolUse hook for Write and Edit in agent definitions: limits the files an agent may change.
# Usage: restrict-paths.sh allow|deny <glob>... Globs are relative to the project root; `*` also matches `/`.
set -euo pipefail

mode=$1
shift
file=$(jq -r '.tool_input.file_path // empty')
[[ -z $file ]] && exit 0
rel=${file#"$CLAUDE_PROJECT_DIR"/}

matched=no
for pattern in "$@"; do
  # shellcheck disable=SC2053 # the pattern is a glob on purpose
  if [[ $rel == $pattern ]]; then
    matched=yes
    break
  fi
done

if [[ $mode == allow && $matched == no ]] || [[ $mode == deny && $matched == yes ]]; then
  echo "Blocked by .claude/hooks/restrict-paths.sh ($mode $*): $rel" >&2
  exit 2
fi
exit 0
