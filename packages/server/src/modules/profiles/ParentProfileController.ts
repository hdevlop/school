import { Controller, Get, Params, ResMsg, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { ParentProfileService } from './ParentProfileService';
import { Can, isAuth, isFinancial } from '../../auth';
import { z } from 'zod';

const parentIdParam = z.object({ parentId: z.string().min(1) });

// Each tab asks for what its data's own module asks for on its routes: the
// children with their fees and the debts across years are fee views, so they
// stay with the finance roles, as the fee routes do.
@ToolGroup('parent-profile')
@Controller('/profiles/parents')
@isAuth()
export class ParentProfileController {
  constructor(private parentProfileService: ParentProfileService) {}

  @Get('/:parentId/unread-alerts')
  @Can('read:alerts')
  @Validate({ params: parentIdParam })
  @McpTool('Get unread alerts aggregated across all children for a parent')
  @ResMsg('parents.success.retrieved')
  async getUnreadAlerts(@Params('parentId') parentId: string) {
    return this.parentProfileService.getUnreadAlerts(parentId);
  }

  // The year hook declares `academicYear` for every tool of this controller.
  @Get('/:parentId/children')
  @isFinancial()
  @Validate({ params: parentIdParam })
  @McpTool('Get children for a parent with their class and fees in the academic year')
  @ResMsg('parents.success.retrieved')
  async getChildren(@Params('parentId') parentId: string) {
    return this.parentProfileService.getChildren(parentId);
  }

  @Get('/:parentId/fees-due')
  @isFinancial()
  @Validate({ params: parentIdParam })
  @McpTool("Get every academic year's fees of all children for a parent")
  @ResMsg('parents.success.retrieved')
  async getAllFeesDue(@Params('parentId') parentId: string) {
    return this.parentProfileService.getFeesDue(parentId);
  }

  @Get('/:parentId/upcoming-events')
  @Can('read:events')
  @Validate({ params: parentIdParam })
  @McpTool("Get the academic year's upcoming events a parent sees: the school's and their children's classes'")
  @ResMsg('parents.success.retrieved')
  async getAllUpcomingEvents(@Params('parentId') parentId: string) {
    return this.parentProfileService.getUpcomingEvents(parentId);
  }
}
