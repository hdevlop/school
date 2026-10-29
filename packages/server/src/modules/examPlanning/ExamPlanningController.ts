import { ToolGroup } from 'najm-mcp';
import { Body, Controller, Delete, Get, Params, Put, ResMsg, Validate } from '../../najm';
import { Can, CanSchoolWide } from '../../auth';
import type { ExamPlanningJson } from '@sms/contracts';
import { ExamPlanningService } from './ExamPlanningService';
import { importExamPlanningDto, planningClassParam, planningVisibilityDto, saveExamPlanningDto, type SaveExamPlanningDto } from './ExamPlanningDto';

@ToolGroup('exam-planning')
@Controller('/exam-planning')
export class ExamPlanningController {
  constructor(private service: ExamPlanningService) {}

  @Get()
  @Can('read:exams')
  @ResMsg('exams.success.retrieved')
  getAll() { return this.service.getAll(); }

  @Delete()
  @CanSchoolWide('update:exams')
  @ResMsg('exams.success.updated')
  clearContent() { return this.service.clearContent(); }

  @Put('/visibility')
  @CanSchoolWide('update:exams')
  @Validate({ body: planningVisibilityDto })
  @ResMsg('exams.success.updated')
  saveVisibility(@Body() body: { classIds: string[] }) { return this.service.saveVisibility(body.classIds); }

  @Put('/import')
  @CanSchoolWide('update:exams')
  @Validate({ body: importExamPlanningDto })
  @ResMsg('exams.success.updated')
  importDocument(@Body() body: { document: ExamPlanningJson }) { return this.service.importDocument(body.document); }

  @Put('/:classId')
  @CanSchoolWide('update:exams')
  @Validate({ params: planningClassParam, body: saveExamPlanningDto })
  @ResMsg('exams.success.updated')
  saveMonth(@Params('classId') classId: string, @Body() body: SaveExamPlanningDto) { return this.service.saveMonth(classId, body); }
}
