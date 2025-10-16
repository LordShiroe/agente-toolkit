import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OllamaAdapter } from '../../../src/infrastructure/adapters/ollama/ollamaAdapter';

// Global fetch mock
const mockFetch = vi.fn();
(global as any).fetch = mockFetch;

describe('OllamaAdapter structured output', () => {
  let adapter: OllamaAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new OllamaAdapter('http://localhost:11434', 'llama3.2:latest');
  });

  it('uses chat endpoint with format json when json option passed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: { content: '{}' } }),
    });

    await adapter.complete('Return an object', { json: true });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.format).toBe('json');
  });

  it('uses chat endpoint with schema object when schema option passed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: { content: '{}' } }),
    });
    const schema = { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] };

    await adapter.complete('Return an object', { schema });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.format).toEqual(schema);
  });

  it('falls back to generate endpoint for plain text', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ response: 'Hi' }) });

    await adapter.complete('Say hi');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
