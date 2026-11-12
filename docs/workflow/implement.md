---
name: implement
includedDocuments:
  - docs/best-practices/coding-best-practices.md
description: Load this when building or starting to implement a Pinelab task.
---

Implement a refined Pinelab task directly with test-driven development. Reuse refinement and make routine technical decisions yourself; do not run an upfront interview or ask for plan, test, or seam confirmation. Load applicable best practices and project instructions. The calling workflow owns task storage and status changes. Never merge or deploy without explicit authorization.

## 1. Read the task and prepare

Read the full task, supplied context, settled decisions, boundaries, and Definition of Done (DoD). Treat Todo tasks as already refined and approved for implementation. Missing approval transcripts or detailed test instructions are not blockers. Product questions and approval of intended behaviours belong to `get_refine`, not a second implementation interview.

Preserve settled requirements. Fill small gaps from repository evidence and existing behaviour, recording conservative assumptions without expanding scope. Choose in-scope interfaces, error handling, test cases, seams, fixtures, and commands yourself. Do not invent product requirements or silently override explicit exclusions. If contradictory requirements make a correct implementation technically impossible, report the concrete conflict and return that decision to refinement rather than starting a questionnaire.

Inspect the working tree and preserve unrelated changes. Use a task branch based on the updated remote default branch; reuse the existing task branch and partial work when resuming. Never discard work to switch branches. Verify the repository and remote before changing anything.

## 2. Investigate and preflight

Read applicable `AGENTS.md`, best practices, and relevant ADRs. Trace affected public interfaces, implementation, dependencies, and existing tests. Use the project's domain vocabulary and existing patterns. Load `get_vendure_best_practices` for Vendure work and relevant recipes through `list_recipes` / `get_recipe`.

Inspect required runners, fixtures, local services, and regression/lint/type/build commands. Run focused baselines and verify required browser/integration services start before feature edits. Distinguish existing failures from new ones.

Routine local setup is authorized: use the project's package manager and existing lockfile to restore dependencies, run documented setup, and start documented isolated test services. Diagnose failures, attempt supported safe repairs, and rerun the failed command before blocking. Preserve manifests, lockfiles, partial work, and data. Do not upgrade dependencies, touch shared/production services, bypass access controls, or introduce workarounds. Stop retrying when the same failure repeats without new evidence or no supported repair remains.

Record a concise execution outline: intended result, affected areas, assumptions, ordered test cases with expected outcomes and public seams, commands, and final checks. Note what each seam catches and misses. This is an implementation record, not a confirmation gate; proceed immediately.

## 3. Implement one test at a time

Start with the golden path, then consequential edge cases, failures, and regressions. Reuse refined scenarios; add in-scope coverage without asking for approval again.

For each case:

1. Write one behavioural test through a public seam, with only the setup needed for this slice.
2. **RED:** run it and observe failure because the intended capability is missing or incorrect, not because of syntax, configuration, or environment problems.
3. **GREEN:** implement only enough production code to pass while preserving existing behaviour.
4. Run the new test and relevant earlier tests; fix regressions before advancing.
5. Only then write the next test. Keep cleanup and structural redesign separate from this cycle.

Always one test → observed RED → minimal implementation → verified GREEN, never all tests followed by all implementation. If a test already passes, record existing coverage and proceed to the next missing behaviour; never break working code to manufacture RED. Claim results only after observing them.

### Test quality

- Test observable behaviour through public interfaces, not private methods, side channels, or internal call choreography.
- Derive expected values independently from requirements, known-good literals, or worked examples, never the implementation's own calculation.
- Keep internal collaborators real. Use doubles only at external or nondeterministic boundaries; record their limitations.
- Use controlled data, explicit setup, isolated side effects, and project fixture/cleanup conventions. Avoid arbitrary sleeps and test-order dependencies.
- Keep slices vertical: one seam, one case, one minimal implementation. Manual checks supplement rather than silently replace automated RED → GREEN.

## 4. Handle technical blockers

Block only when a concrete technical obstacle prevents safe implementation or required verification after supported recovery: unavailable access or dependencies, unsupported test capabilities, unrecoverable environment failures, conflicting mandatory constraints, or inability to preserve existing work. Missing formal refinement, plan confirmation, or test/seam approval is not a technical blocker.

Do not ask upfront questions or waive checks. Collect all known obstacles and those discoverable through safe investigation. Report the evidence, failed commands, attempted repairs, required external action, partial work, and unverified checks together. Follow the calling workflow's blocker/status procedure; do not claim completion. Explicit access, safety, and authorization boundaries still apply.

## 5. Verify and hand over

Run planned regressions and applicable lint, type, and build checks; perform required manual checks where available. Compare against the full DoD. Do not claim completion while required implementation checks remain unresolved. Human review is a handover step, not a prerequisite to opening a PR; never invent human sign-off.

After implementation and verification succeed:

1. Remove temporary task-specific plan files, not unrelated plans or permanent documentation.
2. Load `get_pull_request_guidelines`. Apply release decisions from refinement; follow existing repository release automation where applicable.
3. Commit task-related changes, push the task branch, and create or update its PR against the remote default branch. Never push directly to the default or production branch.
4. Add the PR URL to the top of the card description.
5. Move the card to `In Review`
