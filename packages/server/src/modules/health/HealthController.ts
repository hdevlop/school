import { Controller, Get, RawResponse } from '@server/najm';
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
  @RawResponse()
  async getStatus() {
    const readiness = await this.healthService.getReadiness();
    return Response.json(
      {
        checks: readiness.checks,
        service: 'school',
        status: readiness.ready ? 'ready' : 'not_ready',
        version: '0.1.0',
      },
      {
        headers: { 'Cache-Control': 'no-store' },
        status: readiness.ready ? 200 : 503,
      },
    );
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
