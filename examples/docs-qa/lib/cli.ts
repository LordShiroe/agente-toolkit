import { Command } from 'commander';

export interface CLIOptions {
  question?: string;
}

export function getOptions(argv: string[] = process.argv.slice(2)): CLIOptions {
  const program = new Command();

  program
    .name('DocsAssistantAgent Example')
    .description('Run the RAG-powered documentation assistant (OpenAI only)')
    .option('-q, --question <text>', 'Question to ask (if omitted, runs demo questions)');

  program.parse(argv);
  const opts = program.opts<{ question?: string }>();

  return {
    question: opts.question,
  };
}
