#!/usr/bin/env bash
# Runs lint, typecheck and tests of all packages through the Turborepo cache: unchanged packages are cache hits.
# With --hook it runs as a Stop hook: exit code 2 keeps the agent working and returns the last error lines to it.
# The hook lets the agent stop when its last message reports STATUS: TEST_DISPUTE, DECISION_NEEDED or BLOCKED:
# such a stop waits for Sergei's answer.
# In the parallel mode of /deliver the prompt of a part implementer starts with `Check packages: @portfolio/<name> ...`:
# the hook then checks only these packages, so the unfinished work of the other part does not fail the checks.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

filters=()
if [[ ${1:-} == --hook ]]; then
  input=$(cat)
  transcript=$(jq -r '.agent_transcript_path // .transcript_path // empty' <<<"$input")
  last=$(jq -r '.last_assistant_message // empty' <<<"$input")
  [[ -n $transcript && -f $transcript ]] && last+=$(tail -n 3 "$transcript")
  [[ $last =~ STATUS:\ (TEST_DISPUTE|DECISION_NEEDED|BLOCKED) ]] && exit 0
  if [[ -n $transcript && -f $transcript ]]; then
    # The first transcript entry holds the prompt of the agent.
    prompt=$(head -n 1 "$transcript" | jq -r '.message.content
      | if type == "string" then . else map(.text // "") | join("\n") end' 2>/dev/null)
    for package in $(sed -n 's/^Check packages://p' <<<"$prompt" | head -n 1); do
      [[ $package =~ ^@portfolio/[a-z0-9-]+$ ]] && filters+=("--filter=$package")
    done
  fi
fi

# Bash 3.2 (macOS) treats an empty array as unbound under `set -u`; the `+` form expands it to nothing.
out=$({ pnpm exec turbo run lint typecheck test ${filters[@]+"${filters[@]}"} --continue --output-logs=errors-only &&
  pnpm exec tsc; } 2>&1)
status=$?
if [[ $status -ne 0 ]]; then
  echo "Checks failed (lint, typecheck or tests). Fix the errors below before finishing:" >&2
  echo "$out" | tail -n 100 >&2
  exit 2
fi
exit 0
