import { Body, Controller, Get, Params, Post, ResMsg, Validate } from '../../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '../../../auth';
import { FinancialAuditService } from './FinancialAuditService';
import { auditLogIdParam, auditLogQueryDto, type AuditLogQueryDto } from './AuditLogDto';

@ToolGroup('audit-logs')
@Controller('/financial-audit-logs')
export class FinancialAuditController {
  // Audit history is an all-year ledger. Do not register this controller in
  // yearScope: a selected-year header must never hide old financial events.
  constructor(private service: FinancialAuditService) {}

  @Post('/list')
  @isAdmin()
  @Validate({ body: auditLogQueryDto })
  @McpTool({ description: 'List financial audit log entries (admin only)', readOnly: true })
  @ResMsg('auditLog.list')
  async list(@Body() body: AuditLogQueryDto) {
    return this.service.list(body);
  }

  @Get('/:id')
  @isAdmin()
  @Validate({ params: auditLogIdParam })
  @McpTool({ description: 'Get a financial audit log entry by ID (admin only)', readOnly: true })
  @ResMsg('auditLog.retrieved')
  async getById(@Params('id') id: string) {
    return this.service.getById(id);
  }
}
