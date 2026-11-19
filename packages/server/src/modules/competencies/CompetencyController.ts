import { McpTool, ToolGroup } from 'najm-mcp';
import { Body, Controller, Delete, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '../../najm';
import { Can } from '../../auth';
import { CompetencyService } from './CompetencyService';
import type { CompetencyActor } from './CompetencyValidator';
import {
  applyDefaultDto, catalogQuery, competencyIdParam, competencyStudentParam, copyCatalogDto, createCompetencyDto, createDomainDto, evaluationsQuery,
  monthQuery, setEvaluationDto, setRemarkDto, studentSheetQuery, updateCompetencyDto, updateDomainDto,
  type ApplyDefaultDto, type CopyCatalogDto, type CreateCompetencyDto, type CreateDomainDto, type EvaluationsQuery, type SetEvaluationDto, type SetRemarkDto,
  type MonthQuery, type StudentSheetQuery, type UpdateCompetencyDto, type UpdateDomainDto,
} from './CompetencyDto';

/**
 * Compétences · الكفايات: the list a teacher follows in a class and subject,
 * and each pupil's level in it month by month. Every read goes through the
 * list's or the level's ownership.
 */
@ToolGroup('competencies')
@Controller('/competencies')
export class CompetencyController {
  constructor(private service: CompetencyService) {}

  @Get('/assignments')
  @Can('read:competencies')
  @McpTool({ description: 'List the classes, sections and subjects whose competencies the current account may open this year', readOnly: true })
  @ResMsg('competencies.success.retrieved')
  listAssignments(@User() actor: CompetencyActor) {
    return this.service.listAssignments(actor);
  }

  @Get('/catalog')
  @Can('read:competencies')
  @Validate({ query: catalogQuery })
  @McpTool({ description: 'List the competencies (compétences · الكفايات) followed in one teaching assignment (class, section and subject), grouped by domain', readOnly: true })
  @ResMsg('competencies.success.retrieved')
  getCatalog(@Query() query: { teacherAssignmentId: string }) {
    return this.service.getCatalog(query.teacherAssignmentId);
  }

  @Get('/evaluations')
  @Can('read:competencies')
  @Validate({ query: evaluationsQuery })
  @McpTool({ description: "List pupils' competency levels in one teaching assignment for a month (YYYY-MM) and for the year's first month", readOnly: true })
  @ResMsg('competencies.success.retrieved')
  getEvaluations(@Query() query: EvaluationsQuery) {
    return this.service.getEvaluations(query);
  }

  @Get('/student/:studentId')
  @Can('read:competencies')
  @Validate({ params: competencyStudentParam, query: studentSheetQuery })
  @McpTool({ description: "Get one pupil's competency sheet for a month (YYYY-MM): levels by domain in a subject, compared with the year's first month", readOnly: true })
  @ResMsg('competencies.success.retrieved')
  getStudentSheet(@Params('studentId') studentId: string, @Query() query: StudentSheetQuery) {
    return this.service.getStudentSheet(studentId, query);
  }

  @Get('/year')
  @Can('read:competencies')
  @Validate({ query: catalogQuery })
  @McpTool({ description: "List pupils' competency levels and the teacher's remarks in one teaching assignment (class, section and subject) for every month of the year", readOnly: true })
  @ResMsg('competencies.success.retrieved')
  getYearLevels(@Query() query: { teacherAssignmentId: string }) {
    return this.service.getYearLevels(query);
  }

  @Post('/domains')
  @Can('create:competencies')
  @Validate(createDomainDto)
  @ResMsg('competencies.success.created')
  createDomain(@Body() body: CreateDomainDto, @User() actor: CompetencyActor) {
    return this.service.createDomain(body, actor);
  }

  @Put('/domains/:id')
  @Can('update:competencies')
  @Validate({ params: competencyIdParam, body: updateDomainDto })
  @ResMsg('competencies.success.updated')
  updateDomain(@Params('id') id: string, @Body() body: UpdateDomainDto, @User() actor: CompetencyActor) {
    return this.service.updateDomain(id, body, actor);
  }

  @Delete('/domains/:id')
  @Can('delete:competencies')
  @Validate({ params: competencyIdParam, query: monthQuery })
  @ResMsg('competencies.success.deleted')
  deleteDomain(@Params('id') id: string, @Query() query: MonthQuery, @User() actor: CompetencyActor) {
    return this.service.deleteDomain(id, query.month, actor);
  }

  @Post('/copy')
  @Can('create:competencies')
  @Validate(copyCatalogDto)
  @ResMsg('competencies.success.copied')
  copyCatalog(@Body() body: CopyCatalogDto, @User() actor: CompetencyActor) {
    return this.service.copyCatalog(body, actor);
  }

  @Post('/default')
  @Can('create:competencies')
  @Validate(applyDefaultDto)
  @ResMsg('competencies.success.defaultApplied')
  applyDefault(@Body() body: ApplyDefaultDto, @User() actor: CompetencyActor) {
    return this.service.applyDefault(body, actor);
  }

  @Put('/evaluations')
  @Can('update:competencies')
  @Validate(setEvaluationDto)
  @McpTool({ description: "Set one pupil's level in one competency for a month (YYYY-MM); level null clears it (Non évalué)", confirm: { level: 'warning', message: 'confirm.competencies.evaluate' } })
  @ResMsg('competencies.success.evaluated')
  setEvaluation(@Body() body: SetEvaluationDto, @User() actor: CompetencyActor) {
    return this.service.setEvaluation(body, actor);
  }

  @Put('/remarks')
  @Can('update:competencies')
  @Validate(setRemarkDto)
  @ResMsg('competencies.success.remarked')
  setRemark(@Body() body: SetRemarkDto, @User() actor: CompetencyActor) {
    return this.service.setRemark(body, actor);
  }

  @Post()
  @Can('create:competencies')
  @Validate(createCompetencyDto)
  @ResMsg('competencies.success.created')
  createCompetency(@Body() body: CreateCompetencyDto, @User() actor: CompetencyActor) {
    return this.service.createCompetency(body, actor);
  }

  @Put('/:id')
  @Can('update:competencies')
  @Validate({ params: competencyIdParam, body: updateCompetencyDto })
  @ResMsg('competencies.success.updated')
  updateCompetency(@Params('id') id: string, @Body() body: UpdateCompetencyDto, @User() actor: CompetencyActor) {
    return this.service.updateCompetency(id, body, actor);
  }

  @Delete('/:id')
  @Can('delete:competencies')
  @Validate({ params: competencyIdParam, query: monthQuery })
  @ResMsg('competencies.success.deleted')
  deleteCompetency(@Params('id') id: string, @Query() query: MonthQuery, @User() actor: CompetencyActor) {
    return this.service.deleteCompetency(id, query.month, actor);
  }
}
