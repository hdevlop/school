import { Injectable } from '../../najm';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { TeacherService } from '../teachers/TeacherService';
import { AssessmentService } from '../assessments/AssessmentService';
import { GradeService } from '../grades/GradeService';

@Injectable()
export class TeacherProfileService {
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

  // Today's assessments exist only in the year that holds today; another
  // year's view has none.
  async getScheduleToday(teacherId: string, _year: ResolvedAcademicYear) {
    const teacher = await this.teacherService.getById(teacherId);
    const classes = await this.teacherService.getClasses(teacherId);
    const todayAssessments = await this.assessmentService.getAll({ teacherId })
      .then((a: any[]) => {
        const today = new Date().toISOString().split('T')[0];
        return (a || []).filter((ass: any) => ass.date === today);
      });
    return { teacher, classes, todayAssessments };
  }

  async getPendingGrading(teacherId: string, _year: ResolvedAcademicYear) {
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

  async getMyStudents(teacherId: string, year: ResolvedAcademicYear) {
    const [teacher, students] = await Promise.all([
      this.teacherService.getById(teacherId),
      this.teacherService.getStudents(teacherId, year),
    ]);
    return { teacher, students };
  }
}
