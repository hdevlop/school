import { Injectable } from '../../najm';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { StudentService } from '../students/StudentService';
import { StudentRepository } from '../students/StudentRepository';
import { ParentService } from '../parents/ParentService';
import { FeeService } from '../financial/fees/FeeService';
import { AttendanceRepository } from '../attendance/AttendanceRepository';
import { AssessmentService } from '../assessments/AssessmentService';
import { ExamService } from '../exams/ExamService';
import { GradeService } from '../grades/GradeService';
import { StudentRouteService } from '../transport/studentRoutes/StudentRouteService';

@Injectable()
export class StudentProfileService {
  constructor(
    private studentService: StudentService,
    private studentRepository: StudentRepository,
    private parentService: ParentService,
    private feeService: FeeService,
    private attendanceRepository: AttendanceRepository,
    private assessmentService: AssessmentService,
    private examService: ExamService,
    private gradeService: GradeService,
    private studentRouteService: StudentRouteService,
  ) {}

  async getOverview(studentId: string, year: ResolvedAcademicYear) {
    const student = await this.studentService.getById(studentId, year);
    const parentsList = await this.studentService.getParents(studentId);
    return { student, parents: parentsList };
  }

  // These routes only require sign-in, and the fee and transport modules have
  // no ownership rules, so every tab first loads the student through its
  // ownership rules: a student the user cannot read is a 404, not an empty tab.
  private async ensureReadable(studentId: string) {
    await this.studentService.ensureReadable(studentId);
  }

  async getAcademic(studentId: string, year: ResolvedAcademicYear) {
    await this.ensureReadable(studentId);
    const [grades, assessments, exams] = await Promise.all([
      this.gradeService.getByStudent(studentId, year).catch(() => []),
      this.assessmentService.getAll(year).catch(() => []),
      this.examService.getAll(year).catch(() => []),
    ]);
    const upcomingExams = Array.isArray(exams) ? exams.filter((e: any) => new Date(e.examDate) >= new Date()) : [];
    return { grades, upcomingExams, assessments };
  }

  async getAttendanceSummary(studentId: string, year: ResolvedAcademicYear) {
    await this.ensureReadable(studentId);
    const records = await this.attendanceRepository.getAll({ year, studentId }).catch(() => []);
    const total = Array.isArray(records) ? records.length : 0;
    const present = Array.isArray(records) ? records.filter((r: any) => r.status === 'present').length : 0;
    const absent = Array.isArray(records) ? records.filter((r: any) => r.status === 'absent').length : 0;
    const late = Array.isArray(records) ? records.filter((r: any) => r.status === 'late').length : 0;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, percentage };
  }

  async getFinancial(studentId: string, year: ResolvedAcademicYear) {
    await this.ensureReadable(studentId);
    return await this.feeService.getByStudent(studentId, year);
  }

  async getTransport(studentId: string) {
    await this.ensureReadable(studentId);
    const route = await this.studentRouteService.getByStudentId(studentId).catch(() => null);
    return { route };
  }
}
