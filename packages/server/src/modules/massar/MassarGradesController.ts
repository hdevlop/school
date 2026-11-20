import { ToolGroup } from 'najm-mcp';
import { Body, Controller, Get, Params, Put, ResMsg, User, Validate } from '../../najm';
import { Can, Policy } from '../../auth';
import { MassarService } from './MassarService';
import { MassarSheet } from './MassarGuards';
import { massarAnalysisDto, massarIdParam, massarMarksDto, massarPartResultDto, massarRemarkDto, type MassarAnalysisInput, type MassarMarksInput, type MassarPartResultInput, type MassarRemarkInput } from './MassarDto';
import type { MassarActor } from './MassarValidator';

/**
 * Massar's grids as Notes shows them, behind Notes' own permissions: a teacher
 * grades on Massar's parts with read:grades and update:grades, and needs none of
 * Massar's permissions, which stay for the Massar pages. The sheet ownership is
 * the same as Massar's (MassarGuards): a teacher reaches only their own grids.
 * REST only; Massar's MCP tools stay on MassarController.
 */
@ToolGroup('massar-grades')
@Policy(MassarSheet)
@Controller('/massar-grades')
export class MassarGradesController {
  constructor(private service: MassarService) {}

  @Get('/sources')
  @Can('read:grades')
  @ResMsg('massar.success.loaded')
  sources() { return this.service.gradeSources(); }

  @Get('/sheets/:id')
  @Can('read:grades')
  @Validate({ params: massarIdParam })
  @ResMsg('massar.success.loaded')
  sheet(@Params('id') id: string, @User() actor: MassarActor) { return this.service.sheet(id, actor, 'notes'); }

  @Put('/sheets/:id/marks')
  @Can('update:grades')
  @Validate({ params: massarIdParam, body: massarMarksDto })
  @ResMsg('massar.success.saved')
  marks(@Params('id') id: string, @Body() body: MassarMarksInput, @User() actor: MassarActor) { return this.service.saveMarks(id, body, actor, 'notes'); }

  /** A teacher's remark on one student, for School's reports; an empty one removes it. */
  @Put('/sheets/:id/remarks')
  @Can('update:grades')
  @Validate({ params: massarIdParam, body: massarRemarkDto })
  @ResMsg('massar.success.saved')
  remark(@Params('id') id: string, @Body() body: MassarRemarkInput, @User() actor: MassarActor) { return this.service.saveRemark(id, body, actor, 'notes'); }

  @Get('/sheets/:id/analyses')
  @Can('read:grades')
  @Validate({ params: massarIdParam })
  @ResMsg('massar.success.loaded')
  analyses(@Params('id') id: string) { return this.service.analyses(id); }

  @Put('/sheets/:id/analyses')
  @Can('update:grades')
  @Validate({ params: massarIdParam, body: massarAnalysisDto })
  @ResMsg('massar.success.saved')
  analysis(@Params('id') id: string, @Body() body: MassarAnalysisInput, @User() actor: MassarActor) { return this.service.saveAnalysis(id, body, actor); }

  /** The parts of the grid's School tests, and how many pupils answered each correctly. */
  @Get('/sheets/:id/parts')
  @Can('read:grades')
  @Validate({ params: massarIdParam })
  @ResMsg('massar.success.loaded')
  parts(@Params('id') id: string) { return this.service.partResults(id); }

  /** One part's count, entered in the class report; null clears it. */
  @Put('/sheets/:id/parts')
  @Can('update:grades')
  @Validate({ params: massarIdParam, body: massarPartResultDto })
  @ResMsg('massar.success.saved')
  partResult(@Params('id') id: string, @Body() body: MassarPartResultInput, @User() actor: MassarActor) { return this.service.savePartResult(id, body, actor); }
}
