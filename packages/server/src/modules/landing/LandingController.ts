import { Body, Controller, Get, Put, ResMsg, Validate } from '../../najm';
import { isAdministrator } from '../../auth';
import { landingContentDto } from './LandingDto';
import { LandingService } from './LandingService';
import type { LandingContent } from '@sms/contracts';

@Controller('/landing/content')
export class LandingController {
  constructor(private service: LandingService) {}
  @Get() @isAdministrator() @ResMsg('publicPage.success.loaded')
  get() { return this.service.get(); }
  @Put() @isAdministrator() @Validate(landingContentDto) @ResMsg('publicPage.success.saved')
  save(@Body() content: LandingContent) { return this.service.save(content); }
}
