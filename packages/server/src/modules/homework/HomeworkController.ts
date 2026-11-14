import { McpTool, ToolGroup } from 'najm-mcp';
import { Body, Controller, Delete, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '../../najm';
import { Can } from '../../auth';
import { Homework, Policy, CanCreate, CanDelete, CanList, CanRead, CanUpdate } from './HomeworkGuards';
import { HomeworkService } from './HomeworkService';
import type { HomeworkActor } from './HomeworkValidator';
import {
  acknowledgeHomeworkDto, createHomeworkDto, homeworkAttachmentParams, homeworkIdParam, homeworkPartsQuery, homeworkSectionParam,
  homeworkStudentParam, homeworkUploadDto, updateHomeworkDto,
  type AcknowledgeHomeworkDto, type CreateHomeworkDto, type HomeworkPartsQuery, type UpdateHomeworkDto,
} from './HomeworkDto';

/** Every File in a multipart body, whatever its field is called. */
const uploadedFiles = (body: Record<string, unknown>) => Object.values(body).flatMap((value) =>
  value instanceof File ? [value] : Array.isArray(value) ? value.filter((file): file is File => file instanceof File) : []);

// The reader was already checked against the homework, so the browser may
// keep the file for the session; a shared cache may not.
function fileResponse(bytes: Uint8Array, mimeType: string) {
  return new Response(new Blob([new Uint8Array(bytes)], { type: mimeType }), {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

@ToolGroup('homework')
@Policy(Homework)
@Controller('/homework')
export class HomeworkController {
  constructor(private service: HomeworkService) {}

  @Get()
  @CanList()
  @McpTool({ description: "List the selected year's homework (devoirs · الواجبات المنزلية) the current account may read, newest first. Homework is not an assessment: it has no marks.", readOnly: true })
  @ResMsg('homework.success.retrieved')
  getAll(@User() actor: HomeworkActor) {
    return this.service.getAll({}, actor);
  }

  @Get('/section/:sectionId')
  @CanList()
  @Validate({ params: homeworkSectionParam })
  @McpTool({ description: 'List the homework given to one section', readOnly: true })
  @ResMsg('homework.success.retrieved')
  getBySection(@Params('sectionId') sectionId: string, @User() actor: HomeworkActor) {
    return this.service.getAll({ sectionId }, actor);
  }

  @Get('/student/:studentId')
  @CanList()
  @Validate({ params: homeworkStudentParam })
  @McpTool({ description: 'List the homework given to one student: that of the sections they sat in on each date', readOnly: true })
  @ResMsg('homework.success.retrieved')
  getByStudent(@Params('studentId') studentId: string, @User() actor: HomeworkActor) {
    return this.service.getAll({ studentId }, actor);
  }

  // What the post form offers under a subject: the class's Massar parts that
  // year, or the subject's own sub-subjects. Names only, no pupil data.
  @Get('/parts')
  @Can('read:homework')
  @Validate({ query: homeworkPartsQuery })
  @ResMsg('homework.success.retrieved')
  parts(@Query() query: HomeworkPartsQuery) {
    return this.service.parts(query);
  }

  @Get('/:id')
  @CanRead()
  @Validate({ params: homeworkIdParam })
  @McpTool({ description: 'Get one homework by ID', readOnly: true })
  @ResMsg('homework.success.retrieved')
  getById(@Params('id') id: string, @User() actor: HomeworkActor) {
    return this.service.getById(id, actor);
  }

  // The file itself. It is never a generic storage URL: the homework is read
  // through ownership first, so only its class and its teacher can open it.
  @Get('/:id/attachments/:attachmentId')
  @Can('read:homework')
  @Validate({ params: homeworkAttachmentParams })
  async readAttachment(@Params('id') id: string, @Params('attachmentId') attachmentId: string) {
    const file = await this.service.readAttachment(id, attachmentId);
    return fileResponse(file.bytes, file.mimeType);
  }

  @Post()
  @CanCreate()
  @Validate(createHomeworkDto)
  @McpTool({ description: 'Post homework for one or more sections of a class', confirm: { level: 'warning', message: 'confirm.homework.create' } })
  @ResMsg('homework.success.created')
  create(@Body() body: CreateHomeworkDto, @User() actor: HomeworkActor) {
    return this.service.create(body, actor);
  }

  @Post('/:id/attachments')
  @Can('update:homework')
  @Validate({ params: homeworkIdParam, body: homeworkUploadDto })
  @ResMsg('homework.success.attached')
  addAttachments(@Params('id') id: string, @Body() body: Record<string, unknown>, @User() actor: HomeworkActor) {
    return this.service.addAttachments(id, uploadedFiles(body), actor);
  }

  @Post('/:id/acknowledge')
  @Can('read:homework')
  @Validate({ params: homeworkIdParam, body: acknowledgeHomeworkDto })
  @ResMsg('homework.success.acknowledged')
  acknowledge(@Params('id') id: string, @Body() body: AcknowledgeHomeworkDto, @User() actor: HomeworkActor) {
    return this.service.acknowledge(id, body.studentId, actor);
  }

  @Put('/:id')
  @CanUpdate()
  @Validate({ params: homeworkIdParam, body: updateHomeworkDto })
  @McpTool({ description: 'Update one homework by ID', confirm: { level: 'warning', message: 'confirm.homework.update' } })
  @ResMsg('homework.success.updated')
  update(@Params('id') id: string, @Body() body: UpdateHomeworkDto, @User() actor: HomeworkActor) {
    return this.service.update(id, body, actor);
  }

  @Delete('/:id/attachments/:attachmentId')
  @Can('update:homework')
  @Validate({ params: homeworkAttachmentParams })
  @ResMsg('homework.success.detached')
  removeAttachment(@Params('id') id: string, @Params('attachmentId') attachmentId: string, @User() actor: HomeworkActor) {
    return this.service.removeAttachment(id, attachmentId, actor);
  }

  @Delete('/:id')
  @CanDelete()
  @Validate({ params: homeworkIdParam })
  @McpTool('Delete one homework by ID')
  @ResMsg('homework.success.deleted')
  deleteById(@Params('id') id: string, @User() actor: HomeworkActor) {
    return this.service.delete(id, actor);
  }
}
