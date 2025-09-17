# Orchestration Implementation Tasks

Track progress per file while implementing orchestration patterns (single-agent, manager, decentralized), guardrails, and CLI/demo wiring.

- [ ] src/agent.ts — Update agent run options

  - Add RunOptions (maxSteps, maxDurationMs, stopOnFirstToolError, requiredOutputRegex)
  - Structured run events logging
  - Pass options into Planner execution

- [ ] src/planner.ts — Planner loop guards

  - Enforce max iterations and early exit when plan resolves to final/empty
  - Configurable stop-on-error
  - Improved step timing logs

- [ ] src/planValidator.ts — Validator improvements

  - Better circular dependency messages
  - Clearer parameter validation errors (no API break)

- [ ] src/logger.ts — Structured logger events

  - Add logRunStart/logRunEnd/logStepStart/logStepEnd/logHandoff helpers

- [ ] src/cli.ts — CLI orchestration flags

  - Add --mode (single|manager|decentralized), --max-steps, --timeout-ms, --stop-on-error flags
  - Wire flags to agent construction and run options

- [ ] src/types/RunOptions.ts — Define RunOptions type

  - Shared type for Agent/Planner options (maxSteps, maxDurationMs, stopOnFirstToolError, requiredOutputRegex)

- [ ] src/tools/AgentTool.ts — Implement AgentTool wrapper

  - Tool that calls another Agent’s run(input, adapter, options)
  - Include TypeBox schema for params

- [ ] src/agents/ManagerAgent.ts — Create ManagerAgent

  - Compose CalculatorAgent and WeatherAgent via AgentTool
  - Add simple delegation instructions

- [ ] src/tools/HandoffTool.ts — Implement HandoffTool

  - Hand off execution to a peer agent by name using an agent registry

- [ ] src/agentRegistry.ts — Add agent registry

  - In-memory registry to register/get agents by name for decentralized handoffs

- [ ] src/tools/SafeTool.ts — SafeTool wrapper

  - Decorator to add timeout, retries, and backoff around Tool.action

- [ ] src/types/Tool.ts — Tool type refinements

  - Optional helper types (ToolParams<T>, ToolResult) for SafeTool/AgentTool

- [ ] tests/singleAgent.test.ts — Single-agent tests

  - Max steps enforcement, early exit behavior using stub tool and minimal adapter

- [ ] tests/managerPattern.test.ts — Manager pattern tests

  - Validate AgentTool invocation and composed results from ManagerAgent

- [ ] tests/decentralizedHandoff.test.ts — Decentralized handoff tests

  - Ensure HandoffTool routes to correct peer agent and returns output

- [ ] tests/safeTool.test.ts — SafeTool tests

  - Confirm retries and timeout behavior

- [ ] README.md — README updates

  - Document orchestration patterns, new CLI flags, and quickstarts

- [ ] package.json — Test setup
  - Add test script and dev dependencies (e.g., vitest, ts-node/tsx)
