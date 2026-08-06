import { Controller, Post, ResMsg, Body } from '@server/najm';
import { isAdministrator } from '@server/auth';
import { SeedService } from './SeedService';

interface SeedDemoOptions {
  students?: number;
  teachers?: number;
}

@Controller('/seed')
export class SeedController {
  constructor(private seedService: SeedService) {}

  @Post('/demo')
  @isAdministrator()
  @ResMsg('settings.seed.success')
  async seedDemo(@Body() body: SeedDemoOptions) {
    await this.seedService.seedDemo(body);
    return { seeded: true };
  }

  @Post('/system')
  @isAdministrator()
  @ResMsg('settings.system.success')
  async seedSystem() {
    await this.seedService.seedSystem();
    return { seeded: true };
  }

  @Post('/clear')
  @isAdministrator()
  @ResMsg('settings.clear.success')
  async clearAllData() {
    await this.seedService.clearAllData();
    return { cleared: true };
  }
}
