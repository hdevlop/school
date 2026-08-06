import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { ExamService } from './ExamService';
import { Exam, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './ExamGuards';
import { isAdmin } from '@server/auth';
import {
  createExamDto,
  deleteBulkExamDto,
  examIdParam,
  seedExamsBulkDto,
  sectionIdParam,
  subjectIdParam,
  teacherIdParam,
  type SeedExamDto,
  updateExamDto,
  type CreateExamDto,
  type UpdateExamDto,
  type DeleteBulkExamDto,
} from './ExamDto';

@ToolGroup('exams')
@Policy(Exam)
@Controller('/exams')
export class ExamController {
  constructor(private examService: ExamService) { }

  @Get()
  @CanList()
  @McpTool('List all exams')
  @ResMsg('exams.success.retrieved')
  async getAll() {
    return this.examService.getAll();
  }

  @Get('/today')
  @CanList()
  @McpTool("List today's exams")
  @ResMsg('exams.success.retrieved')
  async getTodayExams() {
    return this.examService.getTodayExams();
  }

  @Get('/upcoming')
  @CanList()
  @McpTool('List upcoming exams')
  @ResMsg('exams.success.retrieved')
  async getUpcomingExams() {
    return this.examService.getUpcomingExams();
  }

  @Get('/section/:sectionId')
  @CanList()
  @Validate({ params: sectionIdParam })
  @McpTool('Get exams by section')
  @ResMsg('exams.success.retrieved')
  async getBySection(@Params('sectionId') sectionId: string) {
    return this.examService.getBySection(sectionId);
  }

  @Get('/subject/:subjectId')
  @CanList()
  @Validate({ params: subjectIdParam })
  @McpTool('Get exams by subject')
  @ResMsg('exams.success.retrieved')
  async getBySubject(@Params('subjectId') subjectId: string) {
    return this.examService.getBySubject(subjectId);
  }

  @Get('/teacher/:teacherId')
  @CanList()
  @Validate({ params: teacherIdParam })
  @McpTool('Get exams by teacher')
  @ResMsg('exams.success.retrieved')
  async getByTeacher(@Params('teacherId') teacherId: string) {
    return this.examService.getByTeacher(teacherId);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: examIdParam })
  @McpTool('Get an exam by ID')
  @ResMsg('exams.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.examService.getById(id);
  }

  @Post()
  @CanCreate()
  @Validate(createExamDto)
  @McpTool({ description: 'Create a new exam', confirm: { level: 'warning', message: 'confirm.exams.create' } })
  @ResMsg('exams.success.created')
  async create(@Body() body: CreateExamDto) {
    return this.examService.create(body);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(seedExamsBulkDto)
  @McpTool({ description: 'Seed exams demo data', confirm: { level: 'danger', message: 'confirm.exams.seed' } })
  @ResMsg('exams.success.seeded')
  async seedDemoExams(@Body() body: SeedExamDto[]) {
    return this.examService.seedDemoExams(body);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: examIdParam, body: updateExamDto })
  @McpTool({ description: 'Update an exam by ID', confirm: { level: 'warning', message: 'confirm.exams.update' } })
  @ResMsg('exams.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateExamDto) {
    return this.examService.update(id, body);
  }

  @Delete('/bulk')
  @isAdmin()
  @Validate(deleteBulkExamDto)
  @McpTool({ description: 'Delete multiple exams by IDs', confirm: { level: 'danger', message: 'confirm.exams.bulkDelete' } })
  @ResMsg('exams.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkExamDto) {
    return this.examService.deleteBulk(body);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: examIdParam })
  @McpTool({ description: 'Delete an exam by ID', confirm: { level: 'danger', message: 'confirm.exams.delete' } })
  @ResMsg('exams.success.deleted')
  async delete(@Params('id') id: string) {
    return this.examService.delete(id);
  }

  @Delete()
  @isAdmin()
  @McpTool({ description: 'Delete all exams', confirm: { level: 'danger', message: 'confirm.exams.deleteAll' } })
  @ResMsg('exams.success.allDeleted')
  async deleteAll() {
    return this.examService.deleteAll();
  }
}
