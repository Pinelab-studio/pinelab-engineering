---
name: Pull Request Guidelines
description: Load when creating pull requests for Pinelab.
---

Write pull request descriptions using the sections below so reviewers can quickly understand the change, validate it, and identify operational requirements.
Keep the entire description at 200 words or fewer.

## Before creating a PR

- If `CHANGELOG.md` requires manual maintenance, resolve the semantic version bump and changelog scope during refinement, including the package.json version. Implementation applies that decision without another approval round. If detail is missing, follow the repository's documented release policy; do not invent a release policy or block the feature PR for release approval—leave release edits pending and identify them under Before merging. Use `# X.Y.Z (YYYY-MM-DD)` and concise bullets, newest first. Respect existing release automation.
- Create with `gh pr create --title '<title>' --body-file - --base <default>` using a heredoc for the body. Return the raw PR URL.

## What changed and why

- Use bullet points to describe the change and its purpose in functional, user-facing terms.
- Include screenshots, a recording, or other supporting material where useful.

## Execution flow

- Summarize the code's execution flow as a simple pseudocode diagram using arrows and branches.
- Use at most 10 short steps. Focus on inputs, decisions, actions, and outcomes—not implementation details.

## How to test manually local

- Give numbered steps to reproduce and validate the new functionality by hand.
- State the expected results and include supporting material where needed to make validation quick and clear.

## Before merging

- List required environment variables, migrations, and other prerequisites.
- Write **None** when no prerequisites apply.

## After merging

- List deployment steps, environment variables, dashboard configuration, and follow-up actions.
- Write **None** when no actions apply.

## How to verify after deployment

- Give numbered steps to reproduce and validate the new functionality by hand on the live environment
