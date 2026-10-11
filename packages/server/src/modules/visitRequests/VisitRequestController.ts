import { Body, Controller, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '../../najm';
import { Public } from 'najm-guard';
import { Can } from '../../auth';
import { RateLimit } from 'najm-rate';
import { McpTool, ToolGroup } from 'najm-mcp';
import { createVisitRequestDto, updateVisitRequestDto, visitRequestIdParam, visitRequestQueryDto, type CreateVisitRequestDto, type UpdateVisitRequestDto } from './VisitRequestDto';
import { VisitRequestService } from './VisitRequestService';
import type { VisitRequestStatus } from '@sms/contracts';

@ToolGroup('visit-requests')
@Controller('/visit-requests')
export class VisitRequestController {
  constructor(private service: VisitRequestService) {}
  @Post() @Public() @RateLimit({ limit: 5, window: '1h' }) @Validate(createVisitRequestDto)
  @ResMsg({ message: 'visitRequests.success.received', status: 201 })
  create(@Body() input: CreateVisitRequestDto) {
    return this.service.create(input);
  }
  @Get() @Can('read:visit-requests') @Validate({ query: visitRequestQueryDto }) @McpTool({ description: 'List school visit requests', readOnly: true }) @ResMsg('visitRequests.success.loaded')
  list(@Query('status') status?: VisitRequestStatus) { return this.service.list(status); }
  @Put('/:id') @Can('update:visit-requests') @Validate({ body: updateVisitRequestDto, params: visitRequestIdParam }) @ResMsg('visitRequests.success.updated')
  update(@Params('id') id: string, @Body() input: UpdateVisitRequestDto, @User('id') userId: string) { return this.service.update(id, input, userId); }
}
