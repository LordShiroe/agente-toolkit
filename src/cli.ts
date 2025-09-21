#!/usr/bin/env node

import readline from 'readline';
import { Command } from 'commander';
import { Agent } from './agent';
import { ModelAdapter } from './adapters/base';
import { SlidingWindowMemoryManager } from './memory';
import { CalculatorAgent } from './agents/CalculatorAgent';
import { WeatherAgent } from './agents/WeatherAgent';
import { ManagerAgent } from './agents/ManagerAgent';
import { registerAgent, clearRegistry } from './agentRegistry';
import { createHandoffTool } from './tools/HandoffTool';
import { initializeLogger, getLogger } from './logger';

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

  Object.entries(AVAILABLE_AGENTS).forEach(([_key, info], index) => {
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
  .option('-v, --verbose', 'Enable verbose logging for debugging')
  .option('--mode <mode>', 'Orchestration mode (single|manager|decentralized)', 'single')
  .option('--max-steps <n>', 'Max steps per run (safety ceiling)', (v: string) => parseInt(v, 10))
  .option('--timeout-ms <ms>', 'Max duration per run in milliseconds', (v: string) =>
    parseInt(v, 10)
  )
  .option('--stop-on-error', 'Stop execution on first tool error')
  .action(async options => {
    // Initialize logger based on verbose option
    initializeLogger({
      level: options.verbose ? 'debug' : 'info',
      verbose: options.verbose || false,
      enableFileLogging: options.verbose,
    });

    const logger = getLogger();

    if (!options.apiKey) {
      console.error('❌ API key is required. Use -k or --api-key');
      process.exit(1);
    }

    if (options.verbose) {
      logger.info('Verbose mode enabled - detailed logging will be shown');
    }

    let selectedAgentType: AgentType | undefined;
    if (options.mode === 'single') {
      // Display agent menu and get user selection only in single mode
      displayAgentMenu();
      selectedAgentType = await promptAgentSelection();
    }

    // Create memory manager with custom size if specified
    const memorySize = parseInt(options.memorySize) || 30;
    const memoryManager = new SlidingWindowMemoryManager(memorySize);

    // We will instantiate the agent after selecting provider/model (adapter-aware)
    let agent: Agent;

    try {
      let adapter: ModelAdapter;
      if (options.provider === 'claude') {
        const { ClaudeAdapter } = await import('./adapters/claudeAdapter');
        adapter = new ClaudeAdapter(options.apiKey, options.model);
      } else {
        console.error('❌ Provider not supported in this demo. Use --provider claude');
        process.exit(1);
      }

      // Instantiate agent(s) based on orchestration mode
      if (options.mode === 'manager') {
        // Register the agents with their metadata in the registry first
        const calc = new CalculatorAgent(memoryManager);
        const weather = new WeatherAgent(memoryManager);

        registerAgent('calculator', calc, CalculatorAgent.metadata);
        registerAgent('weather', weather, WeatherAgent.metadata);

        agent = new ManagerAgent(adapter, memoryManager);
        logger.logAgentStart('Manager Agent');
      } else if (options.mode === 'decentralized') {
        clearRegistry();
        const calc = new CalculatorAgent(memoryManager);
        const weather = new WeatherAgent(memoryManager);
        registerAgent('calculator', calc, CalculatorAgent.metadata);
        registerAgent('weather', weather, WeatherAgent.metadata);

        agent = new Agent(memoryManager);
        agent.setPrompt(
          'You are a router. Decide whether to hand off to the calculator or weather agent by calling the handoff_to_agent tool with the proper targetAgent.'
        );
        agent.addTool(createHandoffTool(adapter));
        logger.logAgentStart('Router Agent (Decentralized)');
      } else if (options.mode === 'single') {
        if (!selectedAgentType) {
          console.error('❌ No agent selected.');
          process.exit(1);
        }
        const AgentClass = AVAILABLE_AGENTS[selectedAgentType].class;
        agent = new AgentClass(memoryManager);
        logger.logAgentStart(AVAILABLE_AGENTS[selectedAgentType].name);
      } else {
        console.error(`❌ Unknown mode: ${options.mode}`);
        process.exit(1);
      }

      console.log(`🤖 Chat session started. Type "exit" to quit, "memory" to see memory stats.`);
      console.log(`📊 Memory Manager: Max ${memorySize} memories\n`);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const askQuestion = () => {
        rl.question('You: ', async (input: string) => {
          if (input.toLowerCase() === 'exit') {
            logger.logAgentEnd();
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
            // Build run options from CLI flags
            const runOptions = {
              maxSteps: options.maxSteps,
              maxDurationMs: options.timeoutMs,
              stopOnFirstToolError: !!options.stopOnError,
            };

            const result = await agent.run(input, adapter, runOptions);
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
