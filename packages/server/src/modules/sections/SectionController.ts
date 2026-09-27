import { Controller, Get, Post, Put, Delete, Params, Body, User, Validate, ResMsg } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { SectionService } from './SectionService';
import { Section, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './SectionGuards';
import { isAdmin } from '../../auth';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { sectionIdParam, sectionListQuery, createSectionDto, createSectionsBulkDto, updateSectionDto, type CreateSectionDto, type UpdateSectionDto } from './SectionDto';

@ToolGroup('sections')
@Policy(Section)
@Controller('/sections')
export class SectionController {
  constructor(private sectionService: SectionService) { }

  // ========== GET ENDPOINTS ==========//

  @Get()
  @CanList()
  @Validate({ query: sectionListQuery })
  @McpTool('List all sections')
  @ResMsg('sections.success.retrieved')
  async getSections(@Year() year: ResolvedAcademicYear) {
    return this.sectionService.getAll(year);
  }

  @Get('/:id/classes')
  @isAdmin()
  @Validate({ params: sectionIdParam })
  @McpTool('Get classes associated with a section')
  @ResMsg('sections.success.retrieved')
  async getClasses(@Params('id') id: string, @User() user: { role?: string }) {
    return this.sectionService.getClasses(id, user.role);
  }

  @Get('/:id/teachers')
  @isAdmin()
  @Validate({ params: sectionIdParam })
  @McpTool('Get teachers assigned to a section')
  @ResMsg('sections.success.retrieved')
  async getTeachers(@Params('id') id: string, @User() user: { role?: string }) {
    return this.sectionService.getTeachers(id, user.role);
  }

  @Get('/:id/parents')
  @isAdmin()
  @Validate({ params: sectionIdParam })
  @McpTool('Get parents of students in a section')
  @ResMsg('sections.success.retrieved')
  async getParents(@Params('id') id: string, @User() user: { role?: string }) {
    return this.sectionService.getParents(id, user.role);
  }

  @Get('/:id/students')
  @CanRead()
  @Validate({ params: sectionIdParam })
  @McpTool('Get students in a section')
  @ResMsg('sections.success.retrieved')
  async getStudents(@Params('id') id: string, @User() user: { role?: string }) {
    return this.sectionService.getStudents(id, user.role);
  }

  @Get('/:id/analytics')
  @CanRead()
  @Validate({ params: sectionIdParam })
  @McpTool('Get analytics for a section')
  @ResMsg('sections.success.retrieved')
  async getAnalytics(@Params('id') id: string, @User() user: { role?: string }) {
    return this.sectionService.getAnalytics(id, user.role);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: sectionIdParam })
  @McpTool('Get a section by ID')
  @ResMsg('sections.success.retrieved')
  async getSection(@Params('id') id: string, @User() user: { role?: string }) {
    return this.sectionService.getById(id, user.role);
  }

  // ========== POST ENDPOINTS ==========//

  @Post()
  @CanCreate()
  @Validate(createSectionDto)
  @McpTool({ description: 'Create a new section', confirm: { level: 'warning', message: 'confirm.sections.create' } })
  @ResMsg('sections.success.created')
  async create(@Body() body: CreateSectionDto, @User() user: { role?: string }) {
    return this.sectionService.create(body, user.role);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createSectionsBulkDto)
  @ResMsg('sections.success.seeded')
  async seedSections(@Body() body: CreateSectionDto[]) {
    return this.sectionService.seedDemoSections(body);
  }

  // ========== PUT ENDPOINTS ==========//

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: sectionIdParam, body: updateSectionDto })
  @McpTool({ description: 'Update a section by ID', confirm: { level: 'warning', message: 'confirm.sections.update' } })
  @ResMsg('sections.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateSectionDto, @User() user: { role?: string }) {
    return this.sectionService.update(id, body, user.role);
  }

  // ============ DEL ENDPOINTS ============//

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: sectionIdParam })
  @McpTool({ description: 'Delete a section by ID', confirm: { level: 'danger', message: 'confirm.sections.delete' } })
  @ResMsg('sections.success.deleted')
  async delete(@Params('id') id: string) {
    return this.sectionService.delete(id);
  }

  @Delete()
  @CanDelete()
  @McpTool({ description: 'Delete all sections', confirm: { level: 'danger', message: 'confirm.sections.deleteAll' } })
  @ResMsg('sections.success.allDeleted')
  async deleteAll() {
    return this.sectionService.deleteAll();
  }
}
