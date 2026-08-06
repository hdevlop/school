#!/usr/bin/env bun

import { runSeedTask } from '../shared/run-seed';

runSeedTask('staff backfill', async () => {
  console.log('ℹ️ Staff backfill is handled by the Phase D migration. No seed action needed.');
});
