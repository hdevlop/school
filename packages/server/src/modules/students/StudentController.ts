import { Body, Controller, Delete, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { StudentService } from './StudentService';
import { Student, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './StudentGuards';
import { isAdmin, isAdministrator } from '../../auth';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import {
  createStudentDto,
  createStudentsBulkDto,
  deleteBulkStudentDto,
  studentIdParam,
  studentListQuery,
  studentYearQuery,
  updateStudentDto,
  type CreateStudentsBulkDto,
  type CreateStudentDto,
  type DeleteBulkStudentDto,
  type StudentListQuery,
  type UpdateStudentDto,
} from './StudentDto';

@ToolGroup('students')
@Policy(Student)
@Controller('/students')
export class StudentController {
  constructor(private studentService: StudentService) { }

  @Get()
  @CanList()
  @Validate({ query: studentListQuery })
  @McpTool('List all students')
  @ResMsg('students.success.retrieved')
  async getStudents(@Year() year: ResolvedAcademicYear, @Query('onDate') onDate?: StudentListQuery['onDate']) {
    return this.studentService.getAll(year, onDate);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: studentIdParam, query: studentYearQuery })
  @McpTool('Get a student by ID')
  @ResMsg('students.success.retrieved')
  async getStudent(@Params('id') id: string, @Year() year: ResolvedAcademicYear) {
    return this.studentService.getById(id, year);
  }

  @Get('/:id/parents')
  @CanRead()
  @Validate({ params: studentIdParam })
  @McpTool('Get parents linked to a student')
  @ResMsg('students.success.retrieved')
  async getStudentParents(@Params('id') id: string) {
    return this.studentService.getParents(id);
  }

  @Get('/:id/enrollments')
  @isAdministrator()
  @Validate({ params: studentIdParam })
  @ResMsg('students.success.retrieved')
  async getStudentEnrollments(@Params('id') id: string) {
    return this.studentService.getEnrollments(id);
  }

  @Post()
  @CanCreate()
  @Validate(createStudentDto)
  @McpTool({ description: 'Create a new student', confirm: { level: 'warning', message: 'confirm.students.create' } })
  @ResMsg('students.success.created')
  async create(@Body() body: CreateStudentDto, @User() user: { id: string }) {
    return this.studentService.create(body, user.id);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createStudentsBulkDto)
  @ResMsg('students.success.seeded')
  async createBulk(@Body() body: CreateStudentsBulkDto) {
    return this.studentService.createBulk(body);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: studentIdParam, body: updateStudentDto })
  @McpTool({ description: 'Update a student by ID', confirm: { level: 'warning', message: 'confirm.students.update' } })
  @ResMsg('students.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateStudentDto) {
    return this.studentService.update(id, body);
  }

  @Delete('/bulk')
  @CanDelete()
  @Validate(deleteBulkStudentDto)
  @McpTool({ description: 'Delete multiple students by IDs', confirm: { level: 'danger', message: 'confirm.students.bulkDelete' } })
  @ResMsg('students.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkStudentDto) {
    return this.studentService.deleteBulk(body.ids);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: studentIdParam })
  @McpTool({ description: 'Delete a student by ID', confirm: { level: 'danger', message: 'confirm.students.delete' } })
  @ResMsg('students.success.deleted')
  async delete(@Params('id') id: string) {
    return this.studentService.delete(id);
  }

  @Delete()
  @CanDelete()
  @McpTool({ description: 'Delete all students', confirm: { level: 'danger', message: 'confirm.students.deleteAll' } })
  @ResMsg('students.success.allDeleted')
  async deleteAll() {
    return this.studentService.deleteAll();
  }
}
