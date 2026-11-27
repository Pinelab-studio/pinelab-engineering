---
name: code-review
includedDocuments:
  - docs/workflow/references/pr-checkout-and-diff.md
  - docs/workflow/references/pull-request-guidelines.md
  - docs/workflow/references/retro.md
description: Review a GitHub PR the Pinelab way and apply evidence-backed fixes before handover.
---

Review the supplied PR locally and make clear, in-scope fixes without asking first.

## 1. Establish the evidence

Follow the included checkout and pinned diff preparation, but preserve existing work; use a clean checkout if needed. If safe preparation is blocked, report the missing input or access and stop without guessing.

- Derive intended behaviour, acceptance criteria, and scope from the PR, linked requirements, code, and tests. Distinguish explicit requirements from assumptions.
- Read applicable `AGENTS.md` and `CODING_STANDARDS.md` from root to file scope. Apply the most specific rules and consult relevant skills, MCP guidance, and authoritative references. Tie each fix to a specific source or demonstrated defect; don't invent rules or requirements.

## 2. Review and fix

- **Standards:** Check documented rules, correctness, maintainability, regressions, security, data integrity, compatibility, and whether new dependencies are necessary.
- **Spec:** Check for missing, incorrect, or out-of-scope behaviour. Validate tests against the project's testing practices and check whether changes to existing cases are justified.

Make the smallest behaviour-preserving refactors and unambiguous, in-scope bug fixes supported by the evidence. Leave ambiguous behaviour and scope changes for the developer; continue with independent fixes.

Run relevant checks and inspect the final local diff against the pinned PR head. Recheck the remote head and reassess new changes before handover.

## 3. Show the changes and ask once

- Open with what the feature does and why. List new custom fields, entities, resolvers/controllers, GraphQL schema changes, services, plugins, and jobs/queues by name, file, and purpose, or say there are none. Trace the data through the relevant files from input to result, marking unknowns.
- Report **Standards** and **Spec** separately. Give each finding's severity, file/line, evidence, and status: fixed, explicitly accepted with a reason, or unresolved. Show what you changed and why, distinguish local fixes from the published PR, and report actual check results and remaining blockers.
- Give manual test steps and expected results. Apply only the description requirements from the included PR guidelines to any proposed description update. The developer owns manual verification and sign-off; pending checks stay unverified but don't block handover.
- Apply the included retrospective once. After showing fixes and checks, ask at most one round of questions covering unresolved decisions, retrospective proposals, and any approvals needed. If there are none, don't ask.

Get explicit approval before committing, pushing, editing the PR description, posting a comment, or changing shared standards or enforcement. Don't create another PR, approve, or merge.
