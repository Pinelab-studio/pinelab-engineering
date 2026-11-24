---
name: review-retrospective
description: Identify reusable improvements from review changes and coding sessions, with approval before updating standards or tooling.
---

Improve future agent runs using evidence from the current session, or another session explicitly selected by the developer. Keep suggestions short and proportionate; do not invent lessons or add rules automatically.

## After each review change

Briefly identify the reusable lesson, if any, and ask: “Should we add this lesson to `CODING_STANDARDS.md`?” If there is no reusable lesson, say so. For mechanical rules, recommend an automated check instead and explain why. Obtain agreement before making either change; do not turn a local fix into a universal rule.

When an addition to `CODING_STANDARDS.md` is approved, also inspect all applicable `AGENTS.md` files for remaining coding standards and move them to the corresponding `CODING_STANDARDS.md`, preserving scope and removing duplicates. Scripts, check commands, instructions for running them, and basic folder structure or navigation are operational guidance, not coding standards; leave them in `AGENTS.md`.

## Look for improvements

Present evidence-backed candidates in severity order, with the problem and smallest useful improvement:

- **Navigation:** repeated searching or hidden dependencies warrant a concise navigation pointer, not duplicated documentation.
- **Automated checks:** inspect existing lint, typecheck, test scripts, hooks, and CI first. Missing enforcement or broken wiring is a finding; reuse existing tooling before introducing more. Fixed syntactic patterns, banned APIs, import shapes, and file-location rules belong in deterministic checks, not prose standards.
- **Coding standards:** reserve `CODING_STANDARDS.md` for judgement calls such as cross-file consistency and design trade-offs. Review owns enforcement; keep implementation context lean.
- **Agent instructions:** check applicable repository and accessible global `AGENTS.md` files for coding standards, even when short. Standards must live in `CODING_STANDARDS.md`, never `AGENTS.md`; propose moving them, or automating mechanical rules, while preserving scope. Keep agent instructions focused on essential steering and navigation; remove no-op or redundant instructions only with approval.
- **Tool economy and access:** flag unnecessarily expensive calls and missing information that impeded the session. Suggest focused tooling, logs, or read-only access without expanding permissions automatically.

Reuse existing guidance before creating new documents. Keep approved additions concise, avoid duplicate rules, and verify any new automated check. During interactive review, discuss only the lesson relevant to the latest change; save broader retrospective candidates for the closing recap.
