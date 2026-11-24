---
name: autonomous-implement
includedDocuments:
  - docs/workflow/references/implementation.md
description: Implement the supplied task, add the pinobi2 label, and create a PR for human review.
---

Implement the task supplied in the invocation using the included shared implementation flow.

## Use the supplied task

1. Use the supplied task's card id. If it is missing or ambiguous, stop and request it; do not search Trello for a task.
2. Read only the supplied card and necessary board metadata. Follow the shared flow's read-only and state-preservation safeguards.
3. Add the existing **pinobi2** label to the supplied card, preserving all other labels. If already present, leave it unchanged.
4. Use the shared implement flow to implement the given task. The card does not need to be in **Todo**.

## Manual verification: reviewing human

Manual verification belongs to the reviewing human, including integrated full-stack journeys required by the card. Pending manual checks alone are not an implementation blocker; do not provision an environment solely for them, wait for results, keep the PR draft, or add `blocked` for that reason.

In the PR description, add **Manual verification required — reviewing human** with unchecked steps covering the complete required journey, consequential failure/access-isolation cases, prerequisites, test data/roles, and expected results. Identify unperformed checks and unknown environment setup. The reviewer must perform these checks and record results before sign-off.

## Finish the thread

At every stopping point, use one of two outcomes:

- **Human action needed in this session:** keep the thread open, rename it to `⚠️ <task title>`, and state the required answers or action. Use a short description if no task title exists. Never settle an unresolved blocker.
- **No further action needed in this session:** after successful implementation handover, first rename the thread to `Implemented: <card title>` using the actual card title. Do not use this title for blocked or partial work. After reporting the result, automatically settle the thread using T3 MCP if available after completed handover. Reviewer-assigned checks do not keep this session open; the title and settlement are not approval or card completion.

Use the available T3 MCP tools for thread operations. If a required rename or settlement tool is unavailable or fails, report the limitation and leave the thread open; do not claim success or use a workaround.
