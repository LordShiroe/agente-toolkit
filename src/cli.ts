#!/usr/bin/env node

import { Command } from 'commander';
import { Agent } from './agent';
import { Type, Static } from '@sinclair/typebox';

const program = new Command();

program.name('agente-toolkit').description('CLI for Agente Toolkit agent').version('1.0.0');

program
  .command('run')
  .description('Run the agent with a prompt')
  .option('-k, --api-key <key>', 'Anthropic API key')
  .option('-p, --prompt <prompt>', 'Prompt for the agent', 'You are a helpful assistant.')
  .option('-r, --provider <provider>', 'Model provider to use (claude|openai|ollama)', 'claude')
  .option('-m, --model <model>', 'Preferred model to override adapter default')
  .action(async options => {
    if (!options.apiKey) {
      console.error('API key is required. Use -k or --api-key');
      process.exit(1);
    }

    const agent = new Agent();

    // Add a sample tool
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

    agent.addTool(addTool);
    agent.setPrompt(options.prompt);
    agent.remember('User wants to add 5 and 3');

    try {
      let adapter;
      if (options.provider === 'claude') {
        const { ClaudeAdapter } = await import('./adapters/claudeAdapter');
        adapter = new ClaudeAdapter();
      } else {
        console.error('Provider not supported in this demo. Use --provider claude');
        process.exit(1);
      }
      // Use the agent system to decide and act
      const result = await agent.decideAndAct(options.apiKey, adapter, options.model);
      console.log('Agent Result:', result);
      console.log('Memory:', agent.getMemory());
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }
  });

program.parse();
