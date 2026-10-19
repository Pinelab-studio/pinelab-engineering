# Pinelab Engineering
Human and AI engineering principles used at Pinelab.studio

* `knowledge` - General engineering best practices we use at Pinelab
* `recipes` - Feature specific guides
* `workflow` - Way of working at Pinelab

## ENV vars

Some Pinelab workflow instructions (like Trello) require .env vars. It's up to you to define an env var somewhere and instruct your agent to load it. For example:

```md
set -a; source ~/.pi/.env; set +a
   Never print its contents or secret values.
```

Operations that require env vars will tell you what env vars are required if they are missing.