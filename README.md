# Pinelab Engineering
Human and AI engineering principles used at Pinelab.studio

* `recipes` - Feature specific guides
* `workflow` - Way of working at Pinelab
* `workflow/references` - General engineering best practices referenced by the Pinelab workflow

# For Everyone

Anyone, including external consumers, can reference [recipe_index.md](recipe_index.md) in their AI prompts when developing features. It lists the available recipes and commands to fetch their instructions, so your agent can find and follow the relevant guides.

For example:

```text
Implement this feature using the relevant recipes from: https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/recipe_index.md
```

# For Pinelab Developers

Every Pinelab project should include a copy of the contents of [workflow_index.md](workflow_index.md) in its main `AGENTS.md`. This gives your agent the instructions for finding and following our workflows without manual onboarding.

If the contents are missing or outdated, add or update them in the project's main `AGENTS.md`, preserving any project-specific instructions.


## ENV vars

Some Pinelab workflow instructions (like Trello) require .env vars. It's up to you to define an env var somewhere and instruct your agent to load it. For example:

```md
set -a; source ~/.pi/.env; set +a
   Never print its contents or secret values.
```

Operations that require env vars will tell you what env vars are required if they are missing.