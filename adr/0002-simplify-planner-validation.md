---
type: decision
id: adr-0002
title: Simplify Planner Validation and Extract Validation Logic
status: Accepted
date: 2025-09-16
deciders: [LordShiroe]
tags: [refactoring, validation, architecture]
---

## Context

The original planner implementation handled plan creation, execution, validation, result processing, and logging in a single class. This led to a bloated and hard-to-maintain codebase. Validation logic was tightly coupled with execution, making it difficult to test and extend. Our goal is to make the library easy to use for agent builders and maintainable for contributors.

## Decision

We extracted all validation logic (plan structure and parameter validation) into a dedicated `PlanValidator` class. The planner now delegates validation to this class, focusing only on orchestration and execution. We also removed low-value validations (such as result schema validation) and excessive logging, keeping only essential error/warning logs.

## Rationale

### Benefits

- **Smaller, focused planner**: Easier to maintain and understand.
- **Isolated validation logic**: Can be tested and extended independently.
- **Clearer error messages**: Agent builders benefit from a simpler API and better feedback.

### Alternative Considerations

- **Keep all logic in planner**: Would maintain complexity and tight coupling.
- **Extract only some validation**: Would not fully solve maintainability and testability issues.

### Trade-offs

- **Initial refactoring effort**: Required code changes and testing.
- **Slightly more indirection**: Planner delegates to validator, but gains maintainability.

## Implementation

- Created a dedicated `PlanValidator` class for all validation logic.
- Updated planner to use the validator for structure and parameter validation.
- Removed result schema validation and excessive logging.

## Consequences

- Positive: More maintainable, testable, and flexible codebase; easier for agent builders.
- Negative: Slightly more indirection in planner logic.
- Impact: Future changes to validation are easier; codebase follows SRP more closely.

## Notes

- Related ADR: adr-0001-remove-return-schema.md
