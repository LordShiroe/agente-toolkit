import { Agent } from '../agent';
import { MemoryManager } from '../memory';
import { createAgentTool } from '../tools/AgentTool';
import { ModelAdapter } from '../adapters/base';
import { getAvailableAgents, findAgentsByCategory, registerAgent } from '../agentRegistry';
import { AgentRegistration } from '../types/AgentMetadata';

export interface ManagerAgentOptions {
  /**
   * Optional filter to only include agents from specific categories
   */
  allowedCategories?: string[];

  /**
   * Maximum number of agents to register as tools (default: 10)
   */
  maxAgents?: number;

  /**
   * Custom prompt override
   */
  customPrompt?: string;

  /**
   * Whether to include detailed capability information in prompts
   */
  includeDetailedCapabilities?: boolean;
}

export class ManagerAgent extends Agent {
  constructor(
    adapter: ModelAdapter,
    memoryManager?: MemoryManager,
    options: ManagerAgentOptions = {}
  ) {
    super(memoryManager);

    const {
      allowedCategories,
      maxAgents = 10,
      customPrompt,
      includeDetailedCapabilities = true,
    } = options;

    // Discover available agents
    let availableAgents = getAvailableAgents();

    // Filter by categories if specified
    if (allowedCategories && allowedCategories.length > 0) {
      const filteredAgents = new Set<string>();
      for (const category of allowedCategories) {
        const categoryAgents = findAgentsByCategory(category);
        categoryAgents.forEach(({ name }) => filteredAgents.add(name));
      }
      availableAgents = availableAgents.filter(({ name }) => filteredAgents.has(name));
    }

    // Limit the number of agents
    availableAgents = availableAgents.slice(0, maxAgents);

    // Create detailed agent descriptions for the prompt
    const agentDescriptions = availableAgents
      .map(({ registration }) => {
        const { metadata, capabilities } = registration;

        let description = `- **${metadata.name}** (${metadata.categories.join(', ')}):\n  ${
          metadata.description
        }`;

        if (includeDetailedCapabilities) {
          // Add keywords for context
          if (metadata.keywords.length > 0) {
            description += `\n  Keywords: ${metadata.keywords.join(', ')}`;
          }

          // Add task types
          if (capabilities.taskTypes.length > 0) {
            description += `\n  Handles: ${capabilities.taskTypes.join(', ')}`;
          }

          // Add examples (limit to 3 for brevity)
          if (capabilities.examples.length > 0) {
            const exampleList = capabilities.examples.slice(0, 3).join('", "');
            description += `\n  Examples: "${exampleList}"`;
            if (capabilities.examples.length > 3) {
              description += ` and ${capabilities.examples.length - 3} more...`;
            }
          }

          // Add limitations
          if (capabilities.limitations && capabilities.limitations.length > 0) {
            description += `\n  Limitations: ${capabilities.limitations.join(', ')}`;
          }
        }

        return description;
      })
      .join('\n\n');

    // Create keyword mapping for the prompt to help with routing decisions
    const keywordMap = availableAgents
      .map(({ registration }) => {
        const keywords = registration.metadata.keywords.join(', ');
        return `${registration.metadata.name}: ${keywords}`;
      })
      .join('\n');

    // Set the prompt
    const defaultPrompt =
      availableAgents.length > 0
        ? `You are an intelligent manager agent that coordinates with specialized agents to handle user requests. Your job is to analyze user requests and delegate to the most appropriate specialized agent.

## Available Agents:

${agentDescriptions}

## Routing Guidelines:

Use the keywords, task types, and examples above to determine which agent is best suited for each request. Consider:
1. **Keywords**: Match user request terms with agent keywords
2. **Task Types**: Identify what type of task the user is asking for
3. **Examples**: Compare the user's request to the provided examples
4. **Limitations**: Avoid delegating tasks that agents explicitly cannot handle

## Agent-Keyword Quick Reference:
${keywordMap}

When you receive a request, analyze it against these criteria and delegate to the most appropriate specialized agent using the available tools. If no agent seems suitable, explain why and suggest alternatives.`
        : 'You are a manager agent, but no specialized agents are currently available. Please inform the user that no agents are registered to handle their request.';

    this.setPrompt(customPrompt || defaultPrompt);

    // Create tools for each available agent with enhanced descriptions
    for (const { name, agent, registration } of availableAgents) {
      const toolName = `use_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_agent`;

      // Create enhanced tool description using capabilities
      const { metadata, capabilities } = registration;
      let toolDescription = `Delegate to ${metadata.name}: ${metadata.description}`;

      // Add task types and key examples to tool description
      if (capabilities.taskTypes.length > 0) {
        toolDescription += ` Handles: ${capabilities.taskTypes.slice(0, 3).join(', ')}.`;
      }

      if (capabilities.examples.length > 0) {
        toolDescription += ` Best for requests like: "${capabilities.examples[0]}"`;
      }

      // Add keyword hints
      const topKeywords = metadata.keywords.slice(0, 5).join(', ');
      toolDescription += ` Keywords: ${topKeywords}`;

      this.addTool(createAgentTool(toolName, toolDescription, agent, adapter));
    }
  }

  /**
   * Static method to create a ManagerAgent with specific agents pre-registered
   */
  static withAgents(
    adapter: ModelAdapter,
    agents: Array<{
      name: string;
      agent: Agent;
      registration?: AgentRegistration;
    }>,
    memoryManager?: MemoryManager,
    options: ManagerAgentOptions = {}
  ): ManagerAgent {
    // First, register all provided agents

    for (const { name, agent, registration } of agents) {
      registerAgent(name, agent, registration);
    }

    // Then create the manager agent
    return new ManagerAgent(adapter, memoryManager, options);
  }
}
