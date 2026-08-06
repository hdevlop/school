import { Body, Controller, Delete, Get, Params, Post, Put, ResMsg, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { ParentService } from './ParentService';
import { Parent, Policy, CanList, CanRead, CanCreate, CanUpdate, CanDelete } from './ParentGuards';
import { isAdmin } from '@server/auth';
import {
  createParentDto,
  createParentsBulkDto,
  deleteBulkParentDto,
  linkStudentDto,
  parentCinParam,
  parentIdParam,
  parentPhoneParam,
  parentSearchQueryDto,
  unlinkStudentParams,
  updateParentDto,
  type CreateParentsBulkDto,
  type CreateParentDto,
  type DeleteBulkParentDto,
  type LinkStudentDto,
  type ParentSearchQueryDto,
  type UpdateParentDto,
} from './ParentDto';

@ToolGroup('parents')
@Policy(Parent)
@Controller('/parents')
export class ParentController {
  constructor(private parentService: ParentService) { }

  @Get()
  @CanList()
  @McpTool('List all parents')
  @ResMsg('parents.success.retrieved')
  async getParents() {
    return this.parentService.getAll();
  }

  @Post('/search')
  @CanList()
  @Validate(parentSearchQueryDto)
  @McpTool('Search parents by name, CIN, email, or phone')
  @ResMsg('parents.success.retrieved')
  async search(@Body() body: ParentSearchQueryDto) {
    return this.parentService.search(body.q, body.limit);
  }

  @Get('/cin/:cin/exists')
  @CanList()
  @Validate({ params: parentCinParam })
  @McpTool('Check whether a parent CIN exists')
  @ResMsg('parents.success.retrieved')
  async checkCinExists(@Params('cin') cin: string) {
    return this.parentService.checkCinExists(cin);
  }

  @Get('/cin/:cin')
  @CanList()
  @Validate({ params: parentCinParam })
  @McpTool('Get a parent by CIN')
  @ResMsg('parents.success.retrieved')
  async getByCin(@Params('cin') cin: string) {
    return this.parentService.getByCin(cin);
  }

  @Get('/phone/:phone')
  @CanList()
  @Validate({ params: parentPhoneParam })
  @McpTool('Get a parent by phone number')
  @ResMsg('parents.success.retrieved')
  async getByPhone(@Params('phone') phone: string) {
    return this.parentService.getByPhone(phone);
  }

  @Get('/:id/children')
  @CanRead()
  @Validate({ params: parentIdParam })
  @McpTool('Get children linked to a parent')
  @ResMsg('parents.success.retrieved')
  async getChildren(@Params('id') id: string) {
    return this.parentService.getChildren(id);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: parentIdParam })
  @McpTool('Get a parent by ID')
  @ResMsg('parents.success.retrieved')
  async getParent(@Params('id') id: string) {
    return this.parentService.getById(id);
  }

  @Post()
  @CanCreate()
  @Validate(createParentDto)
  @McpTool({ description: 'Create a new parent', confirm: { level: 'warning', message: 'confirm.parents.create' } })
  @ResMsg('parents.success.created')
  async create(@Body() body: CreateParentDto) {
    return this.parentService.create(body);
  }

  @Post('/:id/link-student')
  @CanCreate()
  @Validate({ params: parentIdParam, body: linkStudentDto })
  @McpTool({ description: 'Link a student to a parent', confirm: { level: 'warning', message: 'confirm.parents.linkStudent' } })
  @ResMsg('parents.success.studentLinked')
  async linkStudent(@Params('id') id: string, @Body() body: LinkStudentDto) {
    return this.parentService.linkStudent(id, body.studentId);
  }

  @Post('/seed')
  @isAdmin()
  @Validate(createParentsBulkDto)
  @ResMsg('parents.success.seeded')
  async createBulk(@Body() body: CreateParentsBulkDto) {
    return this.parentService.createBulk(body);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: parentIdParam, body: updateParentDto })
  @McpTool({ description: 'Update a parent by ID', confirm: { level: 'warning', message: 'confirm.parents.update' } })
  @ResMsg('parents.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateParentDto) {
    return this.parentService.update(id, body);
  }

  @Delete('/bulk')
  @CanDelete()
  @Validate(deleteBulkParentDto)
  @McpTool({ description: 'Delete multiple parents by IDs', confirm: { level: 'danger', message: 'confirm.parents.bulkDelete' } })
  @ResMsg('parents.success.bulkDeleted')
  async deleteBulk(@Body() body: DeleteBulkParentDto) {
    return this.parentService.deleteBulk(body.ids);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: parentIdParam })
  @McpTool({ description: 'Delete a parent by ID', confirm: { level: 'danger', message: 'confirm.parents.delete' } })
  @ResMsg('parents.success.deleted')
  async delete(@Params('id') id: string) {
    return this.parentService.delete(id);
  }

  @Delete('/:id/unlink-student/:studentId')
  @CanDelete()
  @Validate({ params: unlinkStudentParams })
  @McpTool({ description: 'Unlink a student from a parent', confirm: { level: 'warning', message: 'confirm.parents.unlinkStudent' } })
  @ResMsg('parents.success.studentUnlinked')
  async unlinkStudent(@Params('id') id: string, @Params('studentId') studentId: string) {
    return this.parentService.unlinkStudent(id, studentId);
  }

  @Delete()
  @CanDelete()
  @McpTool({ description: 'Delete all parents', confirm: { level: 'danger', message: 'confirm.parents.deleteAll' } })
  @ResMsg('parents.success.allDeleted')
  async deleteAll() {
    return this.parentService.deleteAll();
  }
}
