---
name: deliver
description: Delivers one roadmap task with agents - plan, Sergei's approval, tests, implementation and review rounds, verification, documents, commits and a PR. Use when Sergei asks to do, implement or deliver a roadmap task, or types /deliver.
argument-hint: <roadmap task or its description>
---

# Deliver a task

Task: $ARGUMENTS

You orchestrate. The agents from `.claude/agents/` do the work; you keep the state file, pass paths between the agents,
run the checks, make the commits and talk to Sergei in Russian. Keep your own context small: pass file paths instead of
file contents, and read the changed code only when a step requires it.

## 0. Start

1. Find the task in `docs/ROADMAP.md` (iteration and item). Choose a short kebab-case slug.
2. The working tree must be clean and the current branch must be `main`; run `git pull --ff-only`. Otherwise stop and
   ask Sergei.
3. Run `git switch -c task/<slug>`. Create `work.local/tasks/<slug>/state.md` from the template at the end and update
   it after every step.

## 1. Plan and Sergei's approval

1. Run `planner` with the task text, the slug and the plan path `work.local/tasks/<slug>/plan.md`.
2. Tell Sergei in Russian: the goal, the size, the subtasks and the plan path. Ask each `DECISION NEEDED` with
   AskUserQuestion, using the options from the plan.
3. Wait for approval. Write Sergei's decisions into the plan. If the plan has subtasks, this run delivers only the first
   one; the report lists the rest.

## 2. Tests

Skip this step if the plan says that tests are skipped.

1. Run `test-author` with the plan path.
2. On `STATUS: INFRA_NEEDED`: run `implementer` with only that infrastructure as its task, then run `test-author`
   again. These runs do not count as rounds.

## 3. Rounds: implementation and review

The budget is 6 rounds. Rounds 1–3 run `implementer` with its defaults (sonnet, effort high). Rounds 4–6 run a new
`implementer` with model `opus` and effort `high` passed to the Agent tool. Within rounds 1–3, and within rounds 4–6,
continue the same agent with SendMessage. The new agent of round 4 receives the plan path, the state path and the last
findings.

Each round:

1. Implementer. Round 1 receives the plan path; later rounds receive the blocking findings of the previous round.
   Handle the status:
   - `TEST_DISPUTE` or `DECISION_NEEDED`: ask Sergei, write the answer into the plan, continue the same round. A test
     changes only with Sergei's consent, and `test-author` makes the change.
   - `BLOCKED`: stop and report to Sergei.
2. Run `git add -A`, then `.claude/hooks/check.sh`. If it fails, the round ends as FAIL, and its output becomes the
   findings.
3. Run `reviewer` agents in parallel, one per focus, with the plan path and the base branch `main`. Round 1 runs
   `correctness`, `security` and `conventions`; later rounds run `correctness` and the focuses that returned FAIL.
4. If every reviewer returns PASS, the round passes: go to step 4. Otherwise the blocking findings go to the next round.
5. Append to `state.md`: the round, the model, the verdict per focus, one line per blocking finding.

After round 6 without PASS the task is skipped:
- commit the work to the task branch with the message `chore(wip): <slug> skipped after 6 review rounds`, do not push,
  run `git switch main`;
- report to Sergei in Russian: what works; the findings that stayed blocking across rounds; why the implementer could
  not fix them (a missing decision, a plan error, conflicting rules, a test problem), with evidence; the branch name;
- do not start tasks that depend on this one.

## 4. Full verification

Run `pnpm verify`. A failure starts the next round with the output as the findings and counts toward the budget.

## 5. Documents

Run `docs-writer` with the plan path, the state path and the base branch `main`.

## 6. Commits and PR

1. Commit by logical change. Messages follow Conventional Commits in English (CLAUDE.md section 11.3) and end with the
   attribution lines the harness specifies for commits. Commit hooks run on every commit and are never skipped. If a
   hook fails because of the code, the implementer fixes it, and this counts as a round.
2. Run `git push -u origin task/<slug>`.
3. Write the body of `pr.md` (from line 3) to `work.local/tasks/<slug>/pr-body.md` and append the attribution line the
   harness specifies for PR descriptions. Run
   `gh pr create --base main --title "<line 1 of pr.md>" --body-file work.local/tasks/<slug>/pr-body.md`.
4. If the repository has CI checks, wait for them with `gh pr checks --watch` in the background. A failed check starts
   a round with the last lines of `gh run view <id> --log-failed` as the findings; push again after the round.

## 7. Report

The final message to Sergei, in Russian:
- the PR link and title, what changed;
- the acceptance criteria and their status;
- rounds used, models, verdicts; the minor findings left in the PR;
- findings that repeat across rounds or across earlier tasks (`work.local/tasks/*/state.md`) and that a lint rule or a
  rule line could catch (section 11.10: static checks first);
- open questions and the next subtask, if any;
- the path to `report.md`.

Sergei reviews and merges the PR. You do not merge.

## state.md template

```markdown
# <slug>

Task: <iteration, roadmap item>
Branch: task/<slug>
Plan: work.local/tasks/<slug>/plan.md

- [ ] Plan approved
- [ ] Tests written (or skipped: reason)
- [ ] Rounds passed
- [ ] pnpm verify
- [ ] Documents
- [ ] Commits, push, PR: <link>
- [ ] CI

## Rounds

| Round | Model | correctness | security | conventions | Blocking findings |
|---|---|---|---|---|---|
```
