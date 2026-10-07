import { Body, Controller, Get, Post, User, Validate } from '../../najm';
import { isAdministrator } from '../../auth';
import { JevBenchmarkService } from './JevBenchmarkService';
import { jevModeDto, jevSessionDto, type JevModeDto, type JevSessionDto } from './JevBenchmarkDto';

@Controller('/chat-benchmark/jev')
export class JevBenchmarkController {
  constructor(private benchmark: JevBenchmarkService) {}
  @Get('/status') @isAdministrator()
  status() { return this.benchmark.status(); }
  @Post('/mode') @isAdministrator() @Validate({ body: jevModeDto })
  mode(@Body() body: JevModeDto) { return this.benchmark.setMode(body.mode); }
  @Post('/session') @isAdministrator() @Validate({ body: jevSessionDto })
  session(@User('id') actorId: string, @Body() body: JevSessionDto) { return this.benchmark.issueSession(actorId, body.caseId); }
  @Get('/attempts') @isAdministrator()
  attempts() { return this.benchmark.attempts(); }
}
