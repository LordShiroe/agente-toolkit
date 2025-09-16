import { TSchema } from '@sinclair/typebox';
import { getLogger } from './logger';

export interface ReferenceResolutionContext {
  [stepId: string]: any;
}

export class ReferenceResolver {
  private logger = getLogger();

  /**
   * Resolves template references in parameters using the execution context
   * @param params The parameters that may contain template references
   * @param context The execution context containing step results
   * @param schema Optional schema for type coercion
   * @returns The resolved parameters with references replaced
   */
  resolveReferences(params: any, context: ReferenceResolutionContext, schema?: TSchema): any {
    if (typeof params === 'string') {
      return this._resolveStringTemplate(params, context, schema);
    }

    if (Array.isArray(params)) {
      const arraySchema = schema?.type === 'array' ? schema.items : undefined;
      return params.map(item => this.resolveReferences(item, context, arraySchema));
    }

    if (params && typeof params === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        const propertySchema = schema?.type === 'object' ? schema.properties?.[key] : undefined;
        result[key] = this.resolveReferences(value, context, propertySchema);
      }
      return result;
    }

    return this._coerceType(params, schema);
  }

  private _resolveStringTemplate(
    params: string,
    context: ReferenceResolutionContext,
    schema?: TSchema
  ): any {
    // Check if the entire string is a template reference (e.g., "{{step1.latitude}}")
    const singleRefMatch = params.match(/^\{\{(\w+)(?:\.(\w+))?\}\}$/);
    if (singleRefMatch) {
      const [, stepId, property] = singleRefMatch;
      return this._resolveStepReference(stepId, property, context, schema);
    }

    // Handle string interpolation (mixed content)
    return this._interpolateTemplateString(params, context);
  }

  private _resolveStepReference(
    stepId: string,
    property: string | undefined,
    context: ReferenceResolutionContext,
    schema?: TSchema
  ): any {
    const stepResult = context[stepId];
    if (stepResult === undefined) {
      this.logger.warn(`Step result not found for reference: ${stepId}`);
      return '';
    }

    if (property) {
      // Handle property access like {{step1.latitude}} - preserve original type
      try {
        const parsed = typeof stepResult === 'string' ? JSON.parse(stepResult) : stepResult;
        const value = parsed[property] !== undefined ? parsed[property] : '';
        return this._coerceType(value, schema);
      } catch (error) {
        this.logger.warn(`Failed to parse step result for ${stepId}.${property}: ${error}`);
        return '';
      }
    } else {
      // Handle full step result like {{step1}} - preserve original type
      return this._coerceType(stepResult, schema);
    }
  }

  private _interpolateTemplateString(params: string, context: ReferenceResolutionContext): string {
    return params.replace(/\{\{(\w+)(?:\.(\w+))?\}\}/g, (_, stepId, property) => {
      const stepResult = context[stepId];
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

// Export a default instance for convenience
export const referenceResolver = new ReferenceResolver();
