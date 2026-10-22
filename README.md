# Pinelab Engineering
Human and AI engineering principles used at Pinelab.studio

* `knowledge` - General engineering best practices use at Pinelab
* `recipes` - Feature specific guides
* `workflow` - Way of working at Pinelab

# For Everyone

Anyone, including external consumers, can reference [recipe_index.md](recipe_index.md) and [knowledge_index.md](knowledge_index.md) in their AI prompts when developing features. It lists the available recipes and best practices, so your agent can find and follow the relevant guides.

For example:

```text
Implement this feature using the relevant recipes from: https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/recipe_index.md
```

# For Pinelab Developers

Every Pinelab project's AGENTS.md should include [workflow_index.md](workflow_index.md). This gives your agent the instructions for finding and following our workflows without manual onboarding. If the contents are missing or outdated, add or update them in the project's main `AGENTS.md`, preserving any project-specific instructions.

# Pinelab's workflow

The instructions in `workflow` are based on our kanban workflow:

![Pinelab Kanban workflow](docs/workflow.png)

1. Refine a task with a prompt like `Please refine this task: <trello link or feature description>`. (You need to setup `pinelab-kanban` for this, see below)
2. Start implementation on a task `Start implementation on XYZ using Pinelab's plan-and-implement`.

// TODO: Always review your own PR, move to 

## Optional: Create global prompts

### /plan-adn-implement
```md
---
description: Implement a refined task
argument-hint: "<topic to discuss>"
---

When invoked, always fetch the instructions from: `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/main/knowledge/plan-and-implement.md`

Task to implement: $@
```


## Optional: Pinelab Kanban (Trello)

If you want your Pi/Codex/OpenCode to move tasks automatically in Trello, add this in your global `~/.pi/agents/AGENTS.md` (or a different directory depending on your harness). 

Add this somewhere in your global `AGENTS.md`:

```md
# Pinelab Kanban (Trello)
Always run `set -a; source ~/.pi/.env; set +a` to load ENV vars. Never print its contents or secret values.
Whenever you need to refine, create, move tasks in Trello, always load `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/workflow/pinelab-trello-kanban.md`
```

An env file should exist at the path above, with these variables:

```.env
TRELLO_API_KEY=xxx
TRELLO_API_TOKEN=xxxx
TRELLO_BOARD_ID=xxx
```

