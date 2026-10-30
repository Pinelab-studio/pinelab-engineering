---
name: kanban-priorities
description: Recommend top 5 priorities todo's for today from the Pinelab Trello Kanban task board. 
---

Read the current task board using the existing Trello skill/workflow instructions. Inspect Inbox, Waiting for Client Approval, Doing, Ready For Review, and Todo. Include Todo to verify how much ready-to-start work remains. Read relevant card details and recent activity before making recommendations.

Recommend the top 5 concrete actions I should take today, in this strict priority order:

1. **Prioritize `pinelab-vendure-plugins` PRs:** Always recommend actionable reviews or unblocking steps for open PRs in `pinelab-vendure-plugins` before other work. These changes are often awaiting installation in client projects. Check linked PRs and their current status; do not assume they are ready to merge or install.
2. **Keep Todo stocked:** Todo must contain at least 5 cards that each have both an estimate and an assignee. Count only cards meeting both conditions. If there is a shortfall, prioritize fixing missing estimates/assignees, refining suitable Inbox cards, or following up on client approvals needed to replenish Todo. Do not treat pending approval as granted or invent estimates or assignees. State the current qualifying count and the shortfall.
3. **Clear Ready For Review:** Recommend reviewing individual cards. Each card reviewed counts as a separate top-5 action.
4. **Move Doing toward Ready For Review:** Recommend the concrete next step needed to finish or unblock individual cards and get them ready for review. Do not assume unfinished work can simply be moved.
5. **Empty Inbox:** Batch remaining Inbox refinement/triage into one action, including deciding the appropriate next destination for each card.

Selection rules:
- All refinement work belongs in at most one top-5 action, with the relevant cards listed underneath—not one action per card. If refinement helps replenish Todo, place this batch at priority 2 and include any remaining Inbox cleanup there rather than duplicating it later.
- Use Waiting for Client Approval to identify actionable follow-ups, especially approvals blocking Todo replenishment. Explain what each follow-up would unblock; do not recommend moving a card without the required approval.
- Respect the priority order. Within a priority, use explicit urgency, deadlines, blockers, and time waiting to break ties, based on available evidence.
- Recommend actions I can take today, including contacting an assignee to unblock progress. Avoid duplicate recommendations for the same outcome.
- Give 5 actions when there are enough meaningful actions; otherwise give fewer and explain briefly. Do not invent work to fill the list.
- This is a read-only planning request: do not modify cards, move tasks, post comments, or perform the recommended work.
- If required information is unavailable, state the limitation rather than guessing.

Output concisely:
- **Todo health:** qualifying cards / minimum 5, plus any shortfall.
- A ranked numbered list of up to 5 actions. For each, include linked card titles, the concrete next step, and a short reason tied to the priorities above. For the refinement batch, use compact sub-bullets for its cards and state the target number of ready Todo cards.
