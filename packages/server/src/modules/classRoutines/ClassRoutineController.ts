import { Body, Controller, Delete, Get, Params, Post, Put, Query, ResMsg, User, Validate } from '@server/najm';
import { McpTool, ToolGroup } from 'najm-mcp';
import { isAuth, isAdministrator } from '@server/auth';
import { ClassRoutineService } from './ClassRoutineService';
import {
  createRoutineEntryDto,
  createRoutineDutyDto,
  createRoutinePeriodDto,
  createRoutineScheduleDto,
  routineEntryParams,
  routineDutyParams,
  routineIdParam,
  routineListQuery,
  routineLayoutDto,
  routineTeacherParam,
  updateRoutineEntryDto,
  updateRoutineDutyDto,
  updateRoutinePeriodDto,
  updateRoutineScheduleDto,
  type CreateRoutineEntryDto,
  type CreateRoutineDutyDto,
  type CreateRoutinePeriodDto,
  type CreateRoutineScheduleDto,
  type RoutineListQuery,
  type RoutineLayoutDto,
  type UpdateRoutineEntryDto,
  type UpdateRoutineDutyDto,
  type UpdateRoutinePeriodDto,
  type UpdateRoutineScheduleDto,
} from './ClassRoutineDto';

@ToolGroup('class-routines')
@Controller('/class-routines')
export class ClassRoutineController {
  constructor(private service: ClassRoutineService) {}

  @Get('/periods')
  @isAuth()
  @McpTool('List active class routine periods')
  @ResMsg('classRoutines.success.retrieved')
  async getPeriods() { return this.service.getPeriods(); }

  @Post('/periods')
  @isAdministrator()
  @Validate(createRoutinePeriodDto)
  @ResMsg('classRoutines.success.created')
  async createPeriod(@Body() body: CreateRoutinePeriodDto) { return this.service.createPeriod(body); }

  @Put('/periods/:id')
  @isAdministrator()
  @Validate({ params: routineIdParam, body: updateRoutinePeriodDto })
  @ResMsg('classRoutines.success.updated')
  async updatePeriod(@Params('id') id: string, @Body() body: UpdateRoutinePeriodDto) {
    return this.service.updatePeriod(id, body);
  }

  @Get('/assignments/:id')
  @isAuth()
  @Validate({ params: routineIdParam })
  @ResMsg('classRoutines.success.retrieved')
  async getAssignments(@Params('id') sectionId: string) { return this.service.getAssignments(sectionId); }

  @Get('/duty-candidates')
  @isAdministrator()
  @ResMsg('classRoutines.success.retrieved')
  async getDutyCandidates() { return this.service.getDutyCandidates(); }

  @Get('/teachers/:teacherId')
  @isAuth()
  @Validate({ params: routineTeacherParam, query: routineListQuery.pick({ academicYear: true }) })
  @McpTool('Get the current weekly routine for a teacher')
  @ResMsg('classRoutines.success.retrieved')
  async getTeacherRoutine(
    @Params('teacherId') teacherId: string,
    @Query('academicYear') academicYear: string | undefined,
    @User() user: { role?: string; teacherId?: string },
  ) {
    return this.service.getTeacherSchedule(teacherId, academicYear, user);
  }

  @Get('/sections/:id/published')
  @isAuth()
  @Validate({ params: routineIdParam, query: routineListQuery.pick({ academicYear: true }) })
  @ResMsg('classRoutines.success.retrieved')
  async getPublished(@Params('id') sectionId: string, @Query('academicYear') academicYear?: string) {
    return this.service.getPublishedForSection(sectionId, academicYear);
  }

  @Get()
  @isAuth()
  @Validate({ query: routineListQuery })
  @ResMsg('classRoutines.success.retrieved')
  async list(@Query() query: RoutineListQuery = {}) { return this.service.list(query); }

