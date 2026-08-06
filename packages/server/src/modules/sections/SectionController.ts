import { Controller, Get, Post, Put, Delete, Params, Body, Validate, ResMsg } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { SectionService } from './SectionService';
import { Section, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './SectionGuards';
import { isAdmin } from '@server/auth';
import { sectionIdParam, createSectionDto, createSectionsBulkDto, updateSectionDto, type CreateSectionDto, type UpdateSectionDto } from './SectionDto';

@ToolGroup('sections')
@Policy(Section)
@Controller('/sections')
export class SectionController {
  constructor(private sectionService: SectionService) { }

  // ========== GET ENDPOINTS ==========//

  @Get()
  @CanList()
  @McpTool('List all sections')
  @ResMsg('sections.success.retrieved')
  async getSections() {
    return this.sectionService.getAll();
  }

  @Get('/:id/classes')
  @isAdmin()
  @Validate({ params: sectionIdParam })
  @McpTool('Get classes associated with a section')
  @ResMsg('sections.success.retrieved')
  async getClasses(@Params('id') id: string) {
    return this.sectionService.getClasses(id);
  }

  @Get('/:id/teachers')
  @isAdmin()
  @Validate({ params: sectionIdParam })
  @McpTool('Get teachers assigned to a section')
  @ResMsg('sections.success.retrieved')
  async getTeachers(@Params('id') id: string) {
    return this.sectionService.getTeachers(id);
  }

  @Get('/:id/parents')
  @isAdmin()
  @Validate({ params: sectionIdParam })
  @McpTool('Get parents of students in a section')
  @ResMsg('sections.success.retrieved')
  async getParents(@Params('id') id: string) {
    return this.sectionService.getParents(id);
  }

  @Get('/:id/students')
  @CanRead()
  @Validate({ params: sectionIdParam })
  @McpTool('Get students in a section')
  @ResMsg('sections.success.retrieved')
  async getStudents(@Params('id') id: string) {
    return this.sectionService.getStudents(id);
  }

  @Get('/:id/analytics')
  @CanRead()
  @Validate({ params: sectionIdParam })
  @McpTool('Get analytics for a section')
  @ResMsg('sections.success.retrieved')
  async getAnalytics(@Params('id') id: string) {
    return this.sectionService.getAnalytics(id);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: sectionIdParam })
  @McpTool('Get a section by ID')
  @ResMsg('sections.success.retrieved')
  async getSection(@Params('id') id: string) {
    return this.sectionService.getById(id);
  }

  // ========== POST ENDPOINTS ==========//

  @Post()
  @CanCreate()
  @Validate(createSectionDto)
  @McpTool({ description: 'Create a new section', confirm: { level: 'warning', message: 'confirm.sections.create' } })
  @ResMsg('sections.success.created')
  async create(@Body() body: CreateSectionDto) {
    return this.sectionService.create(body);
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
  async update(@Params('id') id: string, @Body() body: UpdateSectionDto) {
    return this.sectionService.update(id, body);
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
