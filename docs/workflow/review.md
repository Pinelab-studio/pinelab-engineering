---
name: code-review
includedDocuments:
  - docs/workflow/references/pr-checkout-and-diff.md
  - docs/workflow/references/pull-request-guidelines.md
  - docs/workflow/references/retro.md
description: Interactively review and improve a GitHub PR the Pinelab way.
---

Review a GitHub pull request locally together with the developer. Complete the included PR checkout and diff preparation before starting the interactive review.

## 1. Establish the spec and standards

### Start with the client value

Once PR evidence is available, open with a short explanation of what the PR introduces functionally and what is in it for the client, before asking any review questions. Use plain language: at most one short paragraph, preferably 2–3 brief bullets or steps instead. Distinguish demonstrated benefits from assumed intent; avoid implementation details unless they explain a client-facing effect.

### Spec

Infer the spec from the PR description, supplied requirements, code, and tests, and optionally Trello card. Summarize intended behaviour, acceptance criteria, and scope before reviewing. Separate explicit requirements from assumptions: code suggests intent but does not prove correctness.

Ask specific questions about ambiguous behaviour; do not broadly request a task or card. Unanswered ambiguities block review of affected requirements only. Compare code and tests against the agreed spec; confirm consequential changes to assumptions rather than silently adapting the spec to the implementation.

### Standards

For each changed file, find and read the applicable `AGENTS.md` and `CODING_STANDARDS.md` files: repository root, parent directories, and nearest scoped instructions. More specific instructions take precedence within their scope. Apply the included retrospective guidance to check for coding standards misplaced in `AGENTS.md`.

Load any tools, best practices and skills that are available and might apply to this code review, including MCP.

Keep two separate review axes:

- **Standards:** documented rules, correctness, risks, and maintainability.
- **Spec:** missing or partial requirements, incorrect behaviour, and unjustified scope expansion.

Optionally delegate the axes to independent sub-agents using the same pinned diff, commits, and source evidence. Keep findings separate and lead the interactive review yourself; otherwise review both axes directly.

## 2. Review interactively, topic by topic

Discuss **requirements, engineering principles, correctness, testing, and handover** topic by topic, not as a one-shot report.

Report evidence-backed findings with axis, severity, file/line, impact, supporting rule or requirement, and proposed action. Prioritize serious risks; distinguish documented violations from judgement calls and avoid duplicating automated style checks.

Implement agreed fixes before moving on and run relevant tests. After every agreed review change, apply the included retrospective guidance and ask whether to capture the lesson in `CODING_STANDARDS.md`; recommend an automated check instead for mechanical rules. Wait for agreement before changing shared guidance or adding checks. Track findings as fixed, explicitly accepted with a reason, or unresolved. Silence is not acceptance; do not expand scope without agreement.

### General correctness

- Bugs, logic errors, regressions, missing error handling, and security or data-integrity risks.
- Unintended side effects, compatibility risks, and breaking changes.
- New dependencies: are they necessary, or can existing capabilities solve the problem?
- Optional: are version and changelog changes required by the repository's release process, and included where required?


### Description

Apply only the description requirements in the included PR guidelines; the creation instructions do not apply to this review. Do not create another PR.

With the developer's agreement, preserve useful content and update the description or post a discussion comment. Use a temporary Markdown file with real newlines; REST avoids older CLI compatibility issues:

```bash
gh api --method PATCH repos/<owner>/<repo>/pulls/<number> -F 'body=@<pr-body-file>'
gh api --method POST repos/<owner>/<repo>/issues/<number>/comments -F 'body=@<comment-file>'
```

## 3. Verify and finish

Inspect the final local diff and rerun relevant checks. Distinguish review fixes from the pinned PR head; inspect any new remote changes before concluding the assessment.

Manual testing and sign-off are the developer's responsibility. Provide concrete manual steps and expected results in the PR description, derived from the agreed spec. Invite the developer to test, but do not block review handover while awaiting results. Record reported failures as unresolved unless explicitly accepted with a reason; label tests not performed or not reported as unverified. Never infer a pass from silence or automated checks.

Recap **Standards** and **Spec** separately: findings, fixes and reasons, accepted exceptions, actual checks/results, and anything unresolved or unverified. Report uncommitted or unpushed work; local fixes are not yet part of the PR. Follow the authorization requirements above.

Hand over when findings are fixed or explicitly accepted, or report remaining blockers without claiming completion. Pending manual testing alone is not a blocker. The developer decides whether to sign off despite disclosed limitations; do not claim absent fixes are in the PR or unverified behaviour is verified.

Ask whether the developer wants a review-summary comment posted. Only with their agreement, use a temporary Markdown file with real newlines:

```text
Reviewed together with the developer; sign-off remains their decision.

Changes made during review:
- <what changed and why, or “No code changes needed.”>

Verification:
- <tests/checks and results>

Accepted exceptions or limitations:
- <details, or “None.”>
```

Use “I have reviewed my own PR” only at the author-developer's explicit request. Posting this summary is not sign-off, a GitHub approval, or permission to merge.
