import { Injectable } from '@server/najm';
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

  async getScheduleToday(teacherId: string) {
    const teacher = await this.teacherService.getById(teacherId);
    const classes = await this.teacherService.getClasses(teacherId);
    const todayAssessments = await this.assessmentService.getByTeacher(teacherId)
      .then((a: any[]) => {
        const today = new Date().toISOString().split('T')[0];
        return (a || []).filter((ass: any) => ass.date === today);
      })
      .catch(() => []);
    return { teacher, classes, todayAssessments };
  }

  async getPendingGrading(teacherId: string) {
    const [assessments, grades] = await Promise.all([
      this.assessmentService.getByTeacher(teacherId).catch(() => []),
      this.gradeService.getByTeacher(teacherId).catch(() => []),
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
