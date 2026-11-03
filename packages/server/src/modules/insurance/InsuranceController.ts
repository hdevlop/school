import { Controller, Get, ResMsg } from '../../najm';
import { CanSchoolWide } from '../../auth';
import { ToolGroup } from 'najm-mcp';
import { InsuranceService } from './InsuranceService';

@ToolGroup('insurance')
@Controller('/insurance')
export class InsuranceController {
  constructor(private service: InsuranceService) {}

  @Get()
  @CanSchoolWide('read:insurance')
  @ResMsg('students.success.retrieved')
  async getRegister() {
    return this.service.getRegister();
  }
}
