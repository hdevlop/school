import { Err, Service } from '../../najm';
import { isDateOnly } from '@sms/contracts/academic-years';
import { AcademicYearValidator } from '../academicYears/AcademicYearValidator';
import { SectionRepository } from '../sections/SectionRepository';
import { targetSectionIds, type SourceContext } from './academicSourceContext';

@Service()
export class AcademicSourceService {
  constructor(
    private years: AcademicYearValidator,
    private sections: SectionRepository,
  ) {}

  /** The class year of every section the given sources target, by section ID. */
  async sectionContexts(sources: SourceContext[]) {
    const ids = [...new Set(sources.flatMap(targetSectionIds))];
    return new Map((await this.sections.listYearContexts(ids)).map((section) => [section.id, section]));
  }

  /** A new or moved source must target sections of one non-draft year that holds its date. */
  async ensureTargetsValid(sectionIds: string[], date: string) {
    const uniqueIds = [...new Set(sectionIds)];
    if (!uniqueIds.length || !isDateOnly(date)) Err(400, 'A date and target sections are required');
    const contexts = await this.sections.listYearContexts(uniqueIds);
    if (contexts.length !== uniqueIds.length) Err(409, 'An academic target section is missing');
    const labels = new Set(contexts.map((section) => section.academicYear));
    if (labels.size !== 1) Err(409, 'Academic target sections span different years');
    const year = await this.years.requireLabel(contexts[0].academicYear);
    if (year.status === 'draft') Err(409, 'Academic sources cannot be recorded in a draft year');
    if (date < year.reportingStartsOn || date > year.reportingEndsOn) {
      Err(409, 'Academic source date is outside its target sections year');
    }
    return year;
  }
}
