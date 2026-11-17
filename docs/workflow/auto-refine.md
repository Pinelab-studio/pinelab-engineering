---
name: auto-refine
includedDocuments:
  - docs/workflow/refine.md
description: Autonomously refine a Pinelab card or text input, asking only for required human answers.
---

Refine one supplied Pinelab card or text input using the included `refine-task` workflow. Investigate and prepare the same implementation-ready plan without a routine interview. The included workflow remains authoritative for investigation, readiness, plan content, estimates, board safety, and saving. Only the interaction and confirmation rules below override it. Do not implement the task or select unrelated work.

## Continue without routine confirmations

Invocation authorizes refinement and saving an existing card to **Todo / top** once its requirements are settled. It replaces the included workflow's final existing-card draft confirmation, not client approval or any explicit approval hold. New cards still go to **Waiting For Client Approval / top**; pending client approval there does not block creation.

Use the included workflow's design tree to track decisions, but resolve questions from the supplied requirements, prior agreements, repository evidence, and established project policies before asking the human. Record evidence-backed decisions and delegated judgment calls in the plan. Choose routine in-scope technical and testing details yourself; do not ask for permission to investigate, run authorized readiness checks, draft, or save.

Do not ask the included workflow's mandatory test-behaviour question when the required behaviours, expected outcomes, and coverage are already settled by those sources. Propose normal, edge, and failure coverage from that evidence. Ask when the choice changes product behaviour, scope, risk, or mandatory testing constraints. Apply an established release policy without asking again; unresolved release choices still require an answer.

Do not invent requirements, client approval, label approval, or an estimate. Reuse an already user-confirmed numeric estimate for the same scope; ask if it is missing or no longer applies. Preserve the included workflow's label-selection and estimate requirements.

## Stop only when human input is needed

Complete independent investigation and supported safe recovery before stopping. Continue on other settled branches while a question is being investigated. Do not loop on failed commands, bypass access controls, or introduce workarounds to avoid asking for help.

When an unresolved decision, missing task input, access problem, readiness failure, or approval hold requires human action:

1. Summarize verified findings and what remains unresolved. Ask the whole answerable frontier using the included workflow's numbered choices and recommendations. For access or environment failures, include evidence, attempted recovery, and the specific human action needed.
2. Rename thread to "⚠️ <task title>"" if it requires human answers. Use the known task title, or a short description if none exists. If thread renaming is unavailable, report that limitation; do not claim it succeeded.
3. Preserve the draft and existing card placement. Do not save an unresolved plan as refined or move it to **Todo**. Wait for answers, then resume from the recorded decisions without repeating settled questions.

If nothing requires a human answer, finish saving and return the title, description, and card URL through the included workflow. Do not pause merely to present a plan or request a start, continuation, or final-save confirmation.
