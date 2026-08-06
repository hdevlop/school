import { Controller, Get, Post, Put, Delete, Params, Body, Validate, ResMsg } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { SubjectService } from './SubjectService';
import { canAccessSubject, canUpdateSubject, canCreateSubject, canDeleteSubject } from './SubjectGuards';
import { createSubjectDto, createSubjectsBulkDto, updateSubjectDto, subjectIdParam, type CreateSubjectDto, type CreateSubjectsBulkDto, type UpdateSubjectDto } from './SubjectDto';

@ToolGroup('subjects')
@Controller('/subjects')
export class SubjectController {
  constructor(private subjectService: SubjectService) { }

  @Get()
  @canAccessSubject()
  @McpTool('List all subjects')
  @ResMsg('subjects.success.retrieved')
  async getSubjects() {
    return this.subjectService.getAll();
  }

  @Get('/:id')
  @canAccessSubject()
  @Validate({ params: subjectIdParam })
  @McpTool('Get a subject by ID')
  @ResMsg('subjects.success.retrieved')
  async getSubject(@Params('id') id: string) {
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

  @Delete('/:id')
  @canDeleteSubject()
  @Validate({ params: subjectIdParam })
  @McpTool({ description: 'Delete a subject', confirm: { level: 'danger', message: 'confirm.subjects.delete' } })
  @ResMsg('subjects.success.deleted')
  async delete(@Params('id') id: string) {
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
