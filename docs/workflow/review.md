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

### Always open with a feature summary and data-flow walkthrough

Once PR evidence is available, always present the following two sections, in this order, before asking any review questions or discussing findings. Base both sections on the inspected code and PR evidence; distinguish demonstrated behaviour from assumed intent and explicitly flag unknowns.

**Feature summary**

Use at most five bullets, each containing one or two short sentences. Explain in plain language what the feature does, its value for the client, and the functional flow of data: what starts the flow, what information is processed or changed, and what result the user or client receives. Keep implementation details for the next section.

**Technical summary and data flow**

Start with an explicit inventory of newly introduced technical elements:

* custom fields
* entities
* resolvers or controllers
* graphql schema changes
* services
* plugins
* jobs or jobqueues
 
For each, give its name, defining file, and a brief explanation of its purpose; for custom fields, also identify the entity they extend. Do not make the reviewer infer these additions from the walkthrough. If no new technical elements are introduced, say so.

Follow the summary with an ordered, file-level walkthrough of the same flow, from entry point to result. Name the actual files and explain which file calls or passes data to which other file, what each component is responsible for, and what data crosses each boundary. Include relevant validation, transformation, persistence, external services, and return paths where they affect understanding; explain asynchronous or event-driven handoffs rather than implying direct calls. Include unchanged files when needed to connect the flow, but omit unrelated files. Stay at file/component level, not individual functions or a line-by-line explanation. Use separate paths for materially different flows, and mark any connection that cannot be verified rather than inventing it.

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

Implement agreed fixes before moving on and run relevant tests. After each agreed review change, apply the included retrospective guidance and identify any reusable lesson. Propose additions to `CODING_STANDARDS.md` only for concrete, reusable technical coding standards that apply beyond the feature under review. Do not add feature-specific requirements, business rules, implementation summaries, or generic process advice. If no qualifying technical standard exists, do not propose an addition. Recommend an automated check instead for mechanical rules. Wait for agreement before changing shared guidance or adding checks. Track findings as fixed, explicitly accepted with a reason, or unresolved. Silence is not acceptance; do not expand scope without agreement.

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
