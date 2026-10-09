import { Controller, Get, Params, Query, Validate } from '../../../najm';
import { isAdministrator } from '../../../auth';
import { ChatDiagnosticsService } from './ChatDiagnosticsService';
import { chatDiagnosticsIdParam, listChatDiagnosticsDto, type ListChatDiagnosticsDto } from './ChatDiagnosticsDto';

@Controller('/chat-diagnostics')
export class ChatDiagnosticsController {
  constructor(private diagnostics: ChatDiagnosticsService) {}

  @Get()
  @isAdministrator()
  @Validate({ query: listChatDiagnosticsDto })
  list(@Query() query: ListChatDiagnosticsDto) {
    return this.diagnostics.list(query.limit);
  }

  @Get('/:correlationId')
  @isAdministrator()
  @Validate({ params: chatDiagnosticsIdParam })
  find(@Params('correlationId') correlationId: string) {
    return this.diagnostics.find(correlationId);
  }
}
