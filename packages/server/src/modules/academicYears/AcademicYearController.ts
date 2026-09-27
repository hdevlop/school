import { Body, Controller, Get, Params, Post, User, Validate } from '../../najm';
import { isAdministrator, isAuth } from '../../auth';
import { AcademicYearService } from './AcademicYearService';
import { academicYearIdParam, createAcademicYearDto, verifyAcademicYearDto, type CreateAcademicYearDto, type VerifyAcademicYearDto } from './AcademicYearDto';

@Controller('/academic-years')
export class AcademicYearController {
  constructor(private years: AcademicYearService) {}

  @Get()
  @isAuth()
  list(@User() user: { role?: string }) {
    return this.years.list(user.role);
  }

  @Get('/:id')
  @isAuth()
  @Validate({ params: academicYearIdParam })
  getById(@Params('id') id: string, @User() user: { role?: string }) {
    return this.years.getById(id, user.role);
  }

  @Post()
  @isAdministrator()
  @Validate(createAcademicYearDto)
  create(@Body() body: CreateAcademicYearDto, @User() user: { id: string }) {
    return this.years.create(body, user.id);
  }

  @Post('/:id/verify-calendar')
  @isAdministrator()
  @Validate({ params: academicYearIdParam, body: verifyAcademicYearDto })
  verifyCalendar(@Params('id') id: string, @Body() body: VerifyAcademicYearDto, @User() user: { id: string }) {
    return this.years.verifyCalendar(id, body.evidenceNote, user.id);
  }

  @Post('/:id/activate')
  @isAdministrator()
  @Validate({ params: academicYearIdParam })
  activate(@Params('id') id: string, @User() user: { id: string; role?: string }) {
    return this.years.activate(id, { id: user.id, role: user.role });
  }

  @Post('/:id/close')
  @isAdministrator()
  @Validate({ params: academicYearIdParam })
  close(@Params('id') id: string, @User() user: { id: string }) {
    return this.years.close(id, user.id);
  }
}
