#!/usr/bin/env bash
# PreToolUse hook for Bash: blocks commands that bypass CLAUDE.md sections 6.1 and 11.3.
# Exit code 2 cancels the command and returns stderr to Claude.
set -euo pipefail

cmd=$(jq -r '.tool_input.command // ""')

block() {
  echo "Blocked by .claude/hooks/guard-bash.sh: $1" >&2
  exit 2
}

# Patterns stop at a line break or a command separator, so text in a heredoc (a commit message) does not match.
re_no_verify=$'(^|[;&|[:space:]])git[[:space:]][^;&|\n]*--no-verify'
re_merge='(^|[;&|[:space:]])gh[[:space:]]+pr[[:space:]]+merge'
# Group 2 is one git push segment: it ends at a command separator or a line break.
re_push=$'(^|[;&|[:space:]])(git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push[^;&|\n]*)'
re_force='(--force([[:space:]]|$)|[[:space:]]-f([[:space:]]|$))'
re_main='[[:space:]:](main|master)([[:space:]]|$)'
re_env_reader='(cat|less|more|head|tail|grep|rg|sed|awk|source|cp|mv|scp|curl|base64|xxd|od|strings|nl|jq)'
re_env=$'(^|[;&|[:space:]])'"$re_env_reader"$'[[:space:]][^;&|\n]*\\.env($|[[:space:];&|"\'/]|\\.local)'

[[ $cmd =~ $re_no_verify ]] && block "commit hooks are never skipped (CLAUDE.md section 11.3)"
[[ $cmd =~ $re_merge ]] && block "Sergei merges PRs (CLAUDE.md section 11.3)"
# Each push segment is checked on its own: words of other commands in the same line (`gh pr create --base main`,
# `rm -f`) do not match.
rest=$cmd
pushes=0
while [[ $rest =~ $re_push ]]; do
  # Every =~ test resets BASH_REMATCH, so the match is saved first.
  match=${BASH_REMATCH[0]}
  segment=${BASH_REMATCH[2]}
  [[ $segment =~ $re_force ]] && block "force push is not allowed; --force-with-lease to a task branch is"
  [[ $segment =~ $re_main ]] && block "push to main is not allowed (CLAUDE.md section 11.3)"
  rest=${rest#*"$match"}
  pushes=1
done
if ((pushes)); then
  branch=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
  [[ $branch == main || $branch == master ]] && block "push from main is not allowed (CLAUDE.md section 11.3)"
fi
[[ $cmd =~ $re_env ]] && block ".env files hold secrets; read .env.example instead (CLAUDE.md section 6.1)"

exit 0
