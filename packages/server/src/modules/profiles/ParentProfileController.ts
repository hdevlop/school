import { Controller, Get, Params, ResMsg, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { ParentProfileService } from './ParentProfileService';
import { isAuth } from '../../auth';
import { z } from 'zod';
import { Year } from '../academicYears/requestYear';
import { academicYearQuery } from '../academicYears/AcademicYearDto';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

const parentIdParam = z.object({ parentId: z.string().min(1) });

@ToolGroup('parent-profile')
@Controller('/profiles/parents')
@isAuth()
export class ParentProfileController {
  constructor(private parentProfileService: ParentProfileService) {}

  @Get('/:parentId/unread-alerts')
  @Validate({ params: parentIdParam })
  @McpTool('Get unread alerts aggregated across all children for a parent')
  @ResMsg('parents.success.retrieved')
  async getUnreadAlerts(@Params('parentId') parentId: string) {
    return this.parentProfileService.getUnreadAlerts(parentId);
  }

  @Get('/:parentId/children')
  @Validate({ params: parentIdParam, query: academicYearQuery })
  @McpTool('Get children for a parent with their class and fees in the academic year')
  @ResMsg('parents.success.retrieved')
  async getChildren(@Params('parentId') parentId: string, @Year() year: ResolvedAcademicYear) {
    return this.parentProfileService.getChildren(parentId, year);
  }

  @Get('/:parentId/fees-due')
  @Validate({ params: parentIdParam })
  @McpTool('Get fees due across all children for a parent')
  @ResMsg('parents.success.retrieved')
  async getAllFeesDue(@Params('parentId') parentId: string) {
    return this.parentProfileService.getFeesDue(parentId);
  }

  @Get('/:parentId/upcoming-events')
  @Validate({ params: parentIdParam })
  @McpTool('Get upcoming events for all children of a parent')
  @ResMsg('parents.success.retrieved')
  async getAllUpcomingEvents(@Params('parentId') parentId: string) {
    return this.parentProfileService.getUpcomingEvents(parentId);
  }
}
