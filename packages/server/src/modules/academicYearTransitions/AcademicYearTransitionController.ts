import { Body, Controller, Get, Params, Post, User, Validate } from '../../najm';
import { isAdministrator } from '../../auth';
import { academicYearIdParam } from '../academicYears/AcademicYearDto';
import { AcademicYearTransitionService } from './AcademicYearTransitionService';
import {
  academicYearTransitionRunIdParam, commitAcademicYearTransitionDto, previewAcademicYearTransitionDto,
  type CommitAcademicYearTransitionDto, type PreviewAcademicYearTransitionDto,
} from './AcademicYearTransitionDto';

@Controller('/academic-years')
export class AcademicYearTransitionController {
  constructor(private transitions: AcademicYearTransitionService) {}

  @Post('/:id/transition/preview')
  @isAdministrator()
  @Validate({ params: academicYearIdParam, body: previewAcademicYearTransitionDto })
  previewTransition(@Params('id') id: string, @Body() body: PreviewAcademicYearTransitionDto) {
    return this.transitions.preview(id, body);
  }

  @Post('/:id/transition/commit')
  @isAdministrator()
  @Validate({ params: academicYearIdParam, body: commitAcademicYearTransitionDto })
  commitTransition(@Params('id') id: string, @Body() body: CommitAcademicYearTransitionDto, @User() user: { id: string }) {
    return this.transitions.commit(id, body, user.id);
  }

  @Get('/transition-runs/:runId')
  @isAdministrator()
  @Validate({ params: academicYearTransitionRunIdParam })
  getTransitionRun(@Params('runId') runId: string) {
    return this.transitions.getRun(runId);
  }
}
