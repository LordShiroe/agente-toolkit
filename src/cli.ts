#!/usr/bin/env node

import readline from 'readline';
import { Command } from 'commander';
import { Agent } from './agent';
import { ModelAdapter } from './adapters/base';
import { SlidingWindowMemoryManager } from './memory';
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
  .option('--memory-size <size>', 'Maximum number of memories to keep', '30')
  .option('--interactive', 'Run in interactive mode for multiple conversations')
  .action(async options => {
    if (!options.apiKey) {
      console.error('API key is required. Use -k or --api-key');
      process.exit(1);
    }

    // Create memory manager with custom size if specified
    const memorySize = parseInt(options.memorySize) || 30;
    const memoryManager = new SlidingWindowMemoryManager(memorySize);
    const agent = new Agent(memoryManager);

    // Add sample tools
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

    const multiplySchema = Type.Object({
      a: Type.Number(),
      b: Type.Number(),
    });
    type MultiplyParams = Static<typeof multiplySchema>;

    const multiplyTool = {
      name: 'multiply',
      description: 'Multiplies two numbers',
      paramsSchema: multiplySchema,
      action: async (params: MultiplyParams) => (params.a * params.b).toString(),
    };

    agent.addTool(addTool);
    agent.addTool(multiplyTool);
    agent.setPrompt(options.prompt);

    try {
      let adapter: ModelAdapter;
      if (options.provider === 'claude') {
        const { ClaudeAdapter } = await import('./adapters/claudeAdapter');
        adapter = new ClaudeAdapter(options.apiKey, options.model);
      } else {
        console.error('Provider not supported in this demo. Use --provider claude');
        process.exit(1);
      }

      if (options.interactive) {
        console.log(
          '🤖 Interactive mode enabled. Type "exit" to quit, "memory" to see memory stats.'
        );
        console.log(`📊 Memory Manager: Max ${memorySize} memories\n`);

        // ...existing code...
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const askQuestion = () => {
          rl.question('You: ', async (input: string) => {
            if (input.toLowerCase() === 'exit') {
              console.log('Goodbye! 👋');
              rl.close();
              return;
            }

            if (input.toLowerCase() === 'memory') {
              console.log(`\n📊 Memory Stats:`);
              console.log(`- Total memories: ${agent.getMemoryCount()}`);
              console.log(`- Recent memories:`);
              const recentMemories = agent.getMemory().slice(-5);
              recentMemories.forEach(m => {
                console.log(
                  `  [${m.type}] ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''}`
                );
              });
              console.log();
              askQuestion();
              return;
            }

            try {
              const result = await agent.run(input, adapter);
              console.log(`🤖 Agent: ${result}\n`);
            } catch (error) {
              console.error('❌ Error:', error instanceof Error ? error.message : String(error));
            }
            askQuestion();
          });
        };

        askQuestion();
      } else {
        // Single interaction mode
        const result = await agent.run(
          'I want to add 5 and 3, then multiply the result by 2',
          adapter
        );
        console.log('🤖 Agent Result:', result);
        console.log('\n📊 Memory Summary:');
        console.log(`- Total memories stored: ${agent.getMemoryCount()}`);

        const memories = agent.getMemory();
        console.log('- Memory contents:');
        memories.forEach(m => {
          console.log(`  [${m.type}] ${m.content}`);
        });
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    }
  });

program.parse();
