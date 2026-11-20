---
name: auto-classify-pr-risk
includedDocuments:
  - docs/workflow/references/pr-checkout-and-diff.md
description: Classify a GitHub PR as low, medium, or high risk and apply its Pinelab risk label.
---

Assess the risk of merging a GitHub pull request and apply exactly one of `risk: low`, `risk: medium`, or `risk: high`. Complete the included PR checkout and diff preparation first. This is risk triage, not a full code review or approval.

Invocation authorizes changing only these risk labels. Do not edit code, descriptions, or comments, submit a review, merge, or deploy.

## 1. Assess the change

Summarize intended behaviour and affected systems from the PR, requirements, pinned diff, and surrounding code. Separate stated requirements from assumptions. Read applicable repository instructions for the changed files.

Assess likelihood and impact of failure: production behaviour, blast radius, security and permissions, data integrity, compatibility, external integrations, operational changes, and ease of rollback. Inspect relevant tests and recorded CI results as evidence; do not execute PR code or tests as part of this workflow. Report missing coverage, failed checks, and unverified behaviour without claiming they passed.

## 2. Choose one risk level

Use the highest applicable level, not an average. Diff size alone does not determine risk, and passing tests do not erase high-impact consequences.

| Level | Criteria |
| --- | --- |
| **Low** | Narrow, well-understood changes with no consequential production behaviour, security, data, or operational impact; for example, prose-only documentation or cosmetic changes with no functional effect. Straightforward to revert. |
| **Medium** | Bounded production behaviour changes with understood callers and recoverable failure modes; for example, an isolated feature, bug fix, or compatible dependency update without high-risk characteristics. |
| **High** | Potential for security exposure, data loss/corruption, payment or checkout failure, broad outages, breaking public contracts, destructive migrations, or difficult rollback. Broad changes to shared critical paths also qualify. |

Increase the level when credible uncertainty or missing verification materially raises the likelihood or impact of failure. Explain the concrete concern; do not mark every PR high merely because manual testing is pending. If essential evidence is unavailable and no defensible classification is possible, report the blocker without changing labels.

## 3. Apply the risk label

1. Reread PR metadata and labels. Verify the head SHA and PR base still match the assessed snapshot; if they changed, refresh the evidence and reassess before labelling.
2. List repository labels with `gh api --paginate repos/<owner>/<repo>/labels`. Use the exact chosen label. If it is missing, report the proposed level and ask before creating it; never silently create or substitute labels.
3. Add the chosen label, then remove only the other two risk labels if present. Preserve all unrelated labels. Use GitHub's issue-label endpoints for the PR:

   ```bash
   gh api --method POST repos/<owner>/<repo>/issues/<number>/labels -f 'labels[]=risk: <level>'
   gh api --method DELETE 'repos/<owner>/<repo>/issues/<number>/labels/<url-encoded-obsolete-risk-label>'
   gh api --paginate repos/<owner>/<repo>/issues/<number>/labels
   ```

   Replace placeholders before execution; issue a DELETE only for an obsolete risk label actually present. If the correct label is already the only risk label, no mutation is needed. Confirm exactly one risk label remains. Report permission errors, partial updates, or uncertain outcomes rather than claiming success; inspect current state before retrying.

## 4. Report

Return the PR URL, chosen risk level, pinned comparison SHAs, and a few evidence-backed reasons with file/line references where useful. Include verification gaps and the most important checks for the human reviewer. State whether the label was confirmed or only proposed. Classification is not sign-off or permission to merge.
