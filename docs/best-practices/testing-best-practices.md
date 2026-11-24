---
name: Testing Best Practices
description: Apply when planning, writing, or reviewing unit, integration, or end-to-end tests
# Based on Matt Pococks skill collection
---

Tests are executable specifications of behaviour through public interfaces. They should survive internal refactors and help humans understand what the system guarantees. This is a test-quality reference; workflows own planning, approvals, and execution order.

## Choose meaningful coverage

- Use the project's domain vocabulary and respect architectural decisions.
- Test at public boundaries (seams) that expose the required behaviour. Understand what each seam catches and what it misses.
- Focus on critical paths and complex logic rather than trying to cover every possible edge case.
- Prefer integration or end-to-end tests for user-facing behaviour. Add focused unit tests for complex logic or edge cases not meaningfully covered there; avoid duplicating assertions across levels.

## Write tests worth keeping

- Test observable behaviour through public interfaces, not private methods, internal state, or internal collaborators.
- Name tests after capabilities or outcomes, such as “user can checkout with a valid cart”, not implementation steps.
- Keep each test focused on one logical outcome; use multiple assertions only when needed to describe that outcome.
- Verify results through the tested public interface, not a side channel. For example, create a user and retrieve it through the API instead of inspecting database rows.
- Keep cases readable and self-contained. Use helpers where useful, but place helper definitions below the test cases so readers see the behaviour first.

## Keep automated tests self-contained

- Apply these rules to all unit, integration, and end-to-end tests.
- Do not make external network requests. Local test servers and isolated test databases are allowed; external platforms must be replaced at their system boundary.
- Verify real external-platform connectivity with explicit manual scripts, never files named `.spec.ts` or `.test.ts`.
- Control time, randomness, fixtures, and persistent state so tests are repeatable and do not depend on execution order.
- Never use arbitrary sleeps such as waiting ten seconds. Wait for an observable condition, for example `await waitFor(() => someCondition === true)`, using the test framework's bounded condition-wait helper.

## Mock only system boundaries

- Mock external APIs such as payments and email, time/randomness, and the filesystem when necessary.
- Prefer an isolated test database over mocking database access; mock it only when necessary at the system boundary.
- Do not mock your own classes, modules, or internal collaborators. Exercise the real implementation behind the chosen public interface.
- Inject external dependencies rather than constructing clients inside business logic.
- Prefer operation-specific external interfaces, such as `getUser(id)` and `createOrder(data)`, over a generic fetcher that requires conditional mock logic. Give each operation its own typed inputs and result.

## Reject these anti-patterns

- **Implementation coupling:** private-method tests, internal mocks, or assertions about internal call counts/order that break when behaviour-preserving refactors occur.
- **Horizontal slicing:** bulk tests of imagined implementation structure rather than one observable behaviour proven at a time.

## Reject tautological tests

- A tautological test checks code against itself rather than an independent contract. The assertion can stay green when the implementation and expected value share the same mistake.
- **Trace both sides of the assertion.** Flag expected values imported from production constants, computed with production helpers, or calculated by copying the implementation's algorithm. Comparing a result to itself or testing a mocked version of the subject proves nothing about the real implementation.
- **Use an independent oracle:** a specification, manually worked example, or externally verified fixture. Hardcode the expected outcome: items priced at 10 and 5 should total 15, not an expected total calculated with the same reduction as the implementation.
- **Check fixture and snapshot provenance.** Output captured from the implementation is not automatically correct, even when saved as a literal. Verify it against the intended contract before accepting it; never blindly regenerate expectations to make failures disappear.
- **Ask: which plausible bug would make this fail?** Temporarily omit a discount or change a tax rate in production code, leaving expectations unchanged, and rerun the relevant test. If it stays green, investigate shared calculations, inputs that miss the changed behaviour, or weak assertions. A surviving mutation is a warning, not proof of a tautology.
