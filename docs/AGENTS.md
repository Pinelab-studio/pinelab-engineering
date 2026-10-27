# Documentation authoring

These rules govern changes under `docs/`; they are not project-wide agent setup.
Keep this file at 100 physical lines or fewer, including blank lines.

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
- Do not invent a new metadata schema or publish internal credentials, customer data, or environment-specific secrets.

## Sources, generated files, and checks

- Verify commands against relevant scripts/configuration; distinguish tested steps from unverified recommendations.
- Edit source Markdown, not generated catalogues. See [the index generator](generate-index.js) and [MCP bundler](../mcp/src/scripts/generate-skills.mjs).
- After recipe or best-practice content/catalogue changes, run `node docs/generate-index.js` from the repository root and include any resulting `index.md` changes.
- The index generator recursively includes Markdown in `best-practices/` and `recipes/`; each included file needs a description.
- MCP bundles only top-level Markdown in `workflow/` and `best-practices/`, not recipes or this file. Its generated catalogue is not committed.
- For MCP catalogue/discovery changes, run `npm test` and `npm run check` from `mcp/`; both regenerate the catalogue. Redeployment is needed to expose changed articles.
- For documentation-only instruction changes, check clarity, relative links, metadata, scope conflicts, and preservation of requirements; do not require unrelated application tests.
- A push to `main` triggers the website build via the GitHub Actions secret `WEBSITE_BUILD_HOOK`; never call the live hook merely to validate documentation.
- Report checks actually performed and any limitations. Keep unrelated user changes intact; do not commit, push, or deploy without permission.
