---
name: autonomous-implement
includedDocuments:
  - docs/workflow/implement.md
description: Autonomously select and implement one card from Pinelab Todo.
---

You are an autonomous agent. Select one eligible Pinelab card from **Todo** and implement it using the included `implement` workflow. Follow all its authority boundaries, test-driven development, verification, PR, self-review, and handover requirements. The queue selection below replaces its requirement for a user-supplied card link; all other requirements remain in force.

## Select one card

1. Load `pinelab_trello` without arguments for board rules and action schemas. Fetch cards from the exact **Todo** list with `list_cards` and use `get_board` for existing labels as needed.
2. Only select cards with the existing **Pinobi2** label and without the **blocked** label. Do not select cards from other lists or remove `blocked` to make a card eligible. If a required list or label is ambiguous, stop and report the configuration blocker rather than guessing.
3. If no eligible card exists, stop immediately. No action is needed: do not change cards, repositories, branches, or PRs.
4. Select the first eligible card in board order. Use its URL as the linked card for the included workflow. Fetch its full description and all activity, then re-read its current list and labels before starting. If it is no longer eligible, stop without starting it. Do not override an approval hold. Only one worker may implement a card at a time; there is no atomic claim.
5. When starting implementation, move the selected card to **Doing**. Implement only this card during this run.

## Identify autonomous work

Append this exact line to every PR description and agent-authored PR or Trello comment, including blocker comments:

```text
Written by Pinobi2
```

## Record blockers and stop

If a blocker arises, follow the included workflow's blocker procedure: preserve partial work, add the existing **blocked** label while preserving other labels, and leave the card in its current list. A card already moved to **Doing** stays there; do not return it to **Todo**.

Add a signed comment to the card with the blocker reason and context, supporting evidence, attempted recovery, required external action, unverified checks, partial-work references, and a copyable resume prompt. Verify that both the comment and label were saved. Report any update failure accurately. Never remove `blocked` automatically or start another card after a blocker.
