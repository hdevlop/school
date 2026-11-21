import { Controller, Get, Post, Put, Delete, Params, Body, Query, Validate, ResMsg } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { SectionService } from './SectionService';
import { Section, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './SectionGuards';
import { isAdmin, CanSchoolWide } from '../../auth';
import { sectionIdParam, sectionListQuery, type SectionListQuery, createSectionDto, createSectionsBulkDto, updateSectionDto, type CreateSectionDto, type UpdateSectionDto } from './SectionDto';

@ToolGroup('sections')
@Policy(Section)
@Controller('/sections')
export class SectionController {
  constructor(private sectionService: SectionService) { }

  // ========== GET ENDPOINTS ==========//

  @Get()
  @CanList()
  @Validate({ query: sectionListQuery })
  // The whole list is about 12 KB, and OSS20B picked MS B's row for "CM1 A"
  // from it (2026-11-21); q returns only the class's sections.
  @McpTool({ description: "List the selected year's sections, each with its id (sectionId) and class. To find one class, pass q with its code alone or with the section (\"CM1 A\", \"cm1a\", \"5AP\"): only its sections are returned. Liste des sections, par exemple 2B. لائحة الأقسام مثل 2B.", readOnly: true })
  @ResMsg('sections.success.retrieved')
  async getSections(@Query() query: SectionListQuery) {
    return this.sectionService.getAll(query?.q);
  }

  @Get('/:id/classes')
  @CanSchoolWide('read:sections')
  @Validate({ params: sectionIdParam })
  @McpTool({ description: 'Get classes associated with a section', readOnly: true })
  @ResMsg('sections.success.retrieved')
  async getClasses(@Params('id') id: string) {
    return this.sectionService.getClasses(id);
  }

  @Get('/:id/teachers')
  @CanSchoolWide('read:sections')
  @Validate({ params: sectionIdParam })
  @McpTool({ description: 'Get teachers assigned to a section. Enseignants d’une section. أساتذة قسم معين.', readOnly: true })
  @ResMsg('sections.success.retrieved')
  async getTeachers(@Params('id') id: string) {
    return this.sectionService.getTeachers(id);
  }

  @Get('/:id/parents')
  @CanSchoolWide('read:sections', 'read:parents')
  @Validate({ params: sectionIdParam })
  @McpTool({ description: 'Get parents of students in a section', readOnly: true })
  @ResMsg('sections.success.retrieved')
  async getParents(@Params('id') id: string) {
    return this.sectionService.getParents(id);
  }

  @Get('/:id/students')
  @CanRead()
  @Validate({ params: sectionIdParam })
  @McpTool({ description: 'Get students in a section. Élèves d’une section. تلاميذ قسم معين.', readOnly: true })
  @ResMsg('sections.success.retrieved')
  async getStudents(@Params('id') id: string) {
    return this.sectionService.getStudents(id);
  }

  @Get('/:id/analytics')
  @CanRead()
  @Validate({ params: sectionIdParam })
  @McpTool({ description: 'Get analytics for a section', readOnly: true })
  @ResMsg('sections.success.retrieved')
  async getAnalytics(@Params('id') id: string) {
    return this.sectionService.getAnalytics(id);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: sectionIdParam })
  @McpTool({ description: 'Get a section by ID', readOnly: true })
  @ResMsg('sections.success.retrieved')
  async getSectionById(@Params('id') id: string) {
    return this.sectionService.getById(id);
  }

  // ========== POST ENDPOINTS ==========//

  @Post()
  @CanCreate()
  @Validate(createSectionDto)
  @McpTool({ description: "Create a section in one of the selected year's classes", confirm: { level: 'warning', message: 'confirm.sections.create' } })
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
  async deleteById(@Params('id') id: string) {
    return this.sectionService.delete(id);
  }

  @Delete()
  @CanDelete()
  @McpTool({ description: "Delete the selected year's sections", confirm: { level: 'danger', message: 'confirm.sections.deleteAll' } })
  @ResMsg('sections.success.allDeleted')
  async deleteAll() {
    return this.sectionService.deleteAll();
  }
}
