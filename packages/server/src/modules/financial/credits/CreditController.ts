import { Body, Controller, Get, Params, Post, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isFinancial } from '@server/auth';
import { CreditService } from './CreditService';
import { applyCreditDto, creditStudentIdParam, type ApplyCreditDto } from './CreditDto';

@ToolGroup('student-credits')
@Controller('/student-credits')
export class CreditController {
  constructor(private creditService: CreditService) {}

  @Post('/apply')
  @isFinancial()
  @Validate(applyCreditDto)
  @McpTool({ description: 'Apply available student credit to installments', confirm: { level: 'warning', message: 'confirm.credits.apply' } })
  @ResMsg('credits.applied')
  async apply(@Body() body: ApplyCreditDto, @User() user: { id: string }) {
    return this.creditService.applyStudentCredit(body, user.id);
  }

  @Get('/student/:studentId')
  @isFinancial()
  @Validate({ params: creditStudentIdParam })
  @McpTool('List student credit lots')
  @ResMsg('credits.retrieved')
  async getByStudent(@Params('studentId') studentId: string) {
    return this.creditService.getByStudent(studentId);
  }
}
