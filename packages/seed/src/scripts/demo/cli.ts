#!/usr/bin/env bun
import * as readline from 'readline';
import { DEFAULT_DEMO_CLASSES, DEFAULT_DEMO_COUNTS } from './generator';

// ─── ANSI helpers ────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  red:    '\x1b[31m',
  white:  '\x1b[97m',
  gray:   '\x1b[90m',
  bgBlue: '\x1b[44m',
};

const bold    = (s: string) => `${c.bold}${s}${c.reset}`;
const cyan    = (s: string) => `${c.cyan}${s}${c.reset}`;
const green   = (s: string) => `${c.green}${s}${c.reset}`;
const yellow  = (s: string) => `${c.yellow}${s}${c.reset}`;
const gray    = (s: string) => `${c.gray}${s}${c.reset}`;
const red     = (s: string) => `${c.red}${s}${c.reset}`;
const magenta = (s: string) => `${c.magenta}${s}${c.reset}`;
const blue    = (s: string) => `${c.blue}${s}${c.reset}`;
const dim     = (s: string) => `${c.dim}${s}${c.reset}`;

// ─── Prompt helper ───────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

async function askInt(question: string, defaultVal: number): Promise<number> {
  const raw = await ask(question);
  if (!raw) return defaultVal;
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 0) {
    process.stdout.write(`  ${red('✗')} Invalid number, using default ${yellow(String(defaultVal))}\n`);
    return defaultVal;
  }
  return n;
}

const ALL_CLASSES = ['PS','MS','GS','CP','CE1','CE2','CM1','CM2','CE6','1AC','2AC','3AC','TC','1BAC','2BAC'];
const DEFAULT_STUDENTS = DEFAULT_DEMO_COUNTS.students;
const DEFAULT_TEACHERS = DEFAULT_DEMO_COUNTS.teachers;
const DEFAULT_CLASSES = DEFAULT_DEMO_CLASSES;
const DEFAULT_CLASSES_ARG = DEFAULT_CLASSES.join(',');
const DEFAULT_CLASSES_LABEL = 'CP-3AC (9 classes)';

// Horizontal multi-checkbox picker.
// Controls: ← →  move · Space toggle · A all/none · Enter confirm · Esc cancel.
function askClassesCheckbox(label: string): Promise<string> {
  return new Promise((resolve) => {
    const selected = new Set<string>(DEFAULT_CLASSES);
    let cursor = 0;
    let linesDrawn = 0;

    const render = (first = false) => {
      if (!first) {
        // Move up and clear previous render
        for (let i = 0; i < linesDrawn; i++) {
          process.stdout.write('\x1b[1A\x1b[2K');
        }
      }

      const out: string[] = [];
      out.push(`  ${label}`);
      out.push(`  ${dim('← →  move  ·  Space  toggle  ·  A  all/none  ·  Enter  confirm')}`);

      const termCols = process.stdout.columns ?? 80;
      let line = '  ';
      let lineLen = 2;
      const items: string[] = [];

      ALL_CLASSES.forEach((name, i) => {
        const isChecked = selected.has(name);
        const mark = isChecked ? green('●') : gray('○');
        const label = i === cursor ? `${c.bold}${c.cyan}${name}${c.reset}` : (isChecked ? name : gray(name));
        const cell = `${mark} ${label}`;
        // Visible width ≈ 2 (mark+space) + name.length
        const visibleLen = 2 + name.length + 2; // +2 for spacing between cells
        if (lineLen + visibleLen > termCols) {
          items.push(line.trimEnd());
          line = '  ';
          lineLen = 2;
        }
        line += cell + '  ';
        lineLen += visibleLen;
      });
      if (line.trim()) items.push(line.trimEnd());

      out.push(...items);
      const chosen = selected.size === ALL_CLASSES.length
        ? yellow('all')
        : selected.size === 0
          ? red('none')
          : yellow([...selected].join(','));
      out.push(`  ${dim('Selected:')} ${chosen}`);

      const rendered = out.join('\n') + '\n';
      process.stdout.write(rendered);
      linesDrawn = rendered.split('\n').length - 1;
    };

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    // Temporarily detach any existing listeners (readline) so they don't consume keystrokes
    const prevDataListeners = stdin.listeners('data') as ((...a: any[]) => void)[];
    const prevKeypressListeners = stdin.listeners('keypress') as ((...a: any[]) => void)[];
    prevDataListeners.forEach(l => stdin.off('data', l));
    prevKeypressListeners.forEach(l => stdin.off('keypress', l));
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const finish = (result: string) => {
      stdin.removeListener('data', onData);
      if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
      // Restore previous listeners
      prevDataListeners.forEach(l => stdin.on('data', l));
      prevKeypressListeners.forEach(l => stdin.on('keypress', l));
      resolve(result);
    };

    const onData = (key: string) => {
      if (key === '\u0003' || key === '\u001b') { // Ctrl+C or Esc
        render();
        finish('ALL');
        return;
      }
      if (key === '\r' || key === '\n') {
        render();
        if (selected.size === 0 || selected.size === ALL_CLASSES.length) finish('ALL');
        else finish([...selected].join(','));
        return;
      }
      if (key === ' ') {
        const name = ALL_CLASSES[cursor];
        if (selected.has(name)) selected.delete(name); else selected.add(name);
      } else if (key.toLowerCase() === 'a') {
        if (selected.size === ALL_CLASSES.length) selected.clear();
        else ALL_CLASSES.forEach(n => selected.add(n));
      } else if (key === '\u001b[C' || key.toLowerCase() === 'l') { // right
        cursor = (cursor + 1) % ALL_CLASSES.length;
      } else if (key === '\u001b[D' || key.toLowerCase() === 'h') { // left
        cursor = (cursor - 1 + ALL_CLASSES.length) % ALL_CLASSES.length;
      } else if (key === '\u001b[A' || key === '\u001b[B') { // up/down — cycle
        cursor = (cursor + (key === '\u001b[A' ? -1 : 1) + ALL_CLASSES.length) % ALL_CLASSES.length;
      } else {
        return; // ignore
      }
      render();
    };

    stdin.on('data', onData);
    render(true);
  });
}

