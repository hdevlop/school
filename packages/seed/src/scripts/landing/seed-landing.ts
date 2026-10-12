#!/usr/bin/env bun
import { seedSchoolLanding } from '@sms/server/landing-seed';

if (!process.env.DB_URL && !process.env.DATABASE_URL) {
  console.error('Landing seed requires DB_URL.');
  process.exit(1);
}
try {
  const initialized = await seedSchoolLanding();
  console.log(initialized ? 'Landing defaults initialized.' : 'Landing content already exists; preserved without changes.');
  process.exit(0);
} catch (error) {
  console.error('Landing seed failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
