import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { AssessmentService } from './AssessmentService';
import { Assessment, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './AssessmentGuards';
import { isAdmin } from '@server/auth';
import {
  assessmentIdParam,
  classIdParam,
  createAssessmentDto,
  deleteBulkAssessmentDto,
  seedAssessmentsBulkDto,
  sectionIdParam,
  subjectIdParam,
  teacherIdParam,
  type SeedAssessmentDto,
  type DeleteBulkAssessmentDto,
  updateAssessmentDto,
  type CreateAssessmentDto,
  type UpdateAssessmentDto,
} from './AssessmentDto';

@ToolGroup('assessments')
@Policy(Assessment)
@Controller('/assessments')
export class AssessmentController {
  constructor(private assessmentService: AssessmentService) { }

  @Get()
  @CanList()
  @McpTool('List all assessments')
  @ResMsg('assessments.success.retrieved')
  async getAll() {
    return this.assessmentService.getAll();
  }

  @Get('/today')
  @CanList()
  @McpTool("List today's assessments")
  @ResMsg('assessments.success.retrieved')
  async getTodayAssessments() {
    return this.assessmentService.getTodayAssessments();
  }

  @Get('/upcoming')
  @CanList()
  @McpTool('List upcoming assessments')
  @ResMsg('assessments.success.retrieved')
  async getUpcomingAssessments() {
    return this.assessmentService.getUpcoming();
  }

  @Get('/due-this-week')
  @CanList()
  @McpTool('List assessments due this week')
  @ResMsg('assessments.success.retrieved')
  async getDueThisWeek() {
    return this.assessmentService.getDueThisWeek();
  }

  @Get('/overdue')
  @CanList()
  @McpTool('List overdue assessments')
  @ResMsg('assessments.success.retrieved')
  async getOverdue() {
    return this.assessmentService.getOverdue();
  }

  @Get('/class/:classId')
  @CanList()
  @Validate({ params: classIdParam })
  @McpTool('Get assessments by class')
  @ResMsg('assessments.success.retrieved')
  async getByClass(@Params('classId') classId: string) {
    return this.assessmentService.getByClass(classId);
  }

  @Get('/section/:sectionId')
  @CanList()
  @Validate({ params: sectionIdParam })
  @McpTool('Get assessments by section')
  @ResMsg('assessments.success.retrieved')
  async getBySection(@Params('sectionId') sectionId: string) {
    return this.assessmentService.getBySection(sectionId);
  }

  @Get('/subject/:subjectId')
  @CanList()
  @Validate({ params: subjectIdParam })
  @McpTool('Get assessments by subject')
  @ResMsg('assessments.success.retrieved')
  async getBySubject(@Params('subjectId') subjectId: string) {
    return this.assessmentService.getBySubject(subjectId);
  }

  @Get('/teacher/:teacherId')
  @CanList()
  @Validate({ params: teacherIdParam })
  @McpTool('Get assessments by teacher')
  @ResMsg('assessments.success.retrieved')
  async getByTeacher(@Params('teacherId') teacherId: string) {
    return this.assessmentService.getByTeacher(teacherId);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: assessmentIdParam })
  @McpTool('Get an assessment by ID')
  @ResMsg('assessments.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.assessmentService.getById(id);
  }

  @Post()
  @CanCreate()
  @Validate(createAssessmentDto)
  @McpTool('Create a new assessment')
  @ResMsg('assessments.success.created')
  async create(@Body() body: CreateAssessmentDto) {
    return this.assessmentService.create(body);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(seedAssessmentsBulkDto)
  @ResMsg('assessments.success.seeded')
  async seedDemoAssessments(@Body() body: SeedAssessmentDto[]) {
    return this.assessmentService.seedDemoAssessments(body);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: assessmentIdParam, body: updateAssessmentDto })
  @McpTool('Update an assessment by ID')
  @ResMsg('assessments.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateAssessmentDto) {
    return this.assessmentService.update(id, body);
  }

  @Delete('/bulk')
  @isAdmin()
  @Validate(deleteBulkAssessmentDto)
  @McpTool('Delete multiple assessments by IDs')
  @ResMsg('assessments.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkAssessmentDto) {
    return this.assessmentService.deleteBulk(body);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: assessmentIdParam })
  @McpTool('Delete an assessment by ID')
  @ResMsg('assessments.success.deleted')
  async delete(@Params('id') id: string) {
    return this.assessmentService.delete(id);
  }

  @Delete()
  @isAdmin()
  @McpTool('Delete all assessments')
  @ResMsg('assessments.success.allDeleted')
  async deleteAll() {
    return this.assessmentService.deleteAll();
  }
}
