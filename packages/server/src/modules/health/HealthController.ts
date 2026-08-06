import { Controller, Get } from '@server/najm';
import { HealthService } from './HealthService';

@Controller('/health')
export class HealthController {
  constructor(
    private healthService: HealthService,
  ) {}

  @Get()
  async getHealth() {
    return {
      data: await this.healthService.getHealth(),
      message: 'Health service is working correctly',
      status: 'success',
    };
  }

  @Get('/status')
  async getStatus() {
    return {
      data: await this.healthService.getStatus(),
      message: 'Health service is working correctly',
      status: 'success',
    };
  }

  @Get('/ping')
  async ping() {
    return {
      data: await this.healthService.ping(),
      message: 'Health service is working correctly',
      status: 'success',
    };
  }
}
