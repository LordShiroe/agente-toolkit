---
type: decision
id: adr-0001
title: Remove `returnSchema` from Tool Definitions
status: Accepted
date: 2025-09-16
deciders: [LordShiroe]
tags: [refactoring, validation, simplification]
---

## Context

The initial design included a `returnSchema` property for each Tool, intended to validate and parse tool outputs. This added complexity to the planner and agent orchestration, requiring extra validation logic, metadata management, and error handling. In practice, this feature provided little value to agent builders, as most tools either return simple values or their own structured outputs, and schema validation of results rarely prevented meaningful errors.

## Decision

We have removed the `returnSchema` property from Tool definitions and all related result validation logic from the planner system. Tool outputs are now treated as opaque strings, and it is the responsibility of tool authors to ensure their outputs are well-formed and documented. The planner and agent system will not attempt to validate or parse tool results against a schema.

## Rationale

### Benefits

- **Simpler codebase**: The planner and agent code are easier to maintain and understand.
- **Less burden for agent builders**: No need to define unnecessary schemas for tool outputs.
- **Greater flexibility**: Tool authors retain full control over their output formats.

### Alternative Considerations

- **Keep returnSchema**: Would require more validation logic and metadata management, increasing complexity.
- **Validate results in planner**: Adds little value and duplicates responsibility already handled by tool authors.

### Trade-offs

- **Loss of automatic result validation**: Any result validation must be handled within the tool itself.
- **Less type safety for outputs**: Outputs are now opaque strings, so consumers must parse if needed.

## Implementation

- Removed `returnSchema` from all Tool definitions.
- Deleted result validation logic from the planner and agent system.
- Updated documentation to clarify tool output expectations.

## Consequences

- Positive: Simpler, more maintainable codebase; easier for agent builders; more flexible for tool authors.
- Negative: No automatic result validation; less type safety for tool outputs.
- Impact: Future tool integrations are easier; agent system is more robust and less error-prone.

## Notes

- Related ADR: adr-0002-simplify-planner-validation.md
