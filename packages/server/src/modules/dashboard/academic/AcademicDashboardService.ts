import { Injectable } from '@server/najm';
import { StudentService } from '../../students/StudentService';
import { TeacherService } from '../../teachers/TeacherService';
import { AttendanceRepository } from '../../attendance/AttendanceRepository';
import { GradeService } from '../../grades/GradeService';
import { AssessmentService } from '../../assessments/AssessmentService';
import { GradeRepository } from '../../grades/GradeRepository';

@Injectable()
export class AcademicDashboardService {
  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private attendanceRepository: AttendanceRepository,
    private gradeService: GradeService,
    private gradeRepository: GradeRepository,
  ) {}

  async getKpis() {
    const [
      studentsCount,
      teachersCount,
      todayAttendance,
      allGrades,
    ] = await Promise.all([
      this.studentService.getCount().catch(() => ({ count: 0 })),
      this.teacherService.getCount().catch(() => ({ count: 0 })),
      this.attendanceRepository.getToday('student').catch(() => []),
      this.gradeService.getAll().catch(() => []),
    ]);

    const attendanceRecords = todayAttendance as any[];
    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r: any) => r.status === 'present').length;
    const attendanceRate = totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 100)
      : 0;

    const grades = allGrades as any[];
    const gradedWithMarks = grades.filter((g: any) => g.marksObtained != null);
    const avgGPA = gradedWithMarks.length > 0
      ? Math.round(
          gradedWithMarks.reduce((sum: number, g: any) => sum + Number(g.marksObtained), 0) /
          gradedWithMarks.length,
        )
      : 0;

    return {
      totalStudents: studentsCount.count || 0,
      totalTeachers: teachersCount.count || 0,
      attendanceRate,
      avgGPA,
      totalGrades: grades.length,
    };
  }
}
