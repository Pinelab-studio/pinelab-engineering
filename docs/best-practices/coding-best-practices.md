---
name: Coding Best Practices
description: Always load these coding best practices before writing or reviewing any code
# Based on https://github.com/multica-ai/andrej-karpathy-skills
---

These guidelines bias toward caution over speed. For trivial tasks, use judgment.

# Coding rules

- Document features close to their implementation, not in separate feature sections in a README. Use top-of-file JSDoc in the feature file or its entry point (e.g. a plugin or `index.ts`).
- Add concise JSDoc to every exported function and public method. Explain their purpose and any non-obvious constraints; do not merely restate the name.
- Keep related code together, group based on feature/domain, not technical purpose. Updating a specific feature should result in changes grouped in a directory (subdirectories allowed), should never result in scattered changes all over the repository.
- DO NOT implement workarounds; let me know if what I am asking is not possible withing the current framework/hooks.

## Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State assumptions explicitly. Resolve product questions during refinement; when using `get_implement`, reuse refinement and make conservative in-scope technical choices without another interview.
- Do not silently override settled requirements. Record technical choices and report concrete conflicts that prevent safe implementation.
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
