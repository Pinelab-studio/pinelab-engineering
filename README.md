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

Create a prompt template for `pinelab-implement.md`:

```md
---
description: Implement a refined task
argument-hint: "<topic to discuss>"
---

Fetch the instructions from: `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/main/workflow/implement.md`

Task to implement: $@
```

These instructions are based on our kanban workflow:

![Pinelab Kanban workflow](docs/workflow.png)

1. Refine a task (might be done already)
2. Pick up and `/implement` a task
3. Always `/review` your own implementation before creating a Pull Request
4. Another developer will `/review` your Pull Request

// TODO: Create PR review knowledge article

## Optional: Pinelab Kanban (Trello)

If you want your Pi/Codex/OpenCode to read/move/create tasks automatically in Trello, add this in your global `~/.pi/agents/AGENTS.md` (or a different directory depending on your harness). 

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
