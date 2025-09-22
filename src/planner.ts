import { ModelAdapter } from './adapters/base';
import { Tool } from './types/Tool';
import { getLogger } from './logger';
import { PlanStep } from './types/PlanStep';
import { ExecutionPlan } from './types/ExecutionPlan';
import { RunOptions } from './types/RunOptions';

import { ReferenceResolver, ReferenceResolutionContext } from './referenceResolver';
import { PlanValidator } from './planValidator';

export class Planner {
  private logger = getLogger();
  private referenceResolver = new ReferenceResolver();
  private planValidator = new PlanValidator();

  /**
   * Execute a request using traditional planning approach
   */
  async execute(
    message: string,
    tools: Tool[],
    memoryContext: string,
    systemPrompt: string,
    model: ModelAdapter,
    options: RunOptions = {}
  ): Promise<string> {
    this.logger.info('Using planned execution', {
      adapterName: model.name,
      toolCount: tools.length,
    });

    const plan = await this.createPlan(message, tools, memoryContext, systemPrompt, model);

    this.logger.logPlanCreation(message, tools, plan);

    return this.executePlan(plan, tools, options);
  }

  /**
   * Create a traditional execution plan
   */
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

  /**
   * Execute a plan
   */
  async executePlan(plan: ExecutionPlan, tools: Tool[], options: RunOptions = {}): Promise<string> {
    // Validate plan structure before execution
    this.planValidator.validateStructure(plan, tools);

    const results: string[] = [];
    const runStart = Date.now();
    let executedSteps = 0;

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
        if (options.maxSteps !== undefined && executedSteps >= options.maxSteps) {
          this.logger.warn('Max steps reached, stopping execution', { maxSteps: options.maxSteps });
          return results.concat('Max steps reached, stopping.').join('\n');
        }
        if (options.maxDurationMs !== undefined && Date.now() - runStart > options.maxDurationMs) {
          this.logger.warn('Max duration reached, stopping execution', {
            maxDurationMs: options.maxDurationMs,
          });
          return results.concat('Max duration reached, stopping.').join('\n');
        }

        const stepStart = Date.now();
        this.logger.logStepStart(step.id, step.toolName);
        try {
          const tool = tools.find(t => t.name === step.toolName);

          if (!tool) {
            throw new Error(`Tool '${step.toolName}' not found`);
          }

          // Use reference resolution with results context
          const context: ReferenceResolutionContext = {
            results: plan.context,
            metadata: {},
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

          const duration = Date.now() - stepStart;
          this.logger.logToolExecution(step.toolName, processedParams, step.result, duration);
          this.logger.logStepEnd(step.id, step.toolName, duration);

          // Properly serialize the result - if it's an object, stringify it
          const serializedResult =
            typeof step.result === 'object' && step.result !== null
              ? JSON.stringify(step.result, null, 2)
              : String(step.result);

          results.push(`${step.id}: ${serializedResult}`);
          executedSteps += 1;
        } catch (error) {
          step.status = 'failed';
          step.result = `Error: ${error instanceof Error ? error.message : String(error)}`;

          // Error results are always strings, so no need for special serialization
          results.push(`${step.id}: ${step.result}`);

          if (options.stopOnFirstToolError) {
            this.logger.warn('Stopping on first tool error as configured', {
              stepId: step.id,
              toolName: step.toolName,
            });
            return results.join('\n');
          }
        }
      }
    }

    return results.join('\n');
  }
}
