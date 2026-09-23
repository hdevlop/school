import { cancel, confirm, isCancel, select } from '@clack/prompts';

const production = process.env.NODE_ENV === 'production';
const help = `School seed commands:
  bun seed                 Choose a command in a terminal
  bun seed admin           Create or reset the administrator
  bun seed demo            Add demo data
  bun seed reset-demo      Delete all school data
  bun run seed:admin       Create or reset the administrator
${production ? '' : '  bun seed demo-ui         Open the development demo generator\n'}`;

let command = process.argv[2];
if (command === '--help' || command === '-h') {
  console.log(help);
  process.exit(0);
}

if (!command) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.log(help);
    process.exit(0);
  }

  const choice = await select({
    message: 'Choose a School seed command',
    options: [
      { value: 'admin', label: 'Create or reset administrator' },
      { value: 'demo', label: 'Add demo data' },
      { value: 'reset-demo', label: 'Delete all school data', hint: 'destructive' },
      ...(!production ? [{ value: 'demo-ui', label: 'Open development demo generator' }] : []),
    ],
  });
  if (isCancel(choice)) {
    cancel('Seed cancelled; no data was changed.');
    process.exit(0);
  }
  command = choice;
}

switch (command) {
  case 'admin':
    await import('./scripts/admin/seed-admin');
    break;
  case 'demo':
    await import('./scripts/demo/seed-demo');
    break;
  case 'reset-demo': {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error('Demo reset requires an interactive terminal.');
    }
    const confirmed = await confirm({
      message: 'Delete all school data? This cannot be undone.',
      initialValue: false,
    });
    if (isCancel(confirmed) || !confirmed) {
      cancel('Seed cancelled; no data was changed.');
      process.exit(0);
    }
    await import('./scripts/demo/reset-demo');
    break;
  }
  case 'demo-ui':
    if (production) throw new Error('The demo generator is unavailable in production.');
    await import('./scripts/demo/cli');
    break;
  default:
    console.error(`Unknown seed command: ${command}\n${help}`);
    process.exit(1);
}
