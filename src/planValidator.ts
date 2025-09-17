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
    const stepIds = new Set(plan.steps.map(s => s.id));

    for (const step of plan.steps) {
      // Check if tool exists
      const tool = toolMap.get(step.toolName);
      if (!tool) {
        this.logger.warn(`Tool '${step.toolName}' not found during plan validation`, {
          availableTools: Array.from(toolMap.keys()),
          stepId: step.id,
        });
        continue;
      }

      // Check if step dependencies exist
      for (const depId of step.dependsOn) {
        if (!stepIds.has(depId)) {
          throw new Error(
            `Plan validation failed: Step '${step.id}' depends on non-existent step '${depId}'`
          );
        }
      }
    }

    // Detect circular dependencies using DFS
    const adjacency = new Map<string, string[]>();
    for (const step of plan.steps) {
      adjacency.set(step.id, step.dependsOn || []);
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      if (visiting.has(node)) {
        const cycleStart = path.indexOf(node);
        const cyclePath = cycleStart >= 0 ? path.slice(cycleStart).concat(node) : path;
        throw new Error(
          `Plan validation failed: Circular dependency detected: ${cyclePath.join(' -> ')}`
        );
      }
      if (visited.has(node)) return false;
      visiting.add(node);
      const neighbors = adjacency.get(node) || [];
      for (const n of neighbors) {
        dfs(n, path.concat(node));
      }
      visiting.delete(node);
      visited.add(node);
      return false;
    };

    for (const step of plan.steps) {
      if (!visited.has(step.id)) dfs(step.id, []);
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
      errors: isValid
        ? undefined
        : (validate.errors || []).map(err => ({
            keyword: err.keyword,
            instancePath: err.instancePath,
            message: err.message,
            params: err.params,
          })),
    };
  }
}
