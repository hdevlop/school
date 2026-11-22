import { Controller, Get, Post, Put, Delete, Params, Body, Validate, ResMsg, User } from '../../najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { SubjectService } from './SubjectService';
import { canAccessSubject, canUpdateSubject, canCreateSubject, canDeleteSubject, canUpdateLevelSubSubjects } from './SubjectGuards';
import { createSubjectDto, createSubjectsBulkDto, updateSubjectDto, subjectIdParam, subjectLevelParam, saveSubjectLevelDto, type CreateSubjectDto, type CreateSubjectsBulkDto, type UpdateSubjectDto, type SaveSubjectLevelDto } from './SubjectDto';

@ToolGroup('subjects')
@Controller('/subjects')
export class SubjectController {
  constructor(private subjectService: SubjectService) { }

  @Get()
  @canAccessSubject()
  @McpTool({ description: 'List all subjects', readOnly: true })
  @ResMsg('subjects.success.retrieved')
  async getSubjects() {
    return this.subjectService.getAll();
  }

  @Get('/:id')
  @canAccessSubject()
  @Validate({ params: subjectIdParam })
  @McpTool({ description: 'Get a subject by ID', readOnly: true })
  @ResMsg('subjects.success.retrieved')
  async getSubjectById(@Params('id') id: string) {
    return this.subjectService.getById(id);
  }

  @Post()
  @canCreateSubject()
  @Validate(createSubjectDto)
  @McpTool({ description: 'Create a new subject', confirm: { level: 'warning', message: 'confirm.subjects.create' } })
  @ResMsg('subjects.success.created')
  async create(@Body() body: CreateSubjectDto) {
    return this.subjectService.create(body);
  }

  @Post('/seed')
  @canCreateSubject()
  @Validate(createSubjectsBulkDto)
  @McpTool({ description: 'Seed subjects demo data', confirm: { level: 'danger', message: 'confirm.subjects.seed' } })
  @ResMsg('subjects.success.seeded')
  async seedSubjects(@Body() body: CreateSubjectsBulkDto) {
    return this.subjectService.seedDemoSubjects(body);
  }

  @Put('/:id')
  @canUpdateSubject()
  @Validate({ params: subjectIdParam, body: updateSubjectDto })
  @McpTool({ description: 'Update a subject', confirm: { level: 'warning', message: 'confirm.subjects.update' } })
  @ResMsg('subjects.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateSubjectDto) {
    return this.subjectService.update(id, body);
  }

  @Get('/:id/levels/:level')
  @canAccessSubject()
  @Validate({ params: subjectLevelParam })
  @McpTool({ description: "Get the sub-subjects a level (class name) is taught for a subject: its own list, or the school's", readOnly: true })
  @ResMsg('subjects.success.retrieved')
  async getLevelList(@Params('id') id: string, @Params('level') level: string) {
    return this.subjectService.getLevelList(id, level);
  }

  // A teacher edits only a subject they teach in that level (SubjectValidator.ensureMayEditLevel).
  @Put('/:id/levels/:level')
  @canUpdateLevelSubSubjects()
  @Validate({ params: subjectLevelParam, body: saveSubjectLevelDto })
  @McpTool({ description: "Set the sub-subjects one level (class name) is taught for a subject", confirm: { level: 'warning', message: 'confirm.subjects.update' } })
  @ResMsg('subjects.success.updated')
  async saveLevelList(@Params('id') id: string, @Params('level') level: string, @Body() body: SaveSubjectLevelDto, @User() actor: { id?: string; role?: string | null }) {
    return this.subjectService.saveLevelList(id, level, body.names, actor);
  }

  @Delete('/:id')
  @canDeleteSubject()
  @Validate({ params: subjectIdParam })
  @McpTool({ description: 'Delete a subject', confirm: { level: 'danger', message: 'confirm.subjects.delete' } })
  @ResMsg('subjects.success.deleted')
  async deleteById(@Params('id') id: string) {
    return this.subjectService.delete(id);
  }

  @Delete()
  @canDeleteSubject()
  @McpTool({ description: 'Delete all subjects', confirm: { level: 'danger', message: 'confirm.subjects.deleteAll' } })
  @ResMsg('subjects.success.allDeleted')
  async deleteAll() {
    return this.subjectService.deleteAll();
  }
}
