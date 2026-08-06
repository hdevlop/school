import { Injectable } from '@server/najm';
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

  async getOverview(studentId: string) {
    const [student, parents] = await Promise.all([
      this.studentService.getById(studentId),
      this.parentService ? null : null,
    ]);
    const parentsList = await this.studentService.getParents(studentId);
    return { student, parents: parentsList };
  }

  async getAcademic(studentId: string) {
    const [grades, assessments, exams] = await Promise.all([
      this.gradeService.getByStudent(studentId).catch(() => []),
      this.assessmentService.getAll().catch(() => []),
      this.examService.getAll().catch(() => []),
    ]);
    const upcomingExams = Array.isArray(exams) ? exams.filter((e: any) => new Date(e.examDate) >= new Date()) : [];
    return { grades, upcomingExams, assessments };
  }

  async getAttendanceSummary(studentId: string) {
    const records = await this.attendanceRepository.getByStudent(studentId).catch(() => []);
    const total = Array.isArray(records) ? records.length : 0;
    const present = Array.isArray(records) ? records.filter((r: any) => r.status === 'present').length : 0;
    const absent = Array.isArray(records) ? records.filter((r: any) => r.status === 'absent').length : 0;
    const late = Array.isArray(records) ? records.filter((r: any) => r.status === 'late').length : 0;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, percentage };
  }

  async getFinancial(studentId: string) {
    return await this.feeService.getByStudent(studentId);
  }

  async getTransport(studentId: string) {
    const route = await this.studentRouteService.getByStudentId(studentId).catch(() => null);
    return { route };
  }
}
