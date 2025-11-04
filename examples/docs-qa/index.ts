import chalk from 'chalk';
import { getOptions } from './lib/cli';
import { createOpenAIAdapter } from './lib/adapters';
import { runDemo, runSingleQuestion } from './lib/runner';

async function main(): Promise<void> {
  const options = getOptions(process.argv.slice(2));

  console.log(chalk.bold('DocsAssistantAgent - RAG-Powered Documentation Assistant (OpenAI)\n'));

  let adapter;
  try {
    adapter = createOpenAIAdapter();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n❌ ${message}`));
    console.log(chalk.yellow('\nTip: Set the required API key environment variable:'));
    console.log(chalk.gray('  OPENAI_API_KEY=... npx tsx examples/docs-qa'));
    process.exit(1);
  }

  try {
    if (options.question) {
      await runSingleQuestion(adapter, options.question);
    } else {
      await runDemo(adapter);
    }

    console.log(chalk.green('\n✅ Done!\n'));
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exitCode = 1;
});
