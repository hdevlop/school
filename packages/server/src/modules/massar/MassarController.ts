import { McpTool, ToolGroup } from 'najm-mcp';
import { Body, Controller, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '../../najm';
import { Can, CanSchoolWide, Policy } from '../../auth';
import { MassarService } from './MassarService';
import { MassarSheet } from './MassarGuards';
import { MASSAR_MIME } from './workbook/cells';
import type { MassarActor } from './MassarValidator';
import {
  massarAcceptanceDto, massarClassExportDto, massarCommitDto, massarDueDateDto, massarExportDto, massarIdParam, massarMappingDto, massarMarksDto, massarResolveDto, massarRevisionDto, massarPlanDto, massarRoundDto, massarUploadDto,
  type MassarCommit, type MassarMappings, type MassarMarksInput, type MassarPlanInput, type MassarResolve, type MassarRoundInput,
} from './MassarDto';
import { z } from 'zod';

function download(bytes: Uint8Array, name: string, type: string) {
  return new Response(new Blob([new Uint8Array(bytes)], { type }), { headers: { 'Content-Type': type, 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}` } });
}
@ToolGroup('massar')
@Policy(MassarSheet)
@Controller('/massar')
export class MassarController {
  constructor(private service: MassarService) {}

  @Get('/availability')
  @Can('read:massar')
  @ResMsg('massar.success.loaded')
  availability() { return this.service.availability(); }

  @Get('/setup')
  @CanSchoolWide('manage:massar')
  @ResMsg('massar.success.loaded')
  setup() { return this.service.setup(); }

  @Post('/imports/preview')
  @CanSchoolWide('manage:massar')
  @Validate(massarUploadDto)
  @ResMsg('massar.success.previewed')
  preview(@Body() body: Record<string, unknown>, @User() actor: MassarActor) {
    return this.service.previewUploads(Object.values(body).flatMap(value => value instanceof File ? [value] : Array.isArray(value) ? value.filter(file => file instanceof File) : []), actor);
  }

  @Post('/imports/commit')
  @CanSchoolWide('manage:massar')
  @Validate(massarCommitDto)
  @ResMsg('massar.success.imported')
  commit(@Body() body: MassarCommit, @User() actor: MassarActor) { return this.service.commit(body, actor); }

  @Post('/imports/:id/cancel')
  @CanSchoolWide('manage:massar')
  @Validate({ params: massarIdParam })
  @ResMsg('massar.success.saved')
  cancelPreview(@Params('id') id: string, @User() actor: MassarActor) { return this.service.cancelPreview(id, actor); }

  @Put('/mappings')
  @CanSchoolWide('manage:massar')
  @Validate(massarMappingDto)
  @ResMsg('massar.success.saved')
  mappings(@Body() body: MassarMappings) { return this.service.mappings(body); }

  @Post('/students/resolve')
  @CanSchoolWide('manage:massar')
  @Validate(massarResolveDto)
  @ResMsg('massar.success.saved')
  resolvePending(@Body() body: MassarResolve, @User() actor: MassarActor) { return this.service.resolvePending(body, actor); }

  @Post('/students/recheck')
  @CanSchoolWide('manage:massar')
  @ResMsg('massar.success.saved')
  recheckStudents() { return this.service.refreshStudents(); }

  @Get('/rounds')
  @Can('read:massar')
  @McpTool({ description: 'List Massar rounds with sheets visible to the current reader', readOnly: true })
  @ResMsg('massar.success.loaded')
  rounds(@User() actor: MassarActor) { return this.service.rounds(actor); }

  @Get('/rounds/:id/blocked-classes')
  @CanSchoolWide('manage:massar')
  @Validate({ params: massarIdParam })
  @ResMsg('massar.success.loaded')
  blockedClasses(@Params('id') id: string) { return this.service.blockedClasses(id); }

  @Post('/rounds')
  @CanSchoolWide('manage:massar')
  @Validate(massarRoundDto)
  @ResMsg('massar.success.created')
  createRound(@Body() body: MassarRoundInput, @User() actor: MassarActor) { return this.service.createRound(body, actor); }

  @Put('/plan')
  @CanSchoolWide('manage:massar')
  @Validate(massarPlanDto)
  @ResMsg('massar.success.saved')
  savePlan(@Body() body: MassarPlanInput) { return this.service.savePlan(body); }

  @Put('/rounds/:id/due-date')
  @CanSchoolWide('manage:massar')
  @Validate({ params: massarIdParam, body: massarDueDateDto })
  @ResMsg('massar.success.saved')
  changeDueDate(@Params('id') id: string, @Body() body: { dueDate: string | null }) { return this.service.changeDueDate(id, body.dueDate); }

  @Post('/rounds/:id/download')
  @CanSchoolWide('manage:massar')
  @Validate({ params: massarIdParam })
  async downloadRound(@Params('id') id: string) {
    const result = await this.service.downloadRound(id);
    const response = download(result.bytes, 'massar.zip', 'application/zip');
    if (result.receipt) response.headers.set('X-Massar-Receipt', result.receipt);
    return response;
  }

  @Post('/rounds/:id/accept')
  @CanSchoolWide('manage:massar')
  @Validate({ params: massarIdParam, body: massarAcceptanceDto })
  @ResMsg('massar.success.saved')
  acceptDownload(@Params('id') id: string, @Body() body: { receipt: string }) { return this.service.acceptDownload(id, body.receipt); }

  @Post('/rounds/:id/close')
  @CanSchoolWide('manage:massar')
  @Validate({ params: massarIdParam })
  @ResMsg('massar.success.saved')
  closeRound(@Params('id') id: string) { return this.service.closeRound(id); }

  @Post('/rounds/:id/reopen')
  @CanSchoolWide('manage:massar')
  @Validate({ params: massarIdParam })
  @ResMsg('massar.success.saved')
  reopenRound(@Params('id') id: string) { return this.service.reopenRound(id); }

  @Get('/rounds/:id/progress.csv')
  @Can('read:massar')
  @Validate({ params: massarIdParam })
  async progress(@Params('id') id: string) { return download(await this.service.progressCsv(id), 'massar-progress.csv', 'text/csv; charset=utf-8'); }

  @Get('/sheets')
  @Can('read:massar')
  @Validate({ query: z.object({ roundId: z.string().optional() }) })
  @McpTool({ description: 'List visible Massar sheets with progress and missing marks', readOnly: true })
  @ResMsg('massar.success.loaded')
  sheets(@Query('roundId') roundId?: string) { return this.service.sheets(roundId); }

  @Get('/sheets/:id')
  @Can('read:massar')
  @Validate({ params: massarIdParam })
  @McpTool({ description: 'Read one owned Massar sheet, its ordered roster, components and marks', readOnly: true })
  @ResMsg('massar.success.loaded')
  sheetById(@Params('id') id: string, @User() actor: MassarActor) { return this.service.sheet(id, actor); }

  @Put('/sheets/:id/marks')
  @Can('update:massar-marks')
  @Validate({ params: massarIdParam, body: massarMarksDto })
  @ResMsg('massar.success.saved')
  marks(@Params('id') id: string, @Body() body: MassarMarksInput, @User() actor: MassarActor) { return this.service.saveMarks(id, body, actor); }

  @Post('/sheets/:id/submit')
  @Can('update:massar-marks')
  @Validate({ params: massarIdParam, body: massarRevisionDto })
  @ResMsg('massar.success.saved')
  submit(@Params('id') id: string, @Body() body: { revision: number }, @User() actor: MassarActor) { return this.service.submit(id, body.revision, actor); }

  @Post('/sheets/:id/reopen')
  @CanSchoolWide('manage:massar')
  @Validate({ params: massarIdParam, body: massarRevisionDto })
  @ResMsg('massar.success.saved')
  reopen(@Params('id') id: string, @Body() body: { revision: number }) { return this.service.reopen(id, body.revision); }

  @Get('/sheets/:id/empty.xlsx')
  @Can('read:massar')
  @Validate({ params: massarIdParam })
  async empty(@Params('id') id: string) { const result = await this.service.downloadEmpty(id); return download(result.bytes, result.name, MASSAR_MIME); }

  @Post('/export')
  @CanSchoolWide('manage:massar')
  @Validate(massarExportDto)
  async export(@Body() body: { sheetIds: string[]; empty: boolean }) { return download(await this.service.exportSheets(body.sheetIds, body.empty), 'massar.zip', 'application/zip'); }

  /** The open class as Massar files, to check them or try an import; nothing is marked as sent. */
  @Post('/export/class')
  @CanSchoolWide('manage:massar')
  @Validate({ body: massarClassExportDto })
  async exportClass(@Body() body: { sheetIds: string[] }) { const file = await this.service.exportClass(body.sheetIds); return download(file.bytes, file.name, file.type); }
}
