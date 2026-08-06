import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { GradeService } from './GradeService';
import { Grade, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './GradeGuards';
import { isAdmin } from '@server/auth';
import {
  assessmentIdParam,
  createGradeDto,
  deleteBulkGradeDto,
  examIdParam,
  gradeIdParam,
  seedGradesBulkDto,
  sectionIdParam,
  studentIdParam,
  subjectIdParam,
  teacherIdParam,
  type SeedGradeDto,
  updateGradeDto,
  type CreateGradeDto,
  type UpdateGradeDto,
  type DeleteBulkGradeDto,
} from './GradeDto';

@ToolGroup('grades')
@Policy(Grade)
@Controller('/grades')
export class GradeController {
  constructor(private gradeService: GradeService) { }

  @Get()
  @CanList()
  @McpTool('List all grades')
  @ResMsg('grades.success.retrieved')
  async getAll() {
    return this.gradeService.getAll();
  }

  @Get('/assessment/:assessmentId')
  @CanList()
  @Validate({ params: assessmentIdParam })
  @McpTool('Get grades by assessment')
  @ResMsg('grades.success.retrieved')
  async getByAssessment(@Params('assessmentId') assessmentId: string) {
    return this.gradeService.getByAssessment(assessmentId);
  }

  @Get('/exam/:examId')
  @CanList()
  @Validate({ params: examIdParam })
  @McpTool('Get grades by exam')
  @ResMsg('grades.success.retrieved')
  async getByExam(@Params('examId') examId: string) {
    return this.gradeService.getByExam(examId);
  }

  @Get('/student/:studentId')
  @CanList()
  @Validate({ params: studentIdParam })
  @McpTool('Get grades by student')
  @ResMsg('grades.success.retrieved')
  async getByStudent(@Params('studentId') studentId: string) {
    return this.gradeService.getByStudent(studentId);
  }

  @Get('/student/:studentId/report')
  @CanList()
  @Validate({ params: studentIdParam })
  @McpTool('Get student grade report')
  @ResMsg('grades.success.retrieved')
  async getStudentReport(@Params('studentId') studentId: string) {
    return this.gradeService.getStudentReport(studentId);
  }

  @Get('/section/:sectionId')
  @CanList()
  @Validate({ params: sectionIdParam })
  @McpTool('Get grades by section')
  @ResMsg('grades.success.retrieved')
  async getBySection(@Params('sectionId') sectionId: string) {
    return this.gradeService.getBySection(sectionId);
  }

  @Get('/subject/:subjectId')
  @CanList()
  @Validate({ params: subjectIdParam })
  @McpTool('Get grades by subject')
  @ResMsg('grades.success.retrieved')
  async getBySubject(@Params('subjectId') subjectId: string) {
    return this.gradeService.getBySubject(subjectId);
  }

  @Get('/teacher/:teacherId')
  @CanList()
  @Validate({ params: teacherIdParam })
  @McpTool('Get grades by teacher')
  @ResMsg('grades.success.retrieved')
  async getByTeacher(@Params('teacherId') teacherId: string) {
    return this.gradeService.getByTeacher(teacherId);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: gradeIdParam })
  @McpTool('Get a grade by ID')
  @ResMsg('grades.success.retrieved')
  async getById(@Params('id') id: string) {
    return this.gradeService.getById(id);
  }

  @Post()
  @CanCreate()
  @Validate(createGradeDto)
  @McpTool({ description: 'Create a new grade', confirm: { level: 'warning', message: 'confirm.grades.create' } })
  @ResMsg('grades.success.created')
  async create(@Body() body: CreateGradeDto, @User() user: { id: string; teacherId?: string }) {
    return this.gradeService.create(body, user);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(seedGradesBulkDto)
  @McpTool({ description: 'Seed grades demo data', confirm: { level: 'danger', message: 'confirm.grades.seed' } })
  @ResMsg('grades.success.seeded')
  async seedDemoGrades(@Body() body: SeedGradeDto[]) {
    return this.gradeService.seedDemoGrades(body);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: gradeIdParam, body: updateGradeDto })
  @McpTool({ description: 'Update a grade by ID', confirm: { level: 'warning', message: 'confirm.grades.update' } })
  @ResMsg('grades.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateGradeDto, @User() user: { id: string; teacherId?: string }) {
    return this.gradeService.update(id, body, user);
  }

  @Delete('/bulk')
  @isAdmin()
  @Validate(deleteBulkGradeDto)
  @McpTool({ description: 'Delete multiple grades by IDs', confirm: { level: 'danger', message: 'confirm.grades.bulkDelete' } })
  @ResMsg('grades.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkGradeDto) {
    return this.gradeService.deleteBulk(body);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: gradeIdParam })
  @McpTool({ description: 'Delete a grade by ID', confirm: { level: 'danger', message: 'confirm.grades.delete' } })
  @ResMsg('grades.success.deleted')
  async delete(@Params('id') id: string) {
    return this.gradeService.delete(id);
  }

  @Delete()
  @isAdmin()
  @McpTool({ description: 'Delete all grades', confirm: { level: 'danger', message: 'confirm.grades.deleteAll' } })
  @ResMsg('grades.success.allDeleted')
  async deleteAll() {
    return this.gradeService.deleteAll();
  }
}
