import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { AssessmentService } from './AssessmentService';
import { Assessment, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './AssessmentGuards';
import { isAdmin } from '../../auth';
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
  @McpTool({ description: 'List all assessments', readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getAll() {
    return this.assessmentService.getAll();
  }

  @Get('/today')
  @CanList()
  @McpTool({ description: "List today's assessments: quizzes, assignments and class tests (فروض اليوم / forod lyom). These are assessment records, distinct from exams. An empty result means no assessments in this account's selected-year scope today.", readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getTodayAssessments() {
    return this.assessmentService.getTodayAssessments();
  }

  @Get('/upcoming')
  @CanList()
  @McpTool({ description: 'List upcoming assessments', readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getUpcomingAssessments() {
    return this.assessmentService.getUpcoming();
  }

  @Get('/due-this-week')
  @CanList()
  @McpTool({ description: 'List assessments due this week', readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getDueThisWeek() {
    return this.assessmentService.getDueThisWeek();
  }

  @Get('/overdue')
  @CanList()
  @McpTool({ description: 'List overdue assessments', readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getOverdue() {
    return this.assessmentService.getOverdue();
  }

  @Get('/class/:classId')
  @CanList()
  @Validate({ params: classIdParam })
  @McpTool({ description: 'Get assessments by class', readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getByClass(@Params('classId') classId: string) {
    return this.assessmentService.getAll({ classId });
  }

  @Get('/section/:sectionId')
  @CanList()
  @Validate({ params: sectionIdParam })
  @McpTool({ description: 'Get assessments by section', readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getBySection(@Params('sectionId') sectionId: string) {
    return this.assessmentService.getAll({ sectionId });
  }

  @Get('/subject/:subjectId')
  @CanList()
  @Validate({ params: subjectIdParam })
  @McpTool({ description: 'Get assessments by subject', readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getBySubject(@Params('subjectId') subjectId: string) {
    return this.assessmentService.getAll({ subjectId });
  }

  @Get('/teacher/:teacherId')
  @CanList()
  @Validate({ params: teacherIdParam })
  @McpTool({ description: 'Get assessments by teacher', readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getByTeacher(@Params('teacherId') teacherId: string) {
    return this.assessmentService.getAll({ teacherId });
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: assessmentIdParam })
  @McpTool({ description: 'Get an assessment by ID', readOnly: true })
  @ResMsg('assessments.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.assessmentService.getById(id);
  }

  @Post()
  @CanCreate()
  @Validate(createAssessmentDto)
  @McpTool({ description: 'Create a new assessment', confirm: { level: 'warning', message: 'confirm.assessments.create' } })
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
  @McpTool({ description: 'Update an assessment by ID', confirm: { level: 'warning', message: 'confirm.assessments.update' } })
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
  async deleteById(@Params('id') id: string) {
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
