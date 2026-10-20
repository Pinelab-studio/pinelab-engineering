# Pinelab Engineering
Human and AI engineering principles used at Pinelab.studio

* `knowledge` - General engineering best practices we use at Pinelab
* `recipes` - Feature specific guides
* `workflow` - Way of working at Pinelab

## How to use

Internally, we prefer to live without the overhead of publishing and pulling, so we reference the remote Github files in our AGENTS.md (either globally or in project specific AGENTS.md):

```md
# Pinelab Knowledge

* < bullet list for knowledge here >

# Pinelab Workflow

* When asked about **creating and managing tasks on Trello**, always fetch `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/workflow/pinelab-kanban.md`
* When asked to **grill me**, always fetch `curl https://raw.githubusercontent.com/Pinelab-studio/pinelab-engineering/heads/main/workflow/grill-me.md`
```

You can exclude any principles you don't need.

For recipes, you should directly reference this webpage or the link to the markdown file in your prompt. 

## ENV vars

Some Pinelab workflow instructions (like Trello) require .env vars. It's up to you to define an env var somewhere and instruct your agent to load it. For example:

```md
set -a; source ~/.pi/.env; set +a
   Never print its contents or secret values.
```

Operations that require env vars will tell you what env vars are required if they are missing.