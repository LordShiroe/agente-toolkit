import { ModelAdapter } from './adapters/base';
import { Tool } from './agent';
import { getLogger } from './logger';
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

          const processedParams = this._resolveReferences(step.params, plan, tool.paramsSchema);
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

  private _resolveReferences(params: any, plan: ExecutionPlan, schema?: TSchema): any {
    if (typeof params === 'string') {
      // Check if the entire string is a template reference (e.g., "{{step1.latitude}}")
      const singleRefMatch = params.match(/^\{\{(\w+)(?:\.(\w+))?\}\}$/);
      if (singleRefMatch) {
        const [, stepId, property] = singleRefMatch;
        const stepResult = plan.context[stepId];
        if (stepResult === undefined) return '';

        if (property) {
          // Handle property access like {{step1.latitude}} - preserve original type
          try {
            const parsed = typeof stepResult === 'string' ? JSON.parse(stepResult) : stepResult;
            const value = parsed[property] !== undefined ? parsed[property] : '';
            return this._coerceType(value, schema);
          } catch {
            return '';
          }
        } else {
          // Handle full step result like {{step1}} - preserve original type
          return this._coerceType(stepResult, schema);
        }
      }

      // Handle string interpolation (mixed content)
      return params.replace(/\{\{(\w+)(?:\.(\w+))?\}\}/g, (_, stepId, property) => {
        const stepResult = plan.context[stepId];
        if (stepResult === undefined) return '';

        if (property) {
          try {
            const parsed = typeof stepResult === 'string' ? JSON.parse(stepResult) : stepResult;
            return parsed[property] !== undefined ? String(parsed[property]) : '';
          } catch {
            return '';
          }
        } else {
          return String(stepResult);
        }
      });
    }

    if (Array.isArray(params)) {
      const arraySchema = schema?.type === 'array' ? schema.items : undefined;
      return params.map(item => this._resolveReferences(item, plan, arraySchema));
    }

    if (params && typeof params === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        const propertySchema = schema?.type === 'object' ? schema.properties?.[key] : undefined;
        result[key] = this._resolveReferences(value, plan, propertySchema);
      }
      return result;
    }

    return this._coerceType(params, schema);
  }

  private _coerceType(value: any, schema?: TSchema): any {
    if (!schema || value === undefined || value === null) {
      return value;
    }

    const targetType = schema.type;

    switch (targetType) {
      case 'number':
        if (typeof value === 'string') {
          const num = Number(value);
          return isNaN(num) ? value : num;
        }
        return typeof value === 'number' ? value : value;

      case 'integer':
        if (typeof value === 'string') {
          const num = parseInt(value, 10);
          return isNaN(num) ? value : num;
        }
        return typeof value === 'number' ? Math.floor(value) : value;

      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);

      case 'string':
        return String(value);

      default:
        return value;
    }
  }
}
