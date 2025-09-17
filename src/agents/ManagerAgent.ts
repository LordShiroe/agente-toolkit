import { Agent } from '../agent';
import { MemoryManager } from '../memory';
import { createAgentTool } from '../tools/AgentTool';
import { CalculatorAgent } from './CalculatorAgent';
import { WeatherAgent } from './WeatherAgent';
import { ModelAdapter } from '../adapters/base';

export class ManagerAgent extends Agent {
  constructor(adapter: ModelAdapter, memoryManager?: MemoryManager) {
    super(memoryManager);

    this.setPrompt(
      'You are a manager agent. Decide which specialized agent (calculator or weather) should handle the user request. Use the appropriate tool to delegate.'
    );

    // Compose sub-agents
    const calc = new CalculatorAgent(memoryManager);
    const weather = new WeatherAgent(memoryManager);

    this.addTool(
      createAgentTool(
        'use_calculator_agent',
        'Delegate arithmetic or numeric tasks to the calculator agent',
        calc,
        adapter
      )
    );

    this.addTool(
      createAgentTool(
        'use_weather_agent',
        'Delegate weather-related questions to the weather agent',
        weather,
        adapter
      )
    );
  }
}
