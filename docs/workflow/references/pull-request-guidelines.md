---
name: Pull Request Guidelines
description: Load when creating pull requests for Pinelab.
---

Use the sections below. Aim for 200 words or fewer; exceed this when needed for complete required verification steps, prerequisites, and expected results.

## Before creating a PR

- For a manually maintained `CHANGELOG.md`, bump the version in `package.json` and add an entry before final verification, using refinement's decision or repository conventions. Use `# X.Y.Z (YYYY-MM-DD)`, concise bullets, newest first. Respect automated releases. If a version/changelog decision needs human input, list it under **Before merging** without blocking handover.
- Create with `gh pr create --title '<title>' --body-file - --base <default>` using a heredoc for the body. Return the raw PR URL.

## What changed and why

- Give user-facing change/purpose bullets and useful supporting material (e.g. screenshots).

## Execution flow

- Give an arrow/branch pseudocode diagram: at most 10 short steps covering inputs, decisions, actions, and outcomes, not implementation details.

## How to test manually local

- Give numbered local manual checks with expected results and supporting material where needed.

## Before merging

- List required environment variables, migrations, and other prerequisites.
- Write **None** when no prerequisites apply.

## After merging

- List deployment steps, environment variables, dashboard configuration, and follow-up actions.
- Write **None** when no actions apply.

## How to verify after deployment

- Give numbered live-environment manual checks with expected results.
