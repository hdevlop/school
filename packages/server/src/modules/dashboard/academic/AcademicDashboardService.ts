import { Injectable } from '../../../najm';
import { StudentService } from '../../students/StudentService';
import { TeacherService } from '../../teachers/TeacherService';
import { AttendanceRepository } from '../../attendance/AttendanceRepository';
import { GradeService } from '../../grades/GradeService';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { holdsDay } from '../../academicYears/academicRecordYear';
import { getBusinessDateOnly } from '../../../shared/businessDate';

@Injectable()
export class AcademicDashboardService {
  // Its own rule needs the year; students take it explicitly until their
  // own module turn.
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private studentService: StudentService,
    private teacherService: TeacherService,
    private attendanceRepository: AttendanceRepository,
    private gradeService: GradeService,
  ) {}

  // The year's enrolled students and grades; teachers are counted as they are
  // now. Today's attendance rate belongs only to the year that holds today,
  // and needs a mark to be a rate: otherwise it is null, not 0%.
  async getKpis() {
    const holdsToday = holdsDay(this.year, getBusinessDateOnly());
    const [
      studentsCount,
      teachersCount,
      todayAttendance,
      allGrades,
    ] = await Promise.all([
      this.studentService.getCount(),
      this.teacherService.getCount(),
      holdsToday ? this.attendanceRepository.getToday('student') : null,
      this.gradeService.getAll(),
    ]);

    const attendanceRecords = (todayAttendance ?? []) as any[];
    const presentCount = attendanceRecords.filter((r: any) => r.status === 'present').length;
    const attendanceRate = attendanceRecords.length > 0
      ? Math.round((presentCount / attendanceRecords.length) * 100)
      : null;

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
