import { Body, Controller, Get, Params, Post, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAdmin } from '@server/auth';
import { FinancialAuditService } from './FinancialAuditService';
import { auditLogIdParam, auditLogQueryDto, type AuditLogQueryDto } from './AuditLogDto';

@ToolGroup('audit-logs')
@Controller('/financial-audit-logs')
export class FinancialAuditController {
  constructor(private service: FinancialAuditService) {}

  @Post('/list')
  @isAdmin()
  @Validate({ body: auditLogQueryDto })
  @McpTool('List financial audit log entries (admin only)')
  @ResMsg('auditLog.list')
  async list(@Body() body: AuditLogQueryDto) {
    return this.service.list(body);
  }

  @Get('/:id')
  @isAdmin()
  @Validate({ params: auditLogIdParam })
  @McpTool('Get a financial audit log entry by ID (admin only)')
  @ResMsg('auditLog.retrieved')
  async getById(@Params('id') id: string) {
    return this.service.getById(id);
  }
}
