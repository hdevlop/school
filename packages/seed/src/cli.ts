import { cancel, isCancel, select } from '@clack/prompts';

const production = process.env.NODE_ENV === 'production';
const help = `School seed commands:
  bun seed                 ${production ? 'Prompt for administrator in a terminal' : 'Choose a command in a terminal'}
  bun seed admin           Create or reset the administrator
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

  if (production) {
    command = 'admin';
  } else {
    const choice = await select({
      message: 'Choose a School seed command',
      options: [
        { value: 'admin', label: 'Create or reset administrator' },
        { value: 'demo-ui', label: 'Open development demo generator' },
      ],
    });
    if (isCancel(choice)) {
      cancel('Seed cancelled; no data was changed.');
      process.exit(0);
    }
    command = choice;
  }
}

switch (command) {
  case 'admin':
    await import('./scripts/admin/seed-admin');
    break;
  case 'demo-ui':
    if (production) throw new Error('The demo generator is unavailable in production.');
    await import('./scripts/demo/cli');
    break;
  default:
    console.error(`Unknown seed command: ${command}\n${help}`);
    process.exit(1);
}
