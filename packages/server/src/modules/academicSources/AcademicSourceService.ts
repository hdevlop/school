import { Service } from '../../najm';
import { AcademicYearValidator } from '../academicYears/AcademicYearValidator';
import { SectionRepository } from '../sections/SectionRepository';
import { targetSectionIds, type SourceContext } from './academicSourceContext';
import { AcademicSourceValidator } from './AcademicSourceValidator';

@Service()
export class AcademicSourceService {
  constructor(
    private years: AcademicYearValidator,
    private sections: SectionRepository,
    private validator: AcademicSourceValidator,
  ) {}

  /** The class year of every section the given sources target, by section ID. */
  async sectionContexts(sources: SourceContext[]) {
    const ids = [...new Set(sources.flatMap(targetSectionIds))];
    return new Map((await this.sections.listYearContexts(ids)).map((section) => [section.id, section]));
  }

  /** A new or moved source must target sections of one non-draft year that holds its date. */
  async ensureTargetsValid(sectionIds: string[], date: string) {
    const uniqueIds = [...new Set(sectionIds)];
    this.validator.ensureTargetsProvided(uniqueIds, date);
    const contexts = await this.sections.listYearContexts(uniqueIds);
    this.validator.ensureTargetContexts(contexts, uniqueIds.length);
    const year = await this.years.requireLabel(contexts[0].academicYear);
    this.validator.ensureYearHoldsDate(year, date);
    return year;
  }
}
