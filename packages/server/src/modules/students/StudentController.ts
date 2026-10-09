import { Body, Controller, Delete, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { StudentService } from './StudentService';
import { Student, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './StudentGuards';
import { isAdmin, isAdministrator } from '../../auth';
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

  @Get('/my-identity')
  @CanList()
  @McpTool({ description: 'Get the signed-in student account identity for my/own requests. Returns only its student ID and name; no ID input. Identité de mon compte. هوية حسابي.', readOnly: true })
  @ResMsg('students.success.retrieved')
  async getMyIdentity(@User('id') userId: string) {
    return this.studentService.getMyIdentity(userId);
  }

  @Get()
  @CanList()
  @Validate({ query: studentListQuery })
  @McpTool({ description: 'List all students enrolled in the selected academic year. To find one student by name, use search_search_students instead. Liste des élèves inscrits pour l’année scolaire sélectionnée. قائمة تلاميذ السنة الدراسية المحددة.', readOnly: true })
  @ResMsg('students.success.retrieved')
  async getStudents(@Query('onDate') onDate?: StudentListQuery['onDate']) {
    return this.studentService.getAll(onDate);
  }

  @Get('/count')
  @CanList()
  @McpTool({ description: 'Get the exact total number of students enrolled in the selected academic year, limited to records this account can read. Nombre total d’élèves pour l’année scolaire sélectionnée. العدد الإجمالي للتلاميذ في السنة الدراسية المحددة.', readOnly: true })
  @ResMsg('students.success.retrieved')
  async getStudentCount() {
    return this.studentService.getCount();
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: studentIdParam, query: studentYearQuery })
  @McpTool({ description: 'Get a student by ID', readOnly: true })
  @ResMsg('students.success.retrieved')
  async getStudentById(@Params('id') id: string) {
    return this.studentService.getById(id);
  }

  @Get('/:id/parents')
  @CanRead()
  @Validate({ params: studentIdParam })
  @McpTool({ description: 'Get parents linked to a student. Parents d’un élève et leur téléphone. أولياء أمور التلميذ، الأب والأم، ورقم الهاتف.', readOnly: true })
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
  async create(@Body() body: CreateStudentDto, @User() user: { id: string; role: string }) {
    return this.studentService.create(body, user);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createStudentsBulkDto)
  @ResMsg('students.success.seeded')
  async createBulk(@Body() body: CreateStudentsBulkDto, @User() user: { id: string; role: string }) {
    return this.studentService.createBulk(body, user);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: studentIdParam, body: updateStudentDto })
  @McpTool({ description: 'Update a student by ID', confirm: { level: 'warning', message: 'confirm.students.update' } })
  @ResMsg('students.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateStudentDto, @User() user: { id: string; role: string }) {
    return this.studentService.update(id, body, user);
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
  async deleteById(@Params('id') id: string) {
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
