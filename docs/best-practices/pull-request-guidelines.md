---
name: Pull Request Guidelines
description: Load when creating pull requests for Pinelab.
---

Write pull request descriptions using the sections below so reviewers can quickly understand the change, validate it, and identify operational requirements.
Keep the entire description at 200 words or fewer.

## Before creating a PR

- If `CHANGELOG.md` exists, propose a semantic version bump and changelog update including the package.json version; get approval before editing. Use `# X.Y.Z (YYYY-MM-DD)` and concise bullets, newest first. Commit/push approved changes. 
- Create with `gh pr create --title '<title>' --body-file - --base <default>` using a heredoc for the body. Return the raw PR URL.

## What changed and why

- Use bullet points to describe the change and its purpose in functional, user-facing terms.
- Include screenshots, a recording, or other supporting material where useful.

## Execution flow

- Summarize the code's execution flow as a simple pseudocode diagram using arrows and branches.
- Use at most 10 short steps. Focus on inputs, decisions, actions, and outcomes—not implementation details.

## How to test

- Give numbered steps to reproduce and validate the new functionality.
- State the expected results and include supporting material where needed to make validation quick and clear.

## Before merging

- List required environment variables, migrations, and other prerequisites.
- Write **None** when no prerequisites apply.

## After merging

- List deployment steps, environment variables, dashboard configuration, and follow-up actions.
- Write **None** when no actions apply.
