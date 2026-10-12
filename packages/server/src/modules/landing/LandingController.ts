import { Body, Controller, Get, Put, ResMsg, Validate } from '../../najm';
import { Can } from '../../auth';
import { landingContentDto } from './LandingDto';
import { LandingService } from './LandingService';
import type { LandingContent } from '@sms/contracts';

@Controller('/landing/content')
export class LandingController {
  constructor(private service: LandingService) {}
  @Get() @Can('read:settings') @ResMsg('publicPage.success.loaded')
  get() { return this.service.get(); }
  @Put() @Can('update:settings') @Validate(landingContentDto) @ResMsg('publicPage.success.saved')
  save(@Body() content: LandingContent) { return this.service.save(content); }
}
