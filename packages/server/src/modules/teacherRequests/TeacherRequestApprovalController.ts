import { Controller, Params, Post, ResMsg, Validate } from '../../najm';
import { ToolGroup } from 'najm-mcp';
import { CanSchoolWide } from '../../auth';
import { teacherRequestIdParam } from './TeacherRequestDto';
import { TeacherRequestService } from './TeacherRequestService';

/**
 * Approving stands apart from TeacherRequestController: creating a teacher needs
 * the selected year (config/yearScope.ts), and the public form must not depend
 * on one. REST only.
 */
@ToolGroup('teacher-request-approvals')
@Controller('/teacher-requests')
export class TeacherRequestApprovalController {
  constructor(private service: TeacherRequestService) {}

  @Post('/:id/approve') @CanSchoolWide('create:teachers') @Validate({ params: teacherRequestIdParam })
  @ResMsg('teachers.success.created')
  approve(@Params('id') id: string) { return this.service.approve(id); }
}
