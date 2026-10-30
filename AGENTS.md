# Documentation authoring

These rules govern changes under `docs/`; they are not project-wide agent setup.
Keep this file at 100 physical lines or fewer, including blank lines.

* Always run `npm run build` in dir `mcp/` after making changes, so that the documentation and MCP is up to date.

## Writing style

- Start every article by clearly stating what we will build or set up and which approach we will use. Explain alternatives only after that.
- Use simple language and short sentences. Prefer everyday words; use technical terms only when needed to explain or implement something accurately.
- Keep the tone friendly and helpful. Write like you are guiding a colleague, not trying to sound impressive or overly technical.

## Choose the right guide

- `best-practices/`: durable engineering rules for agents, kept in context across Pinelab projects.
- `recipes/`: task-specific guides loaded on demand, not permanent context.
- `workflow/`: Pinelab's way of working, including approvals, testing, review, and handover.
- Keep each rule in one authoritative document; link it from other guides with an explicit reading trigger.

## Best practices

- Keep them short, concise, and information-dense: every rule must change an agent's decisions or prevent a plausible mistake.
- State actionable constraints and relevant exceptions; omit generic advice, repeated explanations, and directory inventories.
- Move lengthy examples and task-specific procedures into recipes; retain essential boundaries in the best practice.
- Best practices may always be loaded, without the user mentioning Pinelab. State applicability without adding a keyword gate.
- Project or agent setup must load the best practices; neither this file nor a link guarantees automatic loading.

## Recipes

- Keep recipes between 200 and 800 words; exceed 800 only when necessary for a complete, reproducible guide or explicitly requested.
- Give the intended outcome, scope, prerequisites, and necessary decisions before implementation.
- Use ordered, executable steps with explicit inputs, commands, working directories, and expected outcomes where relevant.
- Include verification of the successful path and consequential failure cases, plus known limitations.
- Distinguish reusable instructions from project-specific examples; never include secrets or private operational details.
- Link applicable best practices rather than duplicating them. Recipes do not require a Pinelab mention.

## Workflows and developer freedom

- Only load or follow workflows when the user explicitly mentions “Pinelab” (case-insensitive); associated Trello operations use the same trigger.
- Make required outcomes, approval gates, and safety boundaries distinct from recommended prompts or interview mechanics.
- Developers may use their own planning tools and flow, but must load Pinelab best practices and preserve applicable approval, testing, review, and handover requirements.
- When no custom plan mode is supplied, use [Plan and implement](workflow/plan-and-implement.md).
- Before changing task refinement, read [Refine a task](workflow/refine.md).
- Before changing task lifecycle or Trello operations, read [Pinelab Kanban](workflow/pinelab-trello-kanban.md).
- Before changing review or prioritization, read [Review](workflow/review.md) or [Kanban priorities](workflow/sanitize-kanban.md), respectively.
- Preserve existing requirements unless their change is explicitly approved; do not silently relax them when simplifying wording.

## Publication and metadata

- Recipes and best practices are published on `plugins.pinelab.studio`; write for both human readers and agents.
- Every recipe and knowledge article (best practice) must have a clear, specific title in frontmatter `name` and a non-empty, single-line frontmatter `description` explaining its purpose and when to use it.
- Make the title understandable outside this repository. Start the body with paragraph text, never a heading or a repeated title; use headings only after the introductory paragraph.
- Preserve existing category metadata and stable paths unless a change is intentional; update references when renaming.
- Workflow names are skill identifiers; their descriptions must retain the explicit Pinelab trigger.

## Sources, generated files, and checks

- Verify commands against relevant scripts/configuration; distinguish tested steps from unverified recommendations.
- Edit source Markdown, not generated catalogues. See [the index generator](generate-index.js) and [MCP bundler](../mcp/src/scripts/generate-skills.mjs).
- For MCP catalogue/discovery changes, run `npm test` and `npm run check` from `mcp/`; both regenerate the catalogue.
- A push to `main` triggers the website build via the GitHub Actions secret `WEBSITE_BUILD_HOOK`; never call the live hook merely to validate documentation.
