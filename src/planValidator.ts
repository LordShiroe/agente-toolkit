import { Tool } from './types/Tool';
import { ExecutionPlan } from './types/ExecutionPlan';
import { ValidationResult } from './types/ValidationResult';
import { getLogger } from './logger';
import Ajv from 'ajv';
import { TSchema } from '@sinclair/typebox';

export class PlanValidator {
  private ajv = new Ajv();
  private logger = getLogger();

  /**
   * Validates the structure of an execution plan
   * Checks tool existence and step dependencies
   */
  validateStructure(plan: ExecutionPlan, tools: Tool[]): void {
    const toolMap = new Map(tools.map(t => [t.name, t]));

    for (const step of plan.steps) {
      // Check if tool exists
      const tool = toolMap.get(step.toolName);
      if (!tool) {
        this.logger.warn(`Tool '${step.toolName}' not found during plan validation`);
        continue;
      }

      // Check if step dependencies exist
      for (const depId of step.dependsOn) {
        const depStep = plan.steps.find(s => s.id === depId);
        if (!depStep) {
          throw new Error(
            `Plan validation failed: Step '${step.id}' depends on non-existent step '${depId}'`
          );
        }
      }
    }
  }

  /**
   * Validates tool parameters against the tool's schema
   */
  validateParameters(params: any, schema: TSchema): ValidationResult {
    const validate = this.ajv.compile(schema);
    const isValid = validate(params);

    return {
      isValid,
      errors: isValid ? undefined : validate.errors || undefined,
    };
  }
}
