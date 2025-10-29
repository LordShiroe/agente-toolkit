import chalk from 'chalk';
import { setupGlobalSources } from './lib/sources';
import { ProductSupportAgent } from './agents/ProductSupportAgent';
import { BillingSupportAgent } from './agents/BillingSupportAgent';
import { ReturnsAgent } from './agents/ReturnsAgent';
import { ManagerAgent } from './agents/ManagerAgent';
import { createOpenAIAdapter } from './lib/adapters';
import { getOptions } from './lib/cli';

async function main(): Promise<void> {
  console.log(chalk.bold('🎧 SmartHome Hub - Customer Support System\n'));

  const options = getOptions();

  // 1. Setup global sources ONCE (all agents will reference these)
  await setupGlobalSources();

  // 2. Create LLM adapter
  let adapter;
  try {
    adapter = createOpenAIAdapter();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n❌ ${message}`));
    console.log(chalk.yellow('\nTip: Set OPENAI_API_KEY environment variable:'));
    console.log(chalk.gray('  OPENAI_API_KEY=sk-... npx tsx examples/customer-support'));
    process.exit(1);
  }

  // 3. Get or generate question
  let question = options.question;

  if (!question) {
    // Demo mode with sample questions
    const demoQuestions = [
      'How do I reset my SmartHome Hub?',
      'Why was I charged twice this month?',
      'I want to return a defective device',
    ];
    console.log(chalk.cyan('📚 Running demo with sample questions...\n'));

    for (const q of demoQuestions) {
      await handleQuestion(q, options.agent || 'auto', adapter);
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(chalk.green('\n✅ Demo complete!\n'));
    return;
  }

  // Single question mode
  await handleQuestion(question, options.agent || 'auto', adapter);
  console.log(chalk.green('\n✅ Done!\n'));
}

async function handleQuestion(
  question: string,
  agentType: 'product' | 'billing' | 'returns' | 'auto',
  adapter: any
): Promise<void> {
  console.log(chalk.bold(`\n📝 Question: ${question}`));
  console.log(chalk.gray('─'.repeat(80)));

  const start = Date.now();
  let answer: string;

  if (agentType === 'auto') {
    // Use manager to auto-route
    const manager = new ManagerAgent();
    answer = await manager.run(question, adapter);
  } else {
    // Route to specific agent
    let agent;
    let agentName;

    switch (agentType) {
      case 'product':
        agent = new ProductSupportAgent();
        agentName = 'Product Support';
        break;
      case 'billing':
        agent = new BillingSupportAgent();
        agentName = 'Billing Support';
        break;
      case 'returns':
        agent = new ReturnsAgent();
        agentName = 'Returns Support';
        break;
      default:
        agent = new ProductSupportAgent();
        agentName = 'Product Support';
    }

    console.log(`  → Using: ${agentName}\n`);
    answer = await agent.run(question, adapter);
  }

  const duration = Date.now() - start;

  console.log(chalk.green('\n💡 Answer:'));
  console.log(answer);
  console.log(chalk.gray(`\n⏱️  Response time: ${duration}ms`));
  console.log(chalk.gray('─'.repeat(80)));
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exitCode = 1;
});
