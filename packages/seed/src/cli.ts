import { cancel, confirm, isCancel, multiselect, select, text as promptText } from '@clack/prompts';
import { getConfiguredSeedAcademicYear, getSeedAcademicYear, parseSeedAcademicYear } from './scripts/shared/academic-year';

const production = process.env.NODE_ENV === 'production';
const help = `School seed commands:
  bun seed                 Choose a command in a terminal
  bun seed admin           Create or reset the administrator
  bun seed demo            Choose a year and add demo data
  bun seed demo --year=2025-2026  Add demo data for one year without a prompt
  bun seed demo --year=2025-2026 --resume-from=announcements  Resume after Payroll
  bun seed history         Seed the last 3 years up to today; the same students move up each year
  bun seed history --years=4  Seed a longer history
  bun seed academic        Add the default classes, sections A-C, subjects and fee types for a year
  bun seed academic --year=2026-2027 --levels=maternelle,primaire,college  Without a prompt
  bun seed reset-demo      Delete school data; classes, sections, subjects and fee types stay
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
      { value: 'history', label: 'Seed 3 years of demo history', hint: 'empty school, students promoted each year' },
      { value: 'academic', label: 'Add classes, sections, subjects and fee types', hint: 'default Moroccan levels; no people' },
      { value: 'reset-demo', label: 'Delete school data', hint: 'destructive; keeps classes, sections, subjects and fee types' },
      ...(!production ? [{ value: 'demo-ui', label: 'Open development demo generator' }] : []),
    ],
  });
  if (isCancel(choice)) {
    cancel('Seed cancelled; no data was changed.');
    process.exit(0);
  }
  command = choice;
}

const hasFlag = (name: string) => process.argv.slice(3).some((value) => value === name || value.startsWith(`${name}=`));
const interactive = () => process.stdin.isTTY && process.stdout.isTTY;

/** Adds `--year` from a prompt; `offsets` are the other years offered, relative to the current one. */
async function promptForYear(message: string, offsets: number[]) {
  const current = getSeedAcademicYear();
  const start = Number(current.slice(0, 4));
  const year = await select({
    message,
    options: [
      { value: current, label: `${current} (current teaching year)` },
      ...offsets.map((offset) => ({
        value: `${start + offset}-${start + offset + 1}`,
        label: `${start + offset}-${start + offset + 1}`,
      })),
      { value: 'custom', label: 'Enter another academic year' },
    ],
  });
  if (isCancel(year)) {
    cancel('Seed cancelled; no data was changed.');
    process.exit(0);
  }
  let chosenYear = year;
  if (year === 'custom') {
    const entered = await promptText({
      message: 'Academic year (YYYY-YYYY)',
      placeholder: current,
      validate: (value) => {
        try { parseSeedAcademicYear(value); return; }
        catch { return 'Enter consecutive years, for example 2025-2026'; }
      },
    });
    if (isCancel(entered)) {
      cancel('Seed cancelled; no data was changed.');
      process.exit(0);
    }
    chosenYear = parseSeedAcademicYear(entered);
  }
  process.argv.push(`--year=${chosenYear}`);
}

switch (command) {
  case 'admin':
    await import('./scripts/admin/seed-admin');
    break;
  case 'demo':
    if (!hasFlag('--year')) {
      if (!interactive()) {
        throw new Error('Demo seed requires --year=YYYY-YYYY without an interactive terminal.');
      }
      await promptForYear('Choose the academic year for demo data', [-1, -2, -3]);
    }
    console.log(`Demo academic year: ${getConfiguredSeedAcademicYear()}`);
    await import('./scripts/demo/seed-demo');
    break;
  case 'academic': {
    if (!hasFlag('--year')) {
      if (!interactive()) {
        throw new Error('Academic seed requires --year=YYYY-YYYY without an interactive terminal.');
      }
      await promptForYear('Choose the academic year for the classes', [1]);
    }
    if (!hasFlag('--levels') && interactive()) {
      const { ACADEMIC_LEVELS } = await import('./scripts/shared/academic-structure');
      const levels = await multiselect({
        message: 'Choose the levels this school teaches',
        options: ACADEMIC_LEVELS.map((level) => ({ value: level, label: level })),
        initialValues: ACADEMIC_LEVELS,
        required: true,
      });
      if (isCancel(levels)) {
        cancel('Seed cancelled; no data was changed.');
        process.exit(0);
      }
      process.argv.push(`--levels=${levels.join(',')}`);
    }
    await import('./scripts/school/seed-academic');
    break;
  }
  case 'history': {
    const { runHistorySeedCommand } = await import('./scripts/demo/seed-history');
    await runHistorySeedCommand(process.argv.slice(3));
    break;
  }
  case 'reset-demo': {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Error('Demo reset requires an interactive terminal.');
    }
    const confirmed = await confirm({
      message: 'Delete all school data except classes, sections, subjects and fee types? This cannot be undone.',
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
