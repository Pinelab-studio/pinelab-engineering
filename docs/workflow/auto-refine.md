---
name: auto-refine
includedDocuments:
  - docs/workflow/refine.md
description: Autonomously refine the first unblocked Inbox card.
---

Refine one supplied Pinelab card or text input using the included `refine-task` workflow. Investigate and prepare the same implementation-ready plan without a routine interview. The included workflow remains authoritative for investigation, readiness, plan content, estimates, board safety, and saving. Only the interaction and confirmation rules below override it. Do not implement the task or select unrelated work.

If no card or text input is supplied, load `pinelab_trello` without arguments, then list cards in **Inbox**. Select the first card in list order without the **blocked** label and start refining it using the included workflow's card-reading and investigation rules. This overrides its instruction to ask for input when none is supplied. If no eligible card exists, report that and stop; do not select work from another list.

Set the thread title to the name of the task being defined as soon as its scope is known, and update it if the task name changes. Use a specific task name, never a generic status such as `Refinement input needed`. When human action is needed, keep that task name and prefix it with `⚠️` as described below.

## Continue without routine confirmations

Invocation authorizes refinement and saving all successfully refined cards, including existing Inbox cards, to **Waiting For Client Approval / top** once their requirements are settled. This replaces the included workflow's final existing-card draft confirmation, not client approval or any explicit approval hold. Pending client approval in the designated list does not block saving; it prevents implementation.

Use the included workflow's design tree to track decisions, but resolve questions from the supplied requirements, prior agreements, repository evidence, and established project policies before asking the human. Record evidence-backed decisions and delegated judgment calls in the plan. Choose routine in-scope technical and testing details yourself; do not ask for permission to investigate, run authorized readiness checks, draft, or save.

Do not ask the included workflow's mandatory test-behaviour question when the required behaviours, expected outcomes, and coverage are already settled by those sources. Propose normal, edge, and failure coverage from that evidence. Ask when the choice changes product behaviour, scope, risk, or mandatory testing constraints. Apply an established release policy without asking again; unresolved release choices still require an answer.

Do not invent requirements, client approval, label approval, or an estimate. Reuse an already user-confirmed numeric estimate for the same scope; ask if it is missing or no longer applies. Preserve the included workflow's label-selection and estimate requirements.

## Stop only when human input is needed

Complete independent investigation and supported safe recovery before stopping. Continue on other settled branches while a question is being investigated. Do not loop on failed commands, bypass access controls, or introduce workarounds to avoid asking for help.

When an unresolved decision, missing task input, access problem, readiness failure, or approval hold requires human action:

1. Summarize verified findings and what remains unresolved. Ask the whole answerable frontier using the included workflow's numbered choices and recommendations. For access or environment failures, include evidence, attempted recovery, and the specific human action needed.
2. Keep the session open and rename the thread to `⚠️ <task title>` if it requires human answers or action. Use the known task title, or a short description if none exists.
3. Add the existing **blocked** label to the card whenever human action is needed, preserving all other labels. Read the card before updating it and use the exact existing label name through `pinelab_trello`. If there is no card yet, or the label is missing or ambiguous, report that limitation; do not create a label or card just to mark it blocked.
4. Preserve the draft and existing card placement. Do not save an unresolved plan as refined or move it to **Waiting For Client Approval**. Wait for answers, then resume from the recorded decisions without repeating settled questions.

If nothing requires a human answer, finish saving and return the title, description, and card URL through the included workflow. Do not pause merely to present a plan or request a start, continuation, or final-save confirmation.

## Finish the thread

At every stopping point, use one of two outcomes:

- **Human action needed in this session:** keep the thread open, rename it to `⚠️ <task title>`, and state the required answers or action. Never settle an unresolved blocker.
- **No further action needed in this session:** after reporting the result, automatically settle the thread using T3 MCP if available. A successfully saved card awaiting client approval in its designated list is a completed handoff, not an unanswered question in this session. Settling the thread does not grant client approval or mark the card done.

Use the available T3 MCP tools for thread operations. If a required rename or settlement tool is unavailable or fails, report the limitation and leave the thread open; do not claim success or use a workaround.
