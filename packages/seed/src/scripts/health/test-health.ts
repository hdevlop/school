#!/usr/bin/env bun

import { Service } from '@server/najm';
import { HealthService } from '@server/modules/health/HealthService';
import { runSeed } from '../shared/run-seed';

@Service()
class HealthSeed {
  constructor(private healthService: HealthService) {}

  async onInit() {
    console.log('🩺 Testing HealthService without starting an HTTP port...');

    const health = await this.healthService.getHealth();
    const status = await this.healthService.getStatus();
    const ping = await this.healthService.ping();

    console.log(`HealthService.getHealth(): ${health}`);
    console.log(`HealthService.getStatus(): ${status}`);
    console.log(`HealthService.ping(): ${ping}`);

    if (!(health === status && status === ping)) {
      throw new Error('HealthService methods did not return the same message');
    }

    console.log('\n✨ HealthService works correctly with server.init() only.');
  }
}

runSeed('health test', HealthSeed);
