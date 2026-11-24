#!/usr/bin/env bun

import { RewardTemplateService, rewardTemplatesData } from '@sms/server/modules/seed';
import { runSeedTask } from '../shared/run-seed';

// Add the starter reward bank to an existing database. Additive only: a reward
// whose name already exists for its category and reward type is left as the
// school edited it, and nothing is removed.
await runSeedTask('reward bank', async (server) => {
  const rewardTemplateService = await server.container.resolve(RewardTemplateService);
  const added = await rewardTemplateService.seedDefaults(rewardTemplatesData);
  console.log(`✅ Reward bank: ${added.length} added, ${rewardTemplatesData.length - added.length} already there`);
});
