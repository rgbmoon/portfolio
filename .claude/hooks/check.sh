#!/usr/bin/env bash
# Runs lint, typecheck and tests of all packages through the Turborepo cache: unchanged packages are cache hits.
# With --hook it runs as a Stop hook: exit code 2 keeps the agent working and returns the last error lines to it.
# The hook lets the agent stop when its last message reports STATUS: TEST_DISPUTE, DECISION_NEEDED or BLOCKED:
# such a stop waits for Sergei's answer.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

if [[ ${1:-} == --hook ]]; then
  input=$(cat)
  transcript=$(jq -r '.agent_transcript_path // .transcript_path // empty' <<<"$input")
  last=$(jq -r '.last_assistant_message // empty' <<<"$input")
  [[ -n $transcript && -f $transcript ]] && last+=$(tail -n 3 "$transcript")
  [[ $last =~ STATUS:\ (TEST_DISPUTE|DECISION_NEEDED|BLOCKED) ]] && exit 0
fi

out=$({ pnpm exec turbo run lint typecheck test --continue --output-logs=errors-only && pnpm exec tsc; } 2>&1)
status=$?
if [[ $status -ne 0 ]]; then
  echo "Checks failed (lint, typecheck or tests). Fix the errors below before finishing:" >&2
  echo "$out" | tail -n 100 >&2
  exit 2
fi
exit 0
