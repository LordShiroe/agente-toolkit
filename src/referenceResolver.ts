import { TSchema } from '@sinclair/typebox';
import { AgentLogger } from './interfaces/AgentLogger';
import { createDefaultLogger } from './loggers/defaultLoggers';

export interface StepResultMetadata {
  resultSchema?: TSchema;
  toolName?: string;
}

export interface ReferenceResolutionContext {
  results: { [stepId: string]: any };
  metadata: { [stepId: string]: StepResultMetadata };
}

export class ReferenceResolver {
  private logger: AgentLogger;

  constructor(logger?: AgentLogger) {
    this.logger = logger || createDefaultLogger();
  }

  /**
   * Resolves template references in parameters using the execution context
   * @param params The parameters that may contain template references
   * @param context The execution context containing step results and metadata
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
    const stepResult = context.results[stepId];
    const metadata = context.metadata[stepId];

    if (stepResult === undefined) {
      this.logger.warn(`Step result not found for reference: ${stepId}`);
      return '';
    }

    if (property) {
      // Handle property access like {{step1.latitude}} - preserve original type
      try {
        const parsed = typeof stepResult === 'string' ? JSON.parse(stepResult) : stepResult;

        if (parsed[property] === undefined) {
          // Enhanced error message with available properties
          const availableProps = this._getAvailableProperties(parsed, metadata?.resultSchema);
          const suggestion =
            availableProps.length > 0 ? ` Available properties: ${availableProps.join(', ')}` : '';
          this.logger.warn(`Property '${property}' not found in ${stepId}.${suggestion}`);
          return '';
        }

        const value = parsed[property];
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
      const stepResult = context.results[stepId];
      if (stepResult === undefined) return '';

      if (property) {
        try {
          const parsed = typeof stepResult === 'string' ? JSON.parse(stepResult) : stepResult;
          if (parsed[property] === undefined) {
            const metadata = context.metadata[stepId];
            const availableProps = this._getAvailableProperties(parsed, metadata?.resultSchema);
            const suggestion =
              availableProps.length > 0 ? ` Available: ${availableProps.join(', ')}` : '';
            this.logger.warn(`Property '${property}' not found in ${stepId}.${suggestion}`);
            return '';
          }
          return String(parsed[property]);
        } catch {
          return '';
        }
      } else {
        return String(stepResult);
      }
    });
  }

  /**
   * Extracts template references from a parameter string
   * @param paramString The parameter string to analyze (typically JSON.stringify(params))
   * @returns Array of template references found
   */
  extractTemplateReferences(
    paramString: string
  ): Array<{ stepId: string; property?: string; fullMatch: string }> {
    const references: Array<{ stepId: string; property?: string; fullMatch: string }> = [];
    const matches = paramString.match(/\{\{(\w+)(?:\.(\w+))?\}\}/g) || [];

    for (const match of matches) {
      const parsed = match.match(/\{\{(\w+)(?:\.(\w+))?\}\}/);
      if (parsed) {
        const [fullMatch, stepId, property] = parsed;
        references.push({
          stepId,
          property,
          fullMatch,
        });
      }
    }

    return references;
  }

  private _getAvailableProperties(data: any, resultSchema?: TSchema): string[] {
    const properties: string[] = [];

    // Get properties from actual data
    if (data && typeof data === 'object') {
      properties.push(...Object.keys(data));
    }

    // Get properties from schema if available
    if (resultSchema?.type === 'object' && resultSchema.properties) {
      const schemaProps = Object.keys(resultSchema.properties);
      schemaProps.forEach(prop => {
        if (!properties.includes(prop)) {
          properties.push(prop);
        }
      });
    }

    return properties.sort();
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
