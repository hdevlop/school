import { Controller, Post, ResMsg, Body, User } from '../../najm';
import { isAdministrator } from '../../auth';
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
  async seedDemo(@Body() body: SeedDemoOptions, @User() user: { id: string; role: string }) {
    await this.seedService.seedDemo(body, user);
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
