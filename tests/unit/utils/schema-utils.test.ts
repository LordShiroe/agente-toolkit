import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { SchemaUtils } from '../../../src/infrastructure/adapters/utils/schemaUtils';

describe('SchemaUtils', () => {
  describe('convertToJsonSchema', () => {
    it('should convert object schemas correctly', () => {
      const objectSchema = Type.Object({
        name: Type.String(),
        age: Type.Number(),
        active: Type.Boolean(),
      });

      const convertedSchema = SchemaUtils.convertToJsonSchema(objectSchema);

      expect(convertedSchema.type).toBe('object');
      expect(convertedSchema.properties).toBeDefined();
      expect(convertedSchema.properties.name).toBeDefined();
      expect(convertedSchema.properties.age).toBeDefined();
      expect(convertedSchema.properties.active).toBeDefined();
      expect(convertedSchema.required).toEqual(['name', 'age', 'active']);
    });

    it('should wrap non-object schemas in an object', () => {
      const stringSchema = Type.String();

      const convertedSchema = SchemaUtils.convertToJsonSchema(stringSchema);

      expect(convertedSchema.type).toBe('object');
      expect(convertedSchema.properties).toBeDefined();
      expect(convertedSchema.properties.value).toBeDefined();
      expect(convertedSchema.required).toEqual(['value']);
    });

    it('should handle schemas without properties', () => {
      const emptyObjectSchema = Type.Object({});

      const convertedSchema = SchemaUtils.convertToJsonSchema(emptyObjectSchema);

      expect(convertedSchema.type).toBe('object');
      expect(convertedSchema.properties).toEqual({});
      expect(convertedSchema.required).toEqual([]);
    });

    it('should handle schemas without required fields', () => {
      const schemaWithoutRequired = {
        type: 'object',
        properties: {
          optionalField: { type: 'string' },
        },
      };

      const convertedSchema = SchemaUtils.convertToJsonSchema(schemaWithoutRequired as any);

      expect(convertedSchema.type).toBe('object');
      expect(convertedSchema.required).toEqual([]);
    });
  });

  describe('isValidSchema', () => {
    it('should return true for valid schemas', () => {
      const validSchema = { type: 'string' };
      expect(SchemaUtils.isValidSchema(validSchema)).toBe(true);
    });

    it('should return false for invalid schemas', () => {
      expect(SchemaUtils.isValidSchema(null)).toBe(false);
      expect(SchemaUtils.isValidSchema(undefined)).toBe(false);
      expect(SchemaUtils.isValidSchema({})).toBe(false);
      expect(SchemaUtils.isValidSchema('string')).toBe(false);
    });
  });

  describe('getRequiredFields', () => {
    it('should extract required fields from object schema', () => {
      const schema = Type.Object({
        name: Type.String(),
        age: Type.Number(),
        email: Type.Optional(Type.String()),
      });

      const required = SchemaUtils.getRequiredFields(schema);
      expect(required).toEqual(['name', 'age']);
    });

    it('should return empty array for non-object schemas', () => {
      const stringSchema = Type.String();
      const required = SchemaUtils.getRequiredFields(stringSchema);
      expect(required).toEqual([]);
    });

    it('should return empty array for schemas without required fields', () => {
      const schema = {
        type: 'object',
        properties: { optional: { type: 'string' } },
      };

      const required = SchemaUtils.getRequiredFields(schema as any);
      expect(required).toEqual([]);
    });
  });

  describe('getPropertyNames', () => {
    it('should extract property names from object schema', () => {
      const schema = Type.Object({
        name: Type.String(),
        age: Type.Number(),
        email: Type.String(),
      });

      const properties = SchemaUtils.getPropertyNames(schema);
      expect(properties.sort()).toEqual(['age', 'email', 'name']);
    });

    it('should return empty array for non-object schemas', () => {
      const stringSchema = Type.String();
      const properties = SchemaUtils.getPropertyNames(stringSchema);
      expect(properties).toEqual([]);
    });

    it('should return empty array for schemas without properties', () => {
      const emptySchema = Type.Object({});
      const properties = SchemaUtils.getPropertyNames(emptySchema);
      expect(properties).toEqual([]);
    });
  });
});
