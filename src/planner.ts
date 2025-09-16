import { ModelAdapter } from './adapters/base';
import { Tool } from './agent';
import { getLogger } from './logger';
import {
  ReferenceResolver,
  ReferenceResolutionContext,
  StepResultMetadata,
} from './referenceResolver';
import Ajv from 'ajv';
import { TSchema } from '@sinclair/typebox';

export interface PlanStep {
  id: string;
  toolName: string;
  params: any;
  dependsOn: string[];
  status: 'pending' | 'completed' | 'failed';
  result?: string;
  structuredResult?: any; // Parsed result when resultSchema is available
}

export interface ExecutionPlan {
  steps: PlanStep[];
  context: Record<string, any>;
  metadata: Record<string, StepResultMetadata>; // Store result schemas and tool info
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
        metadata: {},
      };
    } catch {
      throw new Error(`Failed to parse execution plan: ${response}`);
    }
  }

  async executePlan(plan: ExecutionPlan, tools: Tool[]): Promise<string> {
    // Validate plan references before execution
    this._validatePlanReferences(plan, tools);

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

          // Store tool metadata for enhanced reference resolution
          plan.metadata[step.id] = {
            resultSchema: tool.resultSchema,
            toolName: tool.name,
          };

          // Use enhanced reference resolution with metadata
          const context: ReferenceResolutionContext = {
            results: plan.context,
            metadata: plan.metadata,
          };

          const processedParams = this.referenceResolver.resolveReferences(
            step.params,
            context,
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

          // Parse and store structured result if resultSchema is available
          if (tool.resultSchema) {
            this._validateAndStoreStructuredResult(step, tool.resultSchema, tool.name);
          }

          step.status = 'completed';
          plan.context[step.id] = step.structuredResult || step.result;

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

  private _validatePlanReferences(plan: ExecutionPlan, tools: Tool[]): void {
    const toolMap = new Map(tools.map(t => [t.name, t]));

    for (const step of plan.steps) {
      const tool = toolMap.get(step.toolName);
      if (!tool) {
        this.logger.warn(`Tool '${step.toolName}' not found during plan validation`);
        continue;
      }

      // Check if step dependencies exist and will have the expected properties
      for (const depId of step.dependsOn) {
        const depStep = plan.steps.find(s => s.id === depId);
        if (!depStep) {
          throw new Error(
            `Plan validation failed: Step '${step.id}' depends on non-existent step '${depId}'`
          );
        }

        const depTool = toolMap.get(depStep.toolName);
        if (depTool?.resultSchema) {
          // Store metadata for validation
          plan.metadata[depId] = {
            resultSchema: depTool.resultSchema,
            toolName: depTool.name,
          };
        }
      }

      // Validate template references in step parameters
      this._validateStepReferences(step, plan.metadata);
    }
  }

  private _validateStepReferences(
    step: PlanStep,
    metadata: Record<string, StepResultMetadata>
  ): void {
    const paramStr = JSON.stringify(step.params);
    const references = this.referenceResolver.extractTemplateReferences(paramStr);

    for (const { stepId, property, fullMatch } of references) {
      const stepMetadata = metadata[stepId];

      if (!stepMetadata) {
        this.logger.warn(
          `Plan validation: Reference ${fullMatch} in step ${step.id} points to step without metadata`
        );
        continue;
      }

      // If we have a resultSchema and a property reference, validate the property exists
      if (
        property &&
        stepMetadata.resultSchema?.type === 'object' &&
        stepMetadata.resultSchema.properties
      ) {
        const availableProps = Object.keys(stepMetadata.resultSchema.properties);
        if (!availableProps.includes(property)) {
          this.logger.warn(
            `Plan validation: Property '${property}' not found in ${stepId} schema. Available: ${availableProps.join(
              ', '
            )}`
          );
        }
      }
    }
  }

  private _validateAndStoreStructuredResult(
    step: PlanStep,
    resultSchema: TSchema,
    toolName: string
  ): void {
    try {
      // Try to parse the result as JSON to validate against schema
      const parsedResult = JSON.parse(step.result!);
      const validate = this.ajv.compile(resultSchema);

      if (!validate(parsedResult)) {
        this.logger.warn(`Tool '${toolName}' result does not match expected schema`, {
          errors: validate.errors,
          result: parsedResult,
        });
        // Still store the parsed result even if validation fails
        step.structuredResult = parsedResult;
      } else {
        // Store the validated structured result
        step.structuredResult = parsedResult;
        this.logger.debug(`Tool '${toolName}' result validated successfully`);
      }
    } catch (error) {
      // If result is not JSON, store as string
      this.logger.debug(`Tool '${toolName}' returned non-JSON result: ${step.result}`);
      step.structuredResult = step.result;
    }
  }
}
