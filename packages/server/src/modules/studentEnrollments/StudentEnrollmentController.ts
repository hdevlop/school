import { Body, Controller, Get, Params, Post, User, Validate } from '../../najm';
import { isAdministrator } from '../../auth';
import { StudentEnrollmentService } from './StudentEnrollmentService';
import {
  createEnrollmentDto, endEnrollmentDto, enrollmentIdParam, transferEnrollmentDto,
  type CreateEnrollmentDto, type EndEnrollmentDto, type TransferEnrollmentDto,
} from './StudentEnrollmentDto';

@Controller('/student-enrollments')
export class StudentEnrollmentController {
  constructor(private enrollments: StudentEnrollmentService) {}

  @Get('/:id')
  @isAdministrator()
  @Validate({ params: enrollmentIdParam })
  getById(@Params('id') id: string) {
    return this.enrollments.getById(id);
  }

  @Post()
  @isAdministrator()
  @Validate(createEnrollmentDto)
  create(@Body() body: CreateEnrollmentDto, @User() user: { id: string }) {
    return this.enrollments.create(body, user.id);
  }

  @Post('/:id/transfer')
  @isAdministrator()
  @Validate({ params: enrollmentIdParam, body: transferEnrollmentDto })
  transfer(@Params('id') id: string, @Body() body: TransferEnrollmentDto, @User() user: { id: string }) {
    return this.enrollments.transfer(id, body, user.id);
  }

  @Post('/:id/end')
  @isAdministrator()
  @Validate({ params: enrollmentIdParam, body: endEnrollmentDto })
  end(@Params('id') id: string, @Body() body: EndEnrollmentDto, @User() user: { id: string }) {
    return this.enrollments.end(id, body, user.id);
  }
}
