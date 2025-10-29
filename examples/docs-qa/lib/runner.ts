import chalk from 'chalk';
import { DocsAssistantAgent } from '../agent/DocsAssistantAgent';
import type { LLMAdapter } from './adapters';

export async function runSingleQuestion(adapter: LLMAdapter, question: string): Promise<void> {
  const agent = new DocsAssistantAgent();

  console.log(chalk.bold(`\n📝 Question: ${question}`));
  console.log(chalk.gray('─'.repeat(80)));

  const start = Date.now();
  const answer = await agent.run(question, adapter);
  const duration = Date.now() - start;

  console.log(chalk.green('\n💡 Answer:'));
  console.log(answer);

  const sources = agent.getLastRetrievedSources();
  if (sources.length > 0) {
    console.log(chalk.cyan('\n📚 Sources Used:'));
    sources.forEach((doc, idx) => {
      const citation = idx + 1;
      const location = doc.metadata?.heading
        ? `${doc.metadata.path} › ${doc.metadata.heading}`
        : doc.metadata?.path || 'unknown';
      console.log(chalk.gray(`  [${citation}] ${location}`));
    });
  }

  console.log(chalk.gray(`\n⏱️  Response time: ${duration}ms`));
  console.log(chalk.gray('─'.repeat(80)));
}

export async function runDemo(adapter: LLMAdapter): Promise<void> {
  console.log(chalk.cyan('\n🤖 Initializing DocsAssistantAgent...'));

  const demoQuestions = [
    'What is TransformersEmbedder and how do I use it?',
    'How do I configure RAG for an agent?',
    'What are the available LLM adapters?',
  ];

  console.log(chalk.cyan('\n📚 Running demo with sample questions...\n'));

  for (const q of demoQuestions) {
    await runSingleQuestion(adapter, q);
    await new Promise(r => setTimeout(r, 300));
  }
}
