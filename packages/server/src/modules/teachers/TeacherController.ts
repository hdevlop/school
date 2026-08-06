import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { TeacherService } from './TeacherService';
import { Teacher, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './TeacherGuards';
import { isAdmin } from '@server/auth';
import {
  assignClassDto,
  assignSubjectDto,
  createTeacherDto,
  createTeachersBulkDto,
  deleteBulkTeacherDto,
  teacherCinParam,
  teacherEmailParam,
  teacherIdParam,
  teacherPhoneParam,
  unassignClassDto,
  unassignSubjectDto,
  updateTeacherDto,
  type AssignClassDto,
  type CreateTeachersBulkDto,
  type CreateTeacherDto,
  type DeleteBulkTeacherDto,
  type UnassignClassDto,
  type UpdateTeacherDto,
} from './TeacherDto';

@ToolGroup('teachers')
@Policy(Teacher)
@Controller('/teachers')
export class TeacherController {
  constructor(private teacherService: TeacherService) { }

  @Get()
  @CanList()
  @McpTool('List all teachers')
  @ResMsg('teachers.success.retrieved')
  async getTeachers() {
    return this.teacherService.getAll();
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: teacherIdParam })
  @McpTool('Get a teacher by ID')
  @ResMsg('teachers.success.retrieved')
  async getTeacher(@Params('id') id: string) {
    return this.teacherService.getById(id);
  }

  @Get('/cin/:cin')
  @isAdmin()
  @Validate({ params: teacherCinParam })
  @McpTool('Get a teacher by CIN')
  @ResMsg('teachers.success.retrieved')
  async getByCin(@Params('cin') cin: string) {
    return this.teacherService.getByCin(cin);
  }

  @Get('/email/:email')
  @isAdmin()
  @Validate({ params: teacherEmailParam })
  @McpTool('Get a teacher by email')
  @ResMsg('teachers.success.retrieved')
  async getByEmail(@Params('email') email: string) {
    return this.teacherService.getByEmail(email);
  }

  @Get('/phone/:phone')
  @isAdmin()
  @Validate({ params: teacherPhoneParam })
  @McpTool('Get a teacher by phone number')
  @ResMsg('teachers.success.retrieved')
  async getByPhone(@Params('phone') phone: string) {
    return this.teacherService.getByPhone(phone);
  }

  @Get('/:id/classes')
  @CanRead()
  @Validate({ params: teacherIdParam })
  @McpTool('Get classes assigned to a teacher')
  @ResMsg('teachers.success.retrieved')
  async getClasses(@Params('id') id: string) {
    return this.teacherService.getClasses(id);
  }

  @Get('/:id/students')
  @CanRead()
  @Validate({ params: teacherIdParam })
  @McpTool('Get students taught by a teacher')
  @ResMsg('teachers.success.retrieved')
  async getStudents(@Params('id') id: string) {
    return this.teacherService.getStudents(id);
  }

  @Post('/assign-subject')
  @CanCreate()
  @Validate(assignSubjectDto)
  @McpTool({ description: 'Assign a subject to a teacher in a section', confirm: { level: 'warning', message: 'confirm.teachers.assignSubject' } })
  @ResMsg('teachers.success.assigned')
  async assignSubject(@Body() body: { teacherId: string; classId: string; sectionId: string; subjectId: string }) {
    return this.teacherService.assignSubject(body);
  }

  @Post('/unassign-subject')
  @CanUpdate()
  @Validate(unassignSubjectDto)
  @McpTool({ description: 'Unassign a subject from a teacher in a section', confirm: { level: 'warning', message: 'confirm.teachers.unassignSubject' } })
  @ResMsg('teachers.success.unassigned')
  async unassignSubject(@Body() body: { teacherId: string; sectionId: string; subjectId: string }) {
    return this.teacherService.unassignSubject(body);
  }

  @Post('/assign-class')
  @CanCreate()
  @Validate(assignClassDto)
  @McpTool({ description: 'Assign a teacher to all sections in a class for a subject', confirm: { level: 'warning', message: 'confirm.teachers.assignClass' } })
  @ResMsg('teachers.success.assigned')
  async assignClass(@Body() body: AssignClassDto) {
    return this.teacherService.assignClass(body);
  }

  @Post('/unassign-class')
  @CanUpdate()
  @Validate(unassignClassDto)
  @McpTool({ description: 'Unassign a teacher from a class', confirm: { level: 'warning', message: 'confirm.teachers.unassignClass' } })
  @ResMsg('teachers.success.unassigned')
  async unassignClass(@Body() body: UnassignClassDto) {
    return this.teacherService.unassignClass(body);
  }

  @Post()
  @CanCreate()
  @Validate(createTeacherDto)
  @McpTool({ description: 'Create a new teacher', confirm: { level: 'warning', message: 'confirm.teachers.create' } })
  @ResMsg('teachers.success.created')
  async create(@Body() body: CreateTeacherDto) {
    return this.teacherService.create(body);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createTeachersBulkDto)
  @ResMsg('teachers.success.seeded')
  async createBulk(@Body() body: CreateTeachersBulkDto) {
    return this.teacherService.createBulk(body);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: teacherIdParam, body: updateTeacherDto })
  @McpTool({ description: 'Update a teacher by ID', confirm: { level: 'warning', message: 'confirm.teachers.update' } })
  @ResMsg('teachers.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateTeacherDto) {
    return this.teacherService.update(id, body);
  }

  @Delete('/bulk')
  @CanDelete()
  @Validate(deleteBulkTeacherDto)
  @McpTool({ description: 'Delete multiple teachers by IDs', confirm: { level: 'danger', message: 'confirm.teachers.bulkDelete' } })
  @ResMsg('teachers.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkTeacherDto) {
    return this.teacherService.deleteBulk(body);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: teacherIdParam })
  @McpTool({ description: 'Delete a teacher by ID', confirm: { level: 'danger', message: 'confirm.teachers.delete' } })
  @ResMsg('teachers.success.deleted')
  async delete(@Params('id') id: string) {
    return this.teacherService.delete(id);
  }

  @Delete()
  @CanDelete()
  @McpTool({ description: 'Delete all teachers', confirm: { level: 'danger', message: 'confirm.teachers.deleteAll' } })
  @ResMsg('teachers.success.allDeleted')
  async deleteAll() {
    return this.teacherService.deleteAll();
  }
}
