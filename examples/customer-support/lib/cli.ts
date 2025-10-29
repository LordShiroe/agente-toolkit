import { Command } from 'commander';

export interface CLIOptions {
  question?: string;
  agent?: 'product' | 'billing' | 'returns' | 'auto';
}

export function getOptions(): CLIOptions {
  const program = new Command();

  program
    .name('Customer Support Demo')
    .description('Multi-agent customer support system with shared knowledge sources')
    .argument('[question]', 'Customer question to ask')
    .option(
      '-a, --agent <type>',
      'Route to specific agent: product, billing, returns, or auto (default: auto)',
      'auto'
    )
    .helpOption('-h, --help', 'Show help');

  program.parse(process.argv);

  const args = program.args;
  const opts = program.opts<{ agent: string }>();

  return {
    question: args[0],
    agent: opts.agent as CLIOptions['agent'],
  };
}
