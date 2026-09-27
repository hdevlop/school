import { Body, Controller, Get, Params, Post, Query, User, Validate } from '../../najm';
import { isAdministrator } from '../../auth';
import { AcademicYearMigrationIssueService } from './AcademicYearMigrationIssueService';
import {
  listMigrationIssuesDto, migrationIssueIdParam, reviewMigrationIssueDto,
  type ListMigrationIssuesDto, type ReviewMigrationIssueDto,
} from './AcademicYearMigrationIssueDto';

@Controller('/academic-year-migration-issues')
export class AcademicYearMigrationIssueController {
  constructor(private issues: AcademicYearMigrationIssueService) {}

  @Get()
  @isAdministrator()
  @Validate({ query: listMigrationIssuesDto })
  list(@Query() query: ListMigrationIssuesDto) {
    return this.issues.list(query);
  }

  @Post('/:id/review')
  @isAdministrator()
  @Validate({ params: migrationIssueIdParam, body: reviewMigrationIssueDto })
  review(@Params('id') id: string, @Body() body: ReviewMigrationIssueDto, @User() user: { id: string }) {
    return this.issues.review(id, body, user.id);
  }
}
