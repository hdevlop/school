import { Err, I18n, Service } from '../../najm';
import { isDateOnly } from '@sms/contracts/academic-years';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import type { SectionContext } from './academicSourceContext';

@Service()
export class AcademicSourceValidator {
  @I18n('academicSources.errors') private et!: (key: string) => string;
  ensureTargetsProvided(sectionIds: string[], date: string) {
    if (!sectionIds.length || !isDateOnly(date)) Err(400, this.et('dateAndSectionsRequired'));
  }

  ensureTargetContexts(contexts: SectionContext[], expectedCount: number) {
    if (contexts.length !== expectedCount) Err(409, this.et('targetSectionMissing'));
    const labels = new Set(contexts.map((section) => section.academicYear));
    if (labels.size !== 1) Err(409, this.et('sectionsSpanYears'));
  }

  ensureYearHoldsDate(year: ResolvedAcademicYear, date: string) {
    if (year.status === 'draft') Err(409, this.et('draftYear'));
    if (date < year.reportingStartsOn || date > year.reportingEndsOn) {
      Err(409, this.et('dateOutsideYear'));
    }
  }
}
