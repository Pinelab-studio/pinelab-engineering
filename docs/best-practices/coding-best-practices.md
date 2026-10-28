---
name: Coding Best Practices
description: Coding and testing best practices; always load before implementing or reviewing any code or tests.
---

## Coding rules

- Add concise JSDoc to every exported function and public method. Explain their purpose and any non-obvious constraints; do not merely restate the name.
- In functions longer than 30 lines, use short comments to identify meaningful phases or explain non-obvious decisions. Do not narrate individual statements.
- Keep related code together, preferably grouping based on feature/domain, not technical purpose.
- Prefer early returns over deep nesting.
- Avoid unnecessary folder depth, abstractions, and indirection.

## Testing rules

Apply these rules to all unit, integration, and end-to-end tests.

- Tests are for humans to understand and review. Before writing tests, propose their scenarios and expected outcomes and obtain human approval. Approval covers the agreed set; ask again only when behaviour or scope changes.
- Prefer integration or end-to-end tests for user-facing behaviour. Add focused unit tests for complex logic or edge cases not meaningfully covered in e2e or integration; avoid duplicating assertions across levels.
- In tests longer than 20 lines, use short comments to clarify setup, action, and expected behaviour. Explain intent rather than narrating individual statements.
- Use helpers for readability, but place them below the test cases: the cases are what readers need to understand first.
- Use hardcoded expected values so tests detect contract changes: compare `result === 'expected-string'`, not `result === SOME_CONSTANT` imported from the implementation.
