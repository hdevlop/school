import { Body, Controller, Get, Params, Post, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '@server/auth';
import { RolloverService } from './RolloverService';
import { commitRolloverDto, rolloverDto, type CommitRolloverDto, type RolloverDto } from './RolloverDto';

@ToolGroup('rollover')
@Controller('/rollover')
export class RolloverController {
  constructor(private rolloverService: RolloverService) {}

  @Post('/preview')
  @isAdmin()
  @Validate(rolloverDto)
  @McpTool({ description: 'Preview academic-year rollover (dry run)', confirm: { level: 'warning', message: 'confirm.rollover.preview' } })
  @ResMsg('rollover.previewed')
  async preview(@Body() body: RolloverDto, @User() user: { id: string }) {
    return this.rolloverService.preview(body, user.id);
  }

  @Post('/commit')
  @isAdmin()
  @Validate(commitRolloverDto)
  @McpTool({ description: 'Commit academic-year rollover from a prior preview', confirm: { level: 'danger', message: 'confirm.rollover.commit' } })
  @ResMsg('rollover.committed')
  async commit(@Body() body: CommitRolloverDto, @User() user: { id: string }) {
    return this.rolloverService.commit(body, user.id);
  }

  @Get('/:id')
  @isAdmin()
  @ResMsg('rollover.retrieved')
  async getRun(@Params('id') id: string) {
    return this.rolloverService.getRun(id);
  }
}
