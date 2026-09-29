import { Err, Service } from '../../najm';
import { isDateOnly } from '@sms/contracts/academic-years';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import type { SectionContext } from './academicSourceContext';

@Service()
export class AcademicSourceValidator {
  ensureTargetsProvided(sectionIds: string[], date: string) {
    if (!sectionIds.length || !isDateOnly(date)) Err(400, 'A date and target sections are required');
  }

  ensureTargetContexts(contexts: SectionContext[], expectedCount: number) {
    if (contexts.length !== expectedCount) Err(409, 'An academic target section is missing');
    const labels = new Set(contexts.map((section) => section.academicYear));
    if (labels.size !== 1) Err(409, 'Academic target sections span different years');
  }

  ensureYearHoldsDate(year: ResolvedAcademicYear, date: string) {
    if (year.status === 'draft') Err(409, 'Academic sources cannot be recorded in a draft year');
    if (date < year.reportingStartsOn || date > year.reportingEndsOn) {
      Err(409, 'Academic source date is outside its target sections year');
    }
  }
}