  @Post()
  @isAdministrator()
  @Validate(createRoutineScheduleDto)
  @McpTool({ description: 'Create or return the current class routine', confirm: { level: 'warning', message: 'confirm.classRoutines.create' } })
  @ResMsg('classRoutines.success.created')
  async create(@Body() body: CreateRoutineScheduleDto) { return this.service.create(body); }

  @Post('/:id/entries')
  @isAdministrator()
  @Validate({ params: routineIdParam, body: createRoutineEntryDto })
  @ResMsg('classRoutines.success.entryCreated')
  async addEntry(@Params('id') id: string, @Body() body: CreateRoutineEntryDto) {
    return this.service.addEntry(id, body);
  }

  @Put('/:id/entries/:entryId')
  @isAdministrator()
  @Validate({ params: routineEntryParams, body: updateRoutineEntryDto })
  @ResMsg('classRoutines.success.entryUpdated')
  async updateEntry(
    @Params('id') id: string,
    @Params('entryId') entryId: string,
    @Body() body: UpdateRoutineEntryDto,
  ) { return this.service.updateEntry(id, entryId, body); }

  @Delete('/:id/entries/:entryId')
  @isAdministrator()
  @Validate({ params: routineEntryParams })
  @ResMsg('classRoutines.success.entryDeleted')
  async deleteEntry(@Params('id') id: string, @Params('entryId') entryId: string) {
    return this.service.deleteEntry(id, entryId);
  }

  @Post('/:id/duties')
  @isAdministrator()
  @Validate({ params: routineIdParam, body: createRoutineDutyDto })
  @ResMsg('classRoutines.success.entryCreated')
  async addDuty(@Params('id') id: string, @Body() body: CreateRoutineDutyDto) {
    return this.service.addDuty(id, body);
  }

  @Put('/:id/duties/:dutyId')
  @isAdministrator()
  @Validate({ params: routineDutyParams, body: updateRoutineDutyDto })
  @ResMsg('classRoutines.success.entryUpdated')
  async updateDuty(
    @Params('id') id: string,
    @Params('dutyId') dutyId: string,
    @Body() body: UpdateRoutineDutyDto,
  ) { return this.service.updateDuty(id, dutyId, body); }

  @Delete('/:id/duties/:dutyId')
  @isAdministrator()
  @Validate({ params: routineDutyParams })
  @ResMsg('classRoutines.success.entryDeleted')
  async deleteDuty(@Params('id') id: string, @Params('dutyId') dutyId: string) {
    return this.service.deleteDuty(id, dutyId);
  }

  @Post('/:id/publish')
  @isAdministrator()
  @Validate({ params: routineIdParam })
  @ResMsg('classRoutines.success.published')
  async publish(@Params('id') id: string, @User('id') userId: string) { return this.service.publish(id, userId); }

  @Post('/:id/archive')
  @isAdministrator()
  @Validate({ params: routineIdParam })
  @ResMsg('classRoutines.success.archived')
  async archive(@Params('id') id: string) { return this.service.archive(id); }

  @Put('/:id')
  @isAdministrator()
  @Validate({ params: routineIdParam, body: updateRoutineScheduleDto })
  @ResMsg('classRoutines.success.updated')
  async update(@Params('id') id: string, @Body() body: UpdateRoutineScheduleDto) {
    return this.service.update(id, body);
  }

  @Put('/:id/layout')
  @isAdministrator()
  @Validate({ params: routineIdParam, body: routineLayoutDto })
  @ResMsg('classRoutines.success.updated')
  async updateLayout(@Params('id') id: string, @Body() body: RoutineLayoutDto) {
    return this.service.updateLayout(id, body);
  }

  @Get('/:id')
  @isAuth()
  @Validate({ params: routineIdParam })
  @ResMsg('classRoutines.success.retrieved')
  async getById(@Params('id') id: string) { return this.service.getById(id); }

  @Delete('/:id')
  @isAdministrator()
  @Validate({ params: routineIdParam })
  @ResMsg('classRoutines.success.deleted')
  async delete(@Params('id') id: string) { return this.service.delete(id); }
}
