import { Body, Controller, Delete, Get, Params, Post, ResMsg, Validate } from '../../najm';
import { Public } from 'najm-guard';
import { RateLimit } from 'najm-rate';
import { CanSchoolWide } from '../../auth';
import { createTeacherRequestDto, teacherRequestIdParam, type CreateTeacherRequestDto } from './TeacherRequestDto';
import { TeacherRequestService } from './TeacherRequestService';

/** Whoever may create a teacher reviews the requests; see also TeacherRequestApprovalController. */
@Controller('/teacher-requests')
export class TeacherRequestController {
  constructor(private service: TeacherRequestService) {}

  // Per address, and a whole staff room can sign up from the school's one connection.
  @Post() @Public() @RateLimit({ limit: 20, window: '1h' }) @Validate(createTeacherRequestDto)
  @ResMsg({ message: 'teacherRequests.success.received', status: 201 })
  create(@Body() input: CreateTeacherRequestDto) { return this.service.create(input); }

  @Get() @CanSchoolWide('create:teachers') @ResMsg('teacherRequests.success.loaded')
  list() { return this.service.list(); }

  @Delete('/:id') @CanSchoolWide('create:teachers') @Validate({ params: teacherRequestIdParam })
  @ResMsg('teacherRequests.success.rejected')
  reject(@Params('id') id: string) { return this.service.reject(id); }
}
