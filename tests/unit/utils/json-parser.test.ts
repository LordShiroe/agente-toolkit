import { describe, it, expect } from 'vitest';
import { parseJsonFromResponse, containsJson } from '../../../src/shared/utils/jsonParser';

describe('JSON Parser Utils', () => {
  describe('parseJsonFromResponse', () => {
    it('should parse clean JSON', () => {
      const cleanJson = '{"name": "test", "value": 42}';
      const result = parseJsonFromResponse(cleanJson);

      expect(result).toEqual({ name: 'test', value: 42 });
    });

    it('should parse JSON array', () => {
      const jsonArray = '[{"id": 1}, {"id": 2}]';
      const result = parseJsonFromResponse(jsonArray);

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should extract JSON from markdown code blocks', () => {
      const markdownResponse = `Here's your execution plan:

\`\`\`json
[
  {
    "id": "step1",
    "toolName": "geocode_location",
    "params": {"location": "Bogota"},
    "dependsOn": []
  },
  {
    "id": "step2",
    "toolName": "get_weather",
    "params": {"latitude": "{{step1.latitude}}", "longitude": "{{step1.longitude}}"},
    "dependsOn": ["step1"]
  }
]
\`\`\`

This plan should work well!`;

      const result = parseJsonFromResponse(markdownResponse);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'step1',
        toolName: 'geocode_location',
        params: { location: 'Bogota' },
        dependsOn: [],
      });
      expect(result[1]).toEqual({
        id: 'step2',
        toolName: 'get_weather',
        params: { latitude: '{{step1.latitude}}', longitude: '{{step1.longitude}}' },
        dependsOn: ['step1'],
      });
    });

    it('should extract JSON from code blocks without language specifier', () => {
      const codeBlockResponse = `\`\`\`
{"success": true, "data": [1, 2, 3]}
\`\`\``;

      const result = parseJsonFromResponse(codeBlockResponse);

      expect(result).toEqual({ success: true, data: [1, 2, 3] });
    });

    it('should extract JSON from mixed content', () => {
      const mixedResponse = `Some text before

{"result": "success", "count": 5}

Some text after`;

      const result = parseJsonFromResponse(mixedResponse);

      expect(result).toEqual({ result: 'success', count: 5 });
    });

    it('should extract array from mixed content', () => {
      const mixedResponse = `Here are the items:

[{"name": "item1"}, {"name": "item2"}]

Done!`;

      const result = parseJsonFromResponse(mixedResponse);

      expect(result).toEqual([{ name: 'item1' }, { name: 'item2' }]);
    });

    it('should throw error for invalid JSON', () => {
      const invalidResponse = 'This is just plain text with no JSON';

      expect(() => parseJsonFromResponse(invalidResponse)).toThrow('Could not extract valid JSON');
    });

    it('should throw error for malformed JSON in code block', () => {
      const malformedResponse = `\`\`\`json
{invalid: json here}
\`\`\``;

      expect(() => parseJsonFromResponse(malformedResponse)).toThrow(
        'Could not extract valid JSON'
      );
    });
  });

  describe('containsJson', () => {
    it('should return true for valid JSON responses', () => {
      expect(containsJson('{"test": true}')).toBe(true);
      expect(containsJson('[1, 2, 3]')).toBe(true);
      expect(containsJson('```json\n{"test": true}\n```')).toBe(true);
    });

    it('should return false for non-JSON responses', () => {
      expect(containsJson('Just plain text')).toBe(false);
      expect(containsJson('```\nNot JSON\n```')).toBe(false);
    });
  });
});
