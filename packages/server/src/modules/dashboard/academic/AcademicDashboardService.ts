import { Injectable } from '../../../najm';
import { StudentService } from '../../students/StudentService';
import { TeacherService } from '../../teachers/TeacherService';
import { AttendanceRepository } from '../../attendance/AttendanceRepository';
import { GradeService } from '../../grades/GradeService';
import { GradeRepository } from '../../grades/GradeRepository';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';

@Injectable()
export class AcademicDashboardService {
  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private attendanceRepository: AttendanceRepository,
    private gradeService: GradeService,
    private gradeRepository: GradeRepository
  ) {}

  // The year's students and grades; today's attendance only counts in the
  // year that holds today.
  async getKpis(year: ResolvedAcademicYear) {
    const [
      studentsCount,
      teachersCount,
      todayAttendance,
      allGrades,
    ] = await Promise.all([
      this.studentService.getCount(year).catch(() => ({ count: 0 })),
      this.teacherService.getCount().catch(() => ({ count: 0 })),
      this.attendanceRepository.getToday('student'),
      this.gradeService.getAll(),
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
