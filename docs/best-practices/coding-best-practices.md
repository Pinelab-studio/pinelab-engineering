---
name: Coding Best Practices
description: Always load these coding and testing best practices before writing or reviewing any code or tests.
# Based on https://github.com/multica-ai/andrej-karpathy-skills
---

These guidelines bias toward caution over speed. For trivial tasks, use judgment.

# Coding rules

- Add concise JSDoc to every exported function and public method. Explain their purpose and any non-obvious constraints; do not merely restate the name.
- In functions longer than 30 lines, use short comments to identify meaningful phases or explain non-obvious decisions. Do not narrate individual statements.
- Keep related code together, group based on feature/domain, not technical purpose.
- Prefer early returns over deep nesting.

## Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

## Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- If an edge case is rare and its impact very low, exclude that edge case from implementation if that means we end up with simpler code.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.

The test: Every changed line should trace directly to the user's request.

# Testing rules

Apply these rules to all unit, integration, and end-to-end tests.

- Avoid Over-Testing: Focus on behavior, not implementation details. Don’t test internal state or private functions.
- Tests are for humans to understand and review. Before writing tests, propose their scenarios and expected outcomes and obtain human approval. Ask again only when behaviour or scope changes.
- Prefer integration or end-to-end tests for user-facing behaviour. Add focused unit tests for complex logic or edge cases not meaningfully covered in e2e or integration; avoid duplicating assertions across levels.
- Use helpers for readability, but place them below the test cases: the cases are what readers need to understand first.
- Use hardcoded expected values so tests detect contract changes: compare `result === 'expected-string'`, not `result === SOME_CONSTANT` imported from the implementation.
