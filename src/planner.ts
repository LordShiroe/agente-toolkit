import { ModelAdapter } from './adapters/base';
import { Tool } from './types/Tool';
import { getLogger } from './logger';
import { PlanStep } from './types/PlanStep';
import { ExecutionPlan } from './types/ExecutionPlan';

import { ReferenceResolver, ReferenceResolutionContext } from './referenceResolver';
import { PlanValidator } from './planValidator';

export class Planner {
  private logger = getLogger();
  private referenceResolver = new ReferenceResolver();
  private planValidator = new PlanValidator();

  async createPlan(
    message: string,
    tools: Tool[],
    memoryContext: string,
    systemPrompt: string,
    model: ModelAdapter
  ): Promise<ExecutionPlan> {
    const toolDescriptions = tools
      .map(
        t =>
          `Tool: ${t.name}\nDescription: ${t.description}\nParams: ${JSON.stringify(
            t.paramsSchema
          )}`
      )
      .join('\n\n');

    const planningPrompt = `${systemPrompt}

Context from memory:
${memoryContext}

Available Tools:
${toolDescriptions}

Current request: ${message}

Create an execution plan. Respond ONLY with a JSON array of steps:
[
  {
    "id": "step1",
    "toolName": "name",
    "params": {...},
    "dependsOn": []
  },
  {
    "id": "step2", 
    "toolName": "name2",
    "params": {"input": "{{step1}}"},
    "dependsOn": ["step1"]
  }
]

Use {{stepId}} in params to reference previous step results.`;

    this.logger.logPrompt(planningPrompt, { userMessage: message, toolCount: tools.length });
    const response = await model.complete(planningPrompt);
    this.logger.logModelResponse(response, { operation: 'plan_creation' });
    try {
      const steps = JSON.parse(response.trim()) as PlanStep[];
      return {
        steps: steps.map(step => ({ ...step, status: 'pending' as const })),
        context: {},
      };
    } catch {
      throw new Error(`Failed to parse execution plan: ${response}`);
    }
  }

  async executePlan(plan: ExecutionPlan, tools: Tool[]): Promise<string> {
    // Validate plan structure before execution
    this.planValidator.validateStructure(plan, tools);

    const results: string[] = [];

    while (plan.steps.some(step => step.status === 'pending')) {
      const executableSteps = plan.steps.filter(step => {
        if (step.status !== 'pending') return false;
        return step.dependsOn.every(depId => {
          const depStep = plan.steps.find(s => s.id === depId);
          return depStep?.status === 'completed';
        });
      });

      if (executableSteps.length === 0) {
        throw new Error('Plan execution deadlocked or contains circular dependencies');
      }

      for (const step of executableSteps) {
        const startTime = Date.now();
        try {
          const tool = tools.find(t => t.name === step.toolName);

          if (!tool) {
            throw new Error(`Tool '${step.toolName}' not found`);
          }

          // Use reference resolution with results context
          const context: ReferenceResolutionContext = {
            results: plan.context,
            metadata: {}, // Empty metadata since we removed result validation
          };

          const processedParams = this.referenceResolver.resolveReferences(
            step.params,
            context,
            tool.paramsSchema
          );
          this.logger.logParameterResolution(step.id, step.params, processedParams);

          // Validate params
          const validationResult = this.planValidator.validateParameters(
            processedParams,
            tool.paramsSchema
          );
          if (!validationResult.isValid) {
            this.logger.logValidationError(step.toolName, validationResult.errors);
            throw new Error(
              `Invalid params for tool '${step.toolName}': ${JSON.stringify(
                validationResult.errors
              )}`
            );
          }

          step.result = await tool.action(processedParams);

          step.status = 'completed';
          plan.context[step.id] = step.result;

          const duration = Date.now() - startTime;
          this.logger.logToolExecution(step.toolName, processedParams, step.result, duration);

          // Properly serialize the result - if it's an object, stringify it
          const serializedResult =
            typeof step.result === 'object' && step.result !== null
              ? JSON.stringify(step.result, null, 2)
              : String(step.result);

          results.push(`${step.id}: ${serializedResult}`);
        } catch (error) {
          step.status = 'failed';
          step.result = `Error: ${error instanceof Error ? error.message : String(error)}`;

          // Error results are always strings, so no need for special serialization
          results.push(`${step.id}: ${step.result}`);
        }
      }
    }

    return results.join('\n');
  }
}
