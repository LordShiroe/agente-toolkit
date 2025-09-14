import { Agent } from './agent';
import { Type, Static } from '@sinclair/typebox';

const addSchema = Type.Object({
  a: Type.Number(),
  b: Type.Number(),
});
type AddParams = Static<typeof addSchema>;

const addTool = {
  name: 'add',
  description: 'Adds two numbers',
  paramsSchema: addSchema,
  action: async (params: AddParams) => (params.a + params.b).toString(),
};

async function main() {
  const agent = new Agent();
  agent.addTool(addTool);
  agent.setPrompt('You are a helpful assistant. Use the add tool to add numbers.');
  agent.remember('User asked to add 5 and 3');

  // For testing, call act directly
  const result = await agent.act([{ toolName: 'add', params: { a: 5, b: 3 } }]);
  console.log('Result:', result);
  console.log('Memory:', agent.getMemory());

  // To test full flow with Claude, uncomment and provide API key
  // const { ClaudeAdapter } = await import('./adapters/claudeAdapter');
  // const apiKey = process.argv[2] || 'your-api-key-here';
  // const adapter = new ClaudeAdapter(apiKey);
  // const fullResult = await agent.decideAndAct(adapter);
  // console.log('Full result:', fullResult);
}

main().catch(console.error);
