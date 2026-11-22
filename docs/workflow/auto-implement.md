---
name: autonomous-implement
includedDocuments:
  - docs/workflow/references/implementation.md
description: Autonomously select and implement one card from Pinelab Todo, then create a PR for human review.
---

Select one eligible Pinelab card from **Todo** and implement it using the included shared implementation flow.

## Select one card

1. Fetch cards from the exact **Todo** list with `list_cards` and use `get_board` for existing labels as needed.
2. Only select cards with the existing **pinobi2** label and without the **blocked** label.
3. If no eligible card exists, stop immediately and apply **Finish the thread** below. Do not change cards, repositories, branches, or PRs.
4. Select the first eligible card in board order and pass its URL to the shared flow.

## Manual verification: reviewing human

Manual verification belongs to the reviewing human, including integrated full-stack journeys required by the card. Pending manual checks alone are not an implementation blocker; do not provision an environment solely for them, wait for results, keep the PR draft, or add `blocked` for that reason.

In the PR description, add **Manual verification required — reviewing human** with unchecked steps covering the complete required journey, consequential failure/access-isolation cases, prerequisites, test data/roles, and expected results. Identify unperformed checks and unknown environment setup. The reviewer must perform these checks and record results before sign-off.

## Finish the thread

At every stopping point, use one of two outcomes:

- **Human action needed in this session:** keep the thread open, rename it to `⚠️ <task title>`, and state the required answers or action. Use a short description if no task title exists. Never settle an unresolved blocker.
- **No further action needed in this session:** after successful implementation handover, first rename the thread to `Implemented: <card title>` using the actual card title. Do not use this title for blocked or partial work, or an empty eligible queue. After reporting the result, automatically settle the thread using T3 MCP if available, including for an empty eligible queue or completed handover. Reviewer-assigned checks do not keep this session open; the title and settlement are not approval or card completion.

Use the available T3 MCP tools for thread operations. If a required rename or settlement tool is unavailable or fails, report the limitation and leave the thread open; do not claim success or use a workaround.
