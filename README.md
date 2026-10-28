# Pinelab Engineering
Human and AI engineering principles used at Pinelab.studio

* [`docs/best-practices`](docs/best-practices) - General engineering guidelines at Pinelab that apply to all our projects.
* [`docs/recipes`](docs/recipes) - Feature specific guides that can be invoked on demand.
* [`docs/workflow`](docs/workflow) - Way of working at Pinelab, used by developers at Pinelab
  
# For Everyone

Please see https://plugins.pinelab.studio/ai-integration/ on how to use our best practices and recipes in your AI workflow.


# For Pinelab Developers

The Pinelab MCP exposes tools and coding standards and guidelines on how we work. The only real tool is for managing Trello cards, the rest are all skills that explain your local Codex/Pi/Opencode on how to handle tasks. 

Add the Pinelab MCP server to your harness:

```md
{
  "mcpServers": {
    "pinelab": {
      "url": "https://mcp.pinelab-studio.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Workflow skills are designed to only trigger when you mention  **Pinelab** as to not affect your personal way of working. We are aware of context bloat and deliberately keep the tool descriptions very short!

These instructions in this MCP are based on our kanban workflow:

![Pinelab Kanban workflow](docs/workflow.png)

Use these prompts to make your AI harness live up to Pinelab's way of working and quality standards:

## 0. Intake 
Task intake happens automatically, no need to worry about this.

## 1. Refine

_If a task is in "Todo" it is already refined, skip this step!_

Refining means clarifying what a client meant; the functional specs. For technical planning (more classic plan-mode) see `Plan and Implement` below. This refinement skill will fetch the task, start interviewing you and moves the task to "Waiting For Client Approval".

Start refining a task by prompting something like:

```text
Start refining Pinelab task <Trello task link>
```


## 2. Plan and Implement 

Use this when starting development on a task that is ready to pick up (in the Todo list). This is your typical plan-mode (or grill-me), and includes all Pinelabs best practices. 

Start working on a task by prompting:

```text
Start planning Pinelab task <Trello task link> 
```


:information_source: _You may use your own `/plan` prompt or planning flow. Just make sure to mention "use Pinelab's best practices" when invoking your own plan-mode._

## 3. Review

After implementation, **Always** review your own pull request:

```text
Please Pinelab review <link to PR>
```

This will trigger the `pinelab-code-review` flow: Read PR description and comments, checkout the branch locally and reviews the code. It will again interview you, and you can make modification during the review, and push the to the open PR.

4. Handover

After a PR has been approved, you can use this prompt to start handover:

```text
Handover Pinelab task <link to PR>
```

1. Refine a task (might be done already)
2. Pick up a task using `plan-and-implement` or your own standards-compliant planning flow
3. Create a Pull Request
4. Always `/review <gh PR link>` your own implementation before creating a Pull Request
5. Another developer will `/review` your Pull Request
