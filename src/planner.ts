import { ModelAdapter } from './adapters/base';
import { Tool } from './agent';
import { getLogger } from './logger';
import { ReferenceResolver } from './referenceResolver';
import Ajv from 'ajv';
import { TSchema } from '@sinclair/typebox';

export interface PlanStep {
  id: string;
  toolName: string;
  params: any;
  dependsOn: string[];
  status: 'pending' | 'completed' | 'failed';
  result?: string;
}

export interface ExecutionPlan {
  steps: PlanStep[];
  context: Record<string, any>;
}

export class Planner {
  private ajv = new Ajv();
  private logger = getLogger();
  private referenceResolver = new ReferenceResolver();

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

          const processedParams = this.referenceResolver.resolveReferences(
            step.params,
            plan.context,
            tool.paramsSchema
          );
          this.logger.logParameterResolution(step.id, step.params, processedParams);

          // Validate params
          const validate = this.ajv.compile(tool.paramsSchema);
          if (!validate(processedParams)) {
            this.logger.logValidationError(step.toolName, validate.errors);
            throw new Error(
              `Invalid params for tool '${step.toolName}': ${JSON.stringify(validate.errors)}`
            );
          }

          step.result = await tool.action(processedParams);

          // Validate result against resultSchema if provided
          if (tool.resultSchema) {
            this._validateToolResult(step.result, tool.resultSchema, tool.name);
          }

          step.status = 'completed';
          plan.context[step.id] = step.result;

          const duration = Date.now() - startTime;
          this.logger.logToolExecution(step.toolName, processedParams, step.result, duration);

          results.push(`${step.id}: ${step.result}`);
        } catch (error) {
          step.status = 'failed';
          step.result = `Error: ${error instanceof Error ? error.message : String(error)}`;
          results.push(`${step.id}: ${step.result}`);
        }
      }
    }

    return results.join('\n');
  }

  private _validateToolResult(result: string, resultSchema: TSchema, toolName: string): void {
    try {
      // Try to parse the result as JSON to validate against schema
      const parsedResult = JSON.parse(result);
      const validate = this.ajv.compile(resultSchema);

      if (!validate(parsedResult)) {
        this.logger.warn(`Tool '${toolName}' result does not match expected schema`, {
          errors: validate.errors,
          result: parsedResult,
        });
      }
    } catch (error) {
      // If result is not JSON, that's fine - just log it
      this.logger.debug(`Tool '${toolName}' returned non-JSON result: ${result}`);
    }
  }
}
