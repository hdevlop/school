import { examPlanningMonths, resolveExamPlanningClasses, type ExamPlanningJson } from '@sms/contracts';
import { Err, I18n, Service } from '../../najm';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { ExamPlanningRepository } from './ExamPlanningRepository';
import type { SaveExamPlanningDto } from './ExamPlanningDto';

@Service()
export class ExamPlanningService {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n() private t!: (key: string) => string;
  constructor(private repository: ExamPlanningRepository) {}

  async getAll() {
    return (await this.repository.getAll()).map(row => ({ ...row, visible: row.visible ?? true, months: row.months ?? {} }));
  }

  async saveMonth(classId: string, data: SaveExamPlanningDto) {
    const classes = await this.getAll();
    if (!classes.some(row => row.id === classId)) Err(404, this.t('classes.errors.notFound'));
    if (!examPlanningMonths(this.year.label).includes(data.month)) Err(400, this.t('validation.theDateMustFallInsideThisSchoolYear'));
    await this.repository.saveMonth(classId, data);
    return this.getAll();
  }

  async saveVisibility(classIds: string[]) {
    const classes = await this.getAll();
    if (classIds.some(id => !classes.some(row => row.id === id))) Err(404, this.t('classes.errors.notFound'));
    await this.repository.saveVisibility(classes.map(row => row.id), classIds);
    return this.getAll();
  }

  async importDocument(document: ExamPlanningJson) {
    if (document.schoolYear !== this.year.label) Err(400, this.t('examPlanning.json.wrongYear'));
    const classes = await this.getAll();
    const resolved = resolveExamPlanningClasses(document, classes);
    if (resolved.success === false) {
      if (resolved.error === 'unknownClasses') Err(404, this.t('examPlanning.json.unknownClasses'));
      Err(409, this.t('examPlanning.json.ambiguousClasses'));
    }
    await this.repository.importDocument(resolved.classes);
    return this.getAll();
  }

  async clearContent() {
    const classes = await this.getAll();
    await this.repository.clearContent(classes.map(cls => cls.id));
    return this.getAll();
  }
}
