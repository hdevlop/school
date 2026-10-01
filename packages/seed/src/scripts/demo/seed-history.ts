#!/usr/bin/env bun

import { join } from 'path';
import { eq } from 'drizzle-orm';
import { db } from '@sms/server/database';
import { roles, settings, users } from '@sms/server/database/schema';
import { getHistoryAcademicYears } from '../shared/academic-year';

// Several consecutive years of one school, ending with today's teaching year.
// The oldest year is seeded like a single demo year and installed as the
// active one; every later year promotes the same students (seed-next-year).
// Each year runs in its own process because the generator binds its year
// when it loads.

function readYearsArg(args: string[]) {
  const index = args.findIndex((arg) => arg === '--years' || arg.startsWith('--years='));
  if (index < 0) return 3;
  return Number(args[index] === '--years' ? args[index + 1] : args[index].slice('--years='.length));
}

// Counts and class selection reach every year; the year itself is ours to set.
function passThroughArgs(args: string[]) {
  const passed: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--years' || arg === '--year') { index++; continue; }
    if (arg.startsWith('--years=') || arg.startsWith('--year=')) continue;
    if (arg.startsWith('--resume-from')) throw new Error('The history seed cannot resume; reset the demo data and run it again');
    passed.push(arg);
  }
  return passed;
}

async function ensureFreshSchool() {
  const [installed] = await db.select({ id: settings.id }).from(settings).limit(1);
  if (installed) {
    throw new Error('School data already exists. Run bun seed reset-demo first; the history seed starts from an empty school');
  }
  const [admin] = await db.select({ id: users.id }).from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(roles.name, 'admin'))
    .limit(1);
  if (!admin) throw new Error('The history seed needs an administrator account: run bun seed admin first');
}

async function runYear(script: string, year: string, extra: string[]) {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, script), `--year=${year}`, ...extra], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: process.env,
  });
  const code = await child.exited;
  if (code !== 0) {
    throw new Error(`${year} failed (exit ${code}). Run bun seed reset-demo, then start the history seed again`);
  }
}

export async function runHistorySeed(args: string[]) {
  const years = getHistoryAcademicYears(readYearsArg(args));
  const passed = passThroughArgs(args);
  await ensureFreshSchool();

  console.log(`📚 Seeding ${years.length} school years: ${years.join(' → ')}\n`);
  const startedAt = performance.now();
  for (const [index, year] of years.entries()) {
    console.log(`\n━━━ ${year} (${index + 1}/${years.length}) ━━━`);
    if (index === 0) await runYear('seed-demo.ts', year, ['--history-start', ...passed]);
    else await runYear('seed-next-year.ts', year, passed);
  }
  const minutes = ((performance.now() - startedAt) / 60_000).toFixed(1);
  console.log(`\n✨ History seeded: ${years.join(', ')} in ${minutes} min; ${years.at(-1)} is the active year`);
}

export async function runHistorySeedCommand(args: string[]) {
  try {
    await runHistorySeed(args);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (import.meta.main) await runHistorySeedCommand(process.argv.slice(2));
