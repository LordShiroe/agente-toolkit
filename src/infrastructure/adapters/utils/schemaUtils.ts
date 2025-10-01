import { TSchema } from '@sinclair/typebox';

/**
 * Utility functions for schema conversion and manipulation
 */
export class SchemaUtils {
  /**
   * Convert TypeBox schema to JSON Schema format
   * This is used by adapters to convert tool parameter schemas
   * to the format expected by different LLM APIs
   */
  static convertToJsonSchema(schema: TSchema): any {
    const schemaObj = schema as any;

    if (schemaObj.type === 'object') {
      return {
        type: 'object',
        properties: schemaObj.properties || {},
        required: schemaObj.required || [],
      };
    }

    // For non-object schemas, wrap in an object
    return {
      type: 'object',
      properties: {
        value: schemaObj,
      },
      required: ['value'],
    };
  }

  /**
   * Validate that a schema object has the expected structure
   */
  static isValidSchema(schema: any): boolean {
    return !!schema && typeof schema === 'object' && 'type' in schema;
  }

  /**
   * Extract required fields from a TypeBox schema
   */
  static getRequiredFields(schema: TSchema): string[] {
    const schemaObj = schema as any;
    if (schemaObj.type === 'object' && schemaObj.required) {
      return Array.isArray(schemaObj.required) ? schemaObj.required : [];
    }
    return [];
  }

  /**
   * Get all property names from an object schema
   */
  static getPropertyNames(schema: TSchema): string[] {
    const schemaObj = schema as any;
    if (schemaObj.type === 'object' && schemaObj.properties) {
      return Object.keys(schemaObj.properties);
    }
    return [];
  }
}
