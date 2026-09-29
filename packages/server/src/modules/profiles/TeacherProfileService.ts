import { Injectable } from '../../najm';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { holdsDay } from '../academicYears/academicRecordYear';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { TeacherService } from '../teachers/TeacherService';
import { AssessmentService } from '../assessments/AssessmentService';
import { GradeService } from '../grades/GradeService';

@Injectable()
export class TeacherProfileService {
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private teacherService: TeacherService,
    private assessmentService: AssessmentService,
    private gradeService: GradeService,
  ) {}

  async getMyClasses(teacherId: string) {
    const [teacher, classes] = await Promise.all([
      this.teacherService.getById(teacherId),
      this.teacherService.getClasses(teacherId),
    ]);
    return { teacher, classes };
  }

  // Today belongs only to the year whose reporting interval holds the
  // business day; any other year has no today, so its assessments are null.
  async getScheduleToday(teacherId: string) {
    const teacher = await this.teacherService.getById(teacherId);
    const classes = await this.teacherService.getClasses(teacherId);
    const today = getBusinessDateOnly();
    const todayAssessments = holdsDay(this.year, today)
      ? (await this.assessmentService.getAll({ teacherId })).filter((assessment) => assessment.date === today)
      : null;
    return { teacher, classes, todayAssessments };
  }

  async getPendingGrading(teacherId: string) {
    const [assessments, grades] = await Promise.all([
      this.assessmentService.getAll({ teacherId }),
      this.gradeService.getAll({ teacherId }),
    ]);

    const gradedAssessmentIds = new Set(
      (grades as any[]).map((g: any) => g.assessmentId).filter(Boolean),
    );

    const pending = (assessments as any[]).filter(
      (a: any) => !gradedAssessmentIds.has(a.id) && a.status !== 'cancelled',
    );

    return { pendingCount: pending.length, pendingAssessments: pending };
  }

  async getMyStudents(teacherId: string) {
    const [teacher, students] = await Promise.all([
      this.teacherService.getById(teacherId),
      this.teacherService.getStudents(teacherId),
    ]);
    return { teacher, students };
  }
}