// ─── Banner ──────────────────────────────────────────────────────────────────
function banner() {
  console.log();
  console.log(`  ${c.bold}${c.cyan}╔══════════════════════════════════════╗${c.reset}`);
  console.log(`  ${c.bold}${c.cyan}║${c.reset}  ${c.bold}${c.white}🏫  SMS Demo Data Generator${c.reset}         ${c.bold}${c.cyan}║${c.reset}`);
  console.log(`  ${c.bold}${c.cyan}╚══════════════════════════════════════╝${c.reset}`);
  console.log();
}

function separator() {
  console.log(`  ${gray('──────────────────────────────────────')}`);
}

// ─── Summary box ─────────────────────────────────────────────────────────────
function summary(opts: {
  students: number;
  teachers: number;
  expenses: number;
  classes: string;
}) {
  console.log();
  separator();
  console.log(`  ${bold('📋  Generation Summary')}`);
  separator();
  console.log(`  ${cyan('👨‍🎓')}  Students  ${gray('→')}  ${bold(yellow(String(opts.students)))} ${gray('(total)')}`);
  console.log(`  ${magenta('👩‍🏫')}  Teachers  ${gray('→')}  ${bold(yellow(String(opts.teachers === 0 ? 'auto' : opts.teachers)))}`);
  console.log(`  ${green('💸')}  Expenses  ${gray('→')}  ${bold(yellow(String(opts.expenses === 0 ? 'auto (monthly)' : opts.expenses)))}`);
  const classesLabel = opts.classes === 'ALL'
    ? 'all 15'
    : opts.classes === DEFAULT_CLASSES_ARG
      ? DEFAULT_CLASSES_LABEL
      : opts.classes;
  console.log(`  ${blue('🏫')}  Classes   ${gray('→')}  ${bold(yellow(classesLabel))}`);
  separator();
  console.log();
}

// ─── Confirm ─────────────────────────────────────────────────────────────────
async function confirm(message: string): Promise<boolean> {
  const ans = await ask(`  ${message} ${gray('[Y/n]')} `);
  return ans === '' || ans.toLowerCase() === 'y';
}

// ─── Flag parser ─────────────────────────────────────────────────────────────
function readFlagRaw(long: string, short?: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const eq = args[i].match(new RegExp(`^--${long}=(.+)$`));
    if (eq) return eq[1];
    if (args[i] === `--${long}` && args[i + 1]) return args[i + 1];
    if (short && args[i] === `-${short}` && args[i + 1]) return args[i + 1];
  }
  return undefined;
}

