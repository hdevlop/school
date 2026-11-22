import { ToolGroup } from 'najm-mcp';
import { Body, Controller, Delete, Get, Params, Put, ResMsg, User, Validate } from '../../najm';
import { Can, CanSchoolWide } from '../../auth';
import { canUpdateSubject } from '../subjects/SubjectGuards';
import type { ExamPlanningJson } from '@sms/contracts';
import { ExamPlanningService } from './ExamPlanningService';
import type { PlanningActor } from './ExamPlanningValidator';
import { importExamPlanningDto, planningClassParam, addSubSubjectsDto, planningVisibilityDto, saveExamPlanningDto, type SaveExamPlanningDto } from './ExamPlanningDto';

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

  // What the planner may pick; a teacher plans their own classes' subjects.
  @Get('/subjects')
  @Can('update:exam-planning')
  @ResMsg('exams.success.retrieved')
  subjectOptions(@User() actor: PlanningActor) { return this.service.subjectOptions(actor); }

  // It adds sub-subjects to Subjects: the Subjects permission decides.
  @Put('/subjects')
  @canUpdateSubject()
  @Validate({ body: addSubSubjectsDto })
  @ResMsg('subjects.success.updated')
  addSubSubjects(@Body() body: { add: Array<{ name: string; subjectId: string }> }, @User() actor: PlanningActor) { return this.service.addSubSubjects(body.add, actor); }

  @Put('/import')
  @CanSchoolWide('update:exams')
  @Validate({ body: importExamPlanningDto })
  @ResMsg('exams.success.updated')
  importDocument(@Body() body: { document: ExamPlanningJson }) { return this.service.importDocument(body.document); }

  // A class's month: the school-wide roles plan every subject, a teacher those
  // they teach there (ExamPlanningValidator.ensureMayChange). The rest of the
  // page (visibility, import, clear) stays school-wide.
  @Put('/:classId')
  @Can('update:exam-planning')
  @Validate({ params: planningClassParam, body: saveExamPlanningDto })
  @ResMsg('exams.success.updated')
  saveMonth(@Params('classId') classId: string, @Body() body: SaveExamPlanningDto, @User() actor: PlanningActor) { return this.service.saveMonth(classId, body, actor); }
}
