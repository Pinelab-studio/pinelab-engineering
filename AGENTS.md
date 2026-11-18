- Documentation is exposed through MCP. Do not link to local files or tell consumers to read repository paths.# Pinelab Engineering

* Always run `npm run build` in dir `mcp/` after making changes, so that the documentation and MCP is up to date.

## Choose the right guide

- `best-practices/`: durable engineering rules for agents that apply to all projects.
- `recipes/`: task-specific guides loaded on demand.
- `workflow/`: Pinelab's way of working, including approvals, testing, review, and handover.
- Keep each rule in one authoritative document; include shared guidance through `includedDocuments` rather than duplicating it.


## `includedDocuments`

- `includedDocuments` may contain only Markdown paths under `docs/workflow/references/`, never workflows, best practices, recipes, or other documents outside that directory. Keep references inclusion-only; do not expose them as MCP tools or recipes.
- Only include absolutely mandatory documents; allow harnesses to discover other resources themselves when needed, not forcing it in context via includedDocuments.
- Do not reference other tool calls or local files. Include required guidance with `includedDocuments`.
- Documentation is exposed through MCP. Do not link to local files or tell consumers to read repository paths.

## Best practices

- Max 60 lines per best practice; use explicit clear instructions.

## Workflows

- Workflows provide instructions on the way of working: loading best practices, coding standards etc are up to the consuming harness/ai/llm.
- Explicit included instructions only; never reference other tool calls or local files.
  
## Recipes

- Keep recipes between 200 and 800 words; exceed 800 only when necessary for a complete, reproducible guide or explicitly requested.
- Give the intended outcome, scope, prerequisites, and necessary decisions before implementation.
- Use ordered, executable steps with explicit inputs, commands, working directories, and expected outcomes where relevant.
- Distinguish reusable instructions from project-specific examples; never include secrets or private operational details.
- Recipes and best practices are published on `engineering.pinelab.studio`; write for both human readers and agents.
- Every recipe must have a clear, specific title in frontmatter `name` and a non-empty, single-line frontmatter `description` explaining its purpose and when to use it.
- Make the title understandable outside this repository. Start the body with paragraph text, never a heading or a repeated title; use headings only after the introductory paragraph.

## Sources, generated files, and checks

- Edit source Markdown in `/docs`, not generated files `mcp/src/generated` catalogues.
- For MCP catalogue/discovery changes, run `npm test` and `npm run check` from `mcp/`; both regenerate the catalogue.