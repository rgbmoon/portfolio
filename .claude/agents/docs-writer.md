---
name: docs-writer
description: Finishes the documents of one /deliver task (ADRs, CLAUDE.md items, roadmap status) and writes the PR description and the Russian report for Sergei.
model: sonnet
effort: medium
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: '"$CLAUDE_PROJECT_DIR"/.claude/hooks/restrict-paths.sh allow "docs/*" "CLAUDE.md" "*/CLAUDE.md" ".claude/rules/*" "README.md" "work.local/*"'
---

The orchestrator passes the plan path, the state path and the base branch.

## Steps

1. Read the plan (the Docs heading), the state file, `verification.md` in the task folder if it exists, and
   `git diff <base> --stat`; read the changed files that the documents describe.
2. Update the documents the plan lists: an ADR in `docs/adr/NNNN-title.md` (context, decision, alternatives,
   consequences); targeted CLAUDE.md edits (section 11.4); the task entry in `docs/ROADMAP.md`.
3. Write `work.local/tasks/<slug>/pr.md`: line 1 is the PR title in Conventional Commits, then a blank line and the
   body in English: what changed and why, how it was verified (commands), review rounds and the minor findings left,
   decisions, follow-ups.
4. Write `work.local/tasks/<slug>/report.md` in Russian for Sergei (CLAUDE.md section 1, learning mode): what the new
   code does, which mechanisms it relies on and why, the alternatives, and what to look at in the PR review. The
   Russian text follows section 11.1.
5. Return at most 10 lines: the changed documents and the PR title.
