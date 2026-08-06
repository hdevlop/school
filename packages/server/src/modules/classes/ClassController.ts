import { Controller, Get, Post, Put, Delete, Params, Body, Validate, ResMsg } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { ClassService } from './ClassService';
import { Class, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './ClassGuards';
import { isAdmin } from '@server/auth';
import { classIdParam, createClassDto, createClassesBulkDto, updateClassDto, type CreateClassDto, type UpdateClassDto } from './ClassDto';

@ToolGroup('classes')
@Policy(Class)
@Controller('/classes')
export class ClassController {
  constructor(private classService: ClassService) { }

  // ========== GET ENDPOINTS ==========//

  @Get()
  @CanList()
  @McpTool('List all classes')
  @ResMsg('classes.success.retrieved')
  async getClasses() {
    return this.classService.getAll();
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: classIdParam })
  @McpTool('Get a class by ID')
  @ResMsg('classes.success.retrieved')
  async getClass(@Params('id') id: string) {
    return this.classService.getById(id);
  }

  @Get('/:id/sections')
  @CanRead()
  @Validate({ params: classIdParam })
  @McpTool('Get sections of a class')
  @ResMsg('classes.success.retrieved')
  async getClassSections(@Params('id') id: string) {
    return this.classService.getSections(id);
  }

  @Get('/:id/students')
  @CanRead()
  @Validate({ params: classIdParam })
  @McpTool('Get students enrolled in a class')
  @ResMsg('classes.success.retrieved')
  async getClassStudents(@Params('id') id: string) {
    return this.classService.getStudents(id);
  }

  @Get('/:id/teachers')
  @CanRead()
  @Validate({ params: classIdParam })
  @McpTool('Get teachers assigned to a class')
  @ResMsg('classes.success.retrieved')
  async getClassTeachers(@Params('id') id: string) {
    return this.classService.getTeachers(id);
  }

  @Get('/:id/subjects')
  @CanRead()
  @Validate({ params: classIdParam })
  @McpTool('Get subjects assigned to a class')
  @ResMsg('classes.success.retrieved')
  async getClassSubjects(@Params('id') id: string) {
    return this.classService.getSubjects(id);
  }

  @Get('/:id/parents')
  @CanRead()
  @Validate({ params: classIdParam })
  @McpTool('Get parents of students in a class')
  @ResMsg('classes.success.retrieved')
  async getClassParents(@Params('id') id: string) {
    return this.classService.getParents(id);
  }

  @Get('/:id/analytics')
  @CanRead()
  @Validate({ params: classIdParam })
  @McpTool('Get analytics for a class')
  @ResMsg('classes.success.retrieved')
  async getClassAnalytics(@Params('id') id: string) {
    return this.classService.getAnalytics(id);
  }

  // ========== POST ENDPOINTS ==========//

  @Post()
  @CanCreate()
  @Validate(createClassDto)
  @McpTool({ description: 'Create a new class', confirm: { level: 'warning', message: 'confirm.classes.create' } })
  @ResMsg('classes.success.created')
  async create(@Body() body: CreateClassDto) {
    return this.classService.create(body);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createClassesBulkDto)
  @ResMsg('classes.success.seeded')
  async seedClasses(@Body() body: CreateClassDto[]) {
    return this.classService.seedDemoClasses(body);
  }

  // ========== PUT ENDPOINTS ==========//

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: classIdParam, body: updateClassDto })
  @McpTool({ description: 'Update a class by ID', confirm: { level: 'warning', message: 'confirm.classes.update' } })
  @ResMsg('classes.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateClassDto) {
    return this.classService.update(id, body);
  }

  // ============ DEL ENDPOINTS ============//

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: classIdParam })
  @McpTool({ description: 'Delete a class by ID', confirm: { level: 'danger', message: 'confirm.classes.delete' } })
  @ResMsg('classes.success.deleted')
  async delete(@Params('id') id: string) {
    return this.classService.delete(id);
  }

  @Delete()
  @CanDelete()
  @McpTool({ description: 'Delete all classes', confirm: { level: 'danger', message: 'confirm.classes.deleteAll' } })
  @ResMsg('classes.success.allDeleted')
  async deleteAll() {
    return this.classService.deleteAll();
  }
}
