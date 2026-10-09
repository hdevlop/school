import { Controller, Get, Post } from '../../../najm';
import { isAdministrator } from '../../../auth';
import { ChatBenchmarkService } from './ChatBenchmarkService';

/** REST-only diagnostics controls, explicitly enabled on an isolated dev app. */
@Controller('/chat-benchmark')
export class ChatBenchmarkController {
  constructor(private benchmark: ChatBenchmarkService) {}

  @Get('/status')
  @isAdministrator()
  status() {
    return this.benchmark.status();
  }

  @Get('/provider-usage')
  @isAdministrator()
  providerUsage() {
    return this.benchmark.providerUsage();
  }

  @Post('/reset-caches')
  @isAdministrator()
  resetCaches() {
    return this.benchmark.resetCaches();
  }
}