function readFlag(long: string, short?: string): number | undefined {
  const raw = readFlagRaw(long, short);
  if (raw === undefined) return undefined;
  const n = parseInt(raw, 10);
  return isNaN(n) ? undefined : n;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  banner();

  const flagStudents = readFlag('students', 's');
  const flagTeachers = readFlag('teachers', 't');
  const flagExpenses = readFlag('expenses', 'e');
  const flagClasses  = readFlagRaw('classes', 'c');
  const advancedCounts = {
    announcements: readFlag('announcements') ?? DEFAULT_DEMO_COUNTS.announcements,
    events: readFlag('events') ?? DEFAULT_DEMO_COUNTS.events,
    assessments: readFlag('assessments') ?? DEFAULT_DEMO_COUNTS.assessments,
    exams: readFlag('exams') ?? DEFAULT_DEMO_COUNTS.exams,
    grades: readFlag('grades') ?? DEFAULT_DEMO_COUNTS.grades,
    alerts: readFlag('alerts') ?? DEFAULT_DEMO_COUNTS.alerts,
    disciplineIncidents: readFlag('disciplineIncidents') ?? DEFAULT_DEMO_COUNTS.disciplineIncidents,
    behaviorRewards: readFlag('behaviorRewards') ?? DEFAULT_DEMO_COUNTS.behaviorRewards,
    payrollPeriods: readFlag('payrollPeriods') ?? DEFAULT_DEMO_COUNTS.payrollPeriods,
    vehicleAssignments: readFlag('vehicleAssignments') ?? DEFAULT_DEMO_COUNTS.vehicleAssignments,
    studentRoutes: readFlag('studentRoutes') ?? DEFAULT_DEMO_COUNTS.studentRoutes,
    refuels: readFlag('refuels') ?? DEFAULT_DEMO_COUNTS.refuels,
    maintenance: readFlag('maintenance') ?? DEFAULT_DEMO_COUNTS.maintenance,
    staff: readFlag('staff') ?? DEFAULT_DEMO_COUNTS.staff,
  };
  const nonInteractive =
    !process.stdin.isTTY ||
    flagStudents !== undefined ||
    flagTeachers !== undefined ||
    flagExpenses !== undefined ||
    flagClasses  !== undefined ||
    Object.entries(advancedCounts).some(([key, value]) =>
      value !== DEFAULT_DEMO_COUNTS[key as keyof typeof DEFAULT_DEMO_COUNTS]
    );

  let students: number;
  let teachers: number;
  let expenses: number;
  let classes:  string;

  if (nonInteractive) {
    if (!process.stdin.isTTY && flagStudents === undefined && flagTeachers === undefined && flagExpenses === undefined && flagClasses === undefined) {
      console.log(`  ${yellow('⚠')}  Non-TTY stdin detected — pass flags to control values:`);
      console.log(`     ${dim('--students N  --teachers N  --expenses N  --classes CP,CE1')}\n`);
    }
    students = flagStudents ?? DEFAULT_STUDENTS;
    teachers = flagTeachers ?? DEFAULT_TEACHERS;
    expenses = flagExpenses ?? 0;
    classes  = flagClasses  ?? DEFAULT_CLASSES_ARG;
  } else {
    console.log(`  ${dim('Configure how many records to generate.')}`);
    console.log(`  ${dim('Press Enter to accept the default value.')}`);
    console.log();

    students = await askInt(
      `  ${cyan('👨‍🎓')}  Total students       ${gray(`(default ${DEFAULT_STUDENTS})`)}:  `,
      DEFAULT_STUDENTS,
    );
    // Pause readline while the checkbox takes raw control of stdin
    rl.pause();
    classes = await askClassesCheckbox(`${blue('🏫')}  Classes`);
    rl.resume();
    teachers = await askInt(
      `  ${magenta('👩‍🏫')}  Teachers limit       ${gray(`(default ${DEFAULT_TEACHERS})`)}:  `,
      DEFAULT_TEACHERS,
    );
    expenses = await askInt(
      `  ${green('💸')}  Expenses count       ${gray('(default auto)')}:  `,
      0,
    );
  }

  summary({ students, teachers, expenses, classes });

  const ok = nonInteractive ? true : await confirm(`${bold('🚀  Start generation?')}`);
  if (!ok) {
    rl.close();
    console.log(`\n  ${red('✗')}  Cancelled.\n`);
    process.exit(0);
  }

  console.log();

  rl.close();

  // ── Run pipeline: reset → seed ────────────────────────────────────────────
  const ENV_FILE = '--env-file=../../apps/dashboard/.env.local';

  const steps = [
    {
      label: '🗑️   Clearing existing data',
      cmd:   ['bun', ENV_FILE, 'src/scripts/demo/reset-demo.ts'],
    },
    {
      label: '🌱  Seeding database',
      cmd:   ['bun', ENV_FILE, 'src/scripts/demo/seed-demo.ts',
               '--students', String(students),
               '--teachers',  String(teachers),
               '--expenses',  String(expenses),
               '--classes',   classes,
               '--announcements', String(advancedCounts.announcements),
               '--events', String(advancedCounts.events),
               '--assessments', String(advancedCounts.assessments),
               '--exams', String(advancedCounts.exams),
               '--grades', String(advancedCounts.grades),
               '--alerts', String(advancedCounts.alerts),
               '--disciplineIncidents', String(advancedCounts.disciplineIncidents),
               '--behaviorRewards', String(advancedCounts.behaviorRewards),
               '--payrollPeriods', String(advancedCounts.payrollPeriods),
               '--vehicleAssignments', String(advancedCounts.vehicleAssignments),
               '--studentRoutes', String(advancedCounts.studentRoutes),
               '--refuels', String(advancedCounts.refuels),
               '--maintenance', String(advancedCounts.maintenance),
               '--staff', String(advancedCounts.staff)],
    },
  ];

  for (const step of steps) {
    console.log(`\n  ${bold(step.label)}${gray('...')}\n`);
    separator();

    const proc = Bun.spawn(step.cmd, { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' });
    const code = await proc.exited;

    if (code !== 0) {
      console.log(`\n  ${red('✗')}  Failed at: ${step.label}\n`);
      process.exit(code);
    }
  }

  console.log();
  separator();
  console.log(`  ${bold(green('✨  All done! Database is ready.'))}`);
  separator();
  console.log();
}

main();
