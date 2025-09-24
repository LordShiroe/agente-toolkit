// Mock Claude API responses for testing

export const mockClaudeResponse = {
  id: 'msg_01ABC123',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'I can help you with that calculation. The answer is 42.'
    }
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 15,
    output_tokens: 25
  }
};

export const mockClaudeToolResponse = {
  id: 'msg_02DEF456',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_01A1B2C3D4E5',
      name: 'calculator',
      input: {
        expression: '15 + 27'
      }
    }
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'tool_use',
  stop_sequence: null,
  usage: {
    input_tokens: 25,
    output_tokens: 35
  }
};

export const mockClaudeToolResponseWithResult = {
  id: 'msg_03GHI789',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'text',
      text: 'I calculated that for you. 15 + 27 = 42.'
    }
  ],
  model: 'claude-3-sonnet-20240229',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {
    input_tokens: 45,
    output_tokens: 20
  }
};

export const mockClaudeErrorResponse = {
  type: 'error',
  error: {
    type: 'rate_limit_error',
    message: 'Rate limit exceeded. Please try again later.'
  }
};

// Sample prompts for testing
export const samplePrompts = {
  basic: 'You are a helpful AI assistant.',
  withContext: 'You are a helpful AI assistant. The user has previously asked about weather and calculations.',
  withMemory: 'You are a helpful AI assistant. Recent context: User asked about Tokyo weather and calculated 25 * 4.',
  withTools: 'You are a helpful AI assistant with access to tools for calculations and memory search.'
};

// Sample API configurations
export const testApiConfig = {
  apiKey: 'test-api-key-123',
  model: 'claude-3-sonnet-20240229',
  maxTokens: 1000,
  temperature: 0.7
};