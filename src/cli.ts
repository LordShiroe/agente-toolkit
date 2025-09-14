#!/usr/bin/env node

import readline from 'readline';
import { Command } from 'commander';
import { Agent } from './agent';
import { ModelAdapter } from './adapters/base';
import { SlidingWindowMemoryManager } from './memory';
import { CalculatorAgent } from './agents/CalculatorAgent';
import { WeatherAgent } from './agents/WeatherAgent';

const program = new Command();

// Available agents registry
const AVAILABLE_AGENTS = {
  calculator: {
    name: 'Calculator Agent',
    description: 'Performs arithmetic calculations',
    class: CalculatorAgent,
  },
  weather: {
    name: 'Weather Agent',
    description: 'Provides weather information for any location',
    class: WeatherAgent,
  },
};

type AgentType = keyof typeof AVAILABLE_AGENTS;

function displayAgentMenu(): void {
  console.log('\n🤖 Available AI Agents:');
  console.log('='.repeat(40));

  Object.entries(AVAILABLE_AGENTS).forEach(([key, info], index) => {
    console.log(`${index + 1}. ${info.name}`);
    console.log(`   ${info.description}`);
    console.log('');
  });
}

function promptAgentSelection(): Promise<AgentType> {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const agentKeys = Object.keys(AVAILABLE_AGENTS) as AgentType[];

    const askSelection = () => {
      rl.question(`Select an agent (1-${agentKeys.length}): `, answer => {
        const selection = parseInt(answer.trim());

        if (selection >= 1 && selection <= agentKeys.length) {
          const selectedAgent = agentKeys[selection - 1];
          console.log(`\n✅ Selected: ${AVAILABLE_AGENTS[selectedAgent].name}\n`);
          rl.close();
          resolve(selectedAgent);
        } else {
          console.log('❌ Invalid selection. Please try again.');
          askSelection();
        }
      });
    };

    askSelection();
  });
}

program.name('agente-toolkit').description('CLI for Agente Toolkit agent').version('1.0.0');

program
  .command('chat')
  .description('Start a chat session with an AI agent')
  .option('-k, --api-key <key>', 'Anthropic API key')
  .option('-r, --provider <provider>', 'Model provider to use (claude|openai|ollama)', 'claude')
  .option('-m, --model <model>', 'Preferred model to override adapter default')
  .option('--memory-size <size>', 'Maximum number of memories to keep', '30')
  .action(async options => {
    if (!options.apiKey) {
      console.error('❌ API key is required. Use -k or --api-key');
      process.exit(1);
    }

    // Display agent menu and get user selection
    displayAgentMenu();
    const selectedAgentType = await promptAgentSelection();

    // Create memory manager with custom size if specified
    const memorySize = parseInt(options.memorySize) || 30;
    const memoryManager = new SlidingWindowMemoryManager(memorySize);

    // Instantiate the selected agent
    const AgentClass = AVAILABLE_AGENTS[selectedAgentType].class;
    const agent = new AgentClass(memoryManager);

    try {
      let adapter: ModelAdapter;
      if (options.provider === 'claude') {
        const { ClaudeAdapter } = await import('./adapters/claudeAdapter');
        adapter = new ClaudeAdapter(options.apiKey, options.model);
      } else {
        console.error('❌ Provider not supported in this demo. Use --provider claude');
        process.exit(1);
      }

      console.log(
        `🤖 Chat session started with ${AVAILABLE_AGENTS[selectedAgentType].name}. Type "exit" to quit, "memory" to see memory stats.`
      );
      console.log(`📊 Memory Manager: Max ${memorySize} memories\n`);

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
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    }
  });

program.parse();
