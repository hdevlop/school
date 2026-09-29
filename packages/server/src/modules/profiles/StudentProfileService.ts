import { Injectable } from '../../najm';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { StudentService } from '../students/StudentService';
import { FeeService } from '../financial/fees/FeeService';
import { AttendanceRepository } from '../attendance/AttendanceRepository';
import { AssessmentService } from '../assessments/AssessmentService';
import { ExamService } from '../exams/ExamService';
import { GradeService } from '../grades/GradeService';
import { StudentRouteService } from '../transport/studentRoutes/StudentRouteService';

@Injectable()
export class StudentProfileService {
  // Students still take the year as an argument (row 35); the other tabs'
  // modules read it themselves.
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private studentService: StudentService,
    private feeService: FeeService,
    private attendanceRepository: AttendanceRepository,
    private assessmentService: AssessmentService,
    private examService: ExamService,
    private gradeService: GradeService,
    private studentRouteService: StudentRouteService,
  ) {}

  // The student with the selected year's class and section, or none when not
  // enrolled that year, and the parents linked now.
  async getOverview(studentId: string) {
    const student = await this.studentService.getById(studentId);
    const parentsList = await this.studentService.getParents(studentId);
    return { student, parents: parentsList };
  }

  // The fee and transport modules have no ownership rules, so every tab first
  // loads the student through its ownership rules: a student the user cannot
  // read is a 404, not an empty tab.
  private async ensureReadable(studentId: string) {
    await this.studentService.ensureReadable(studentId);
  }

  async getAcademic(studentId: string) {
    await this.ensureReadable(studentId);
    // The student's own assessments and exams: those of the section they sat in on
    // each date, not everything the reader may see.
    const [grades, assessments, upcomingExams] = await Promise.all([
      this.gradeService.getByStudent(studentId),
      this.assessmentService.getForStudent(studentId),
      this.examService.getForStudent(studentId, { upcoming: true }),
    ]);
    return { grades, upcomingExams, assessments };
  }

  // The selected year's marks. With none there is no rate: 0% would read as
  // a student who missed every day.
  async getAttendanceSummary(studentId: string) {
    await this.ensureReadable(studentId);
    const records = await this.attendanceRepository.getAll({ studentId });
    const marked = (status: string) => records.filter((record) => record.status === status).length;
    const total = records.length;
    const present = marked('present');
    const percentage = total > 0 ? Math.round((present / total) * 100) : null;
    return { total, present, absent: marked('absent'), late: marked('late'), percentage };
  }

  async getFinancial(studentId: string) {
    await this.ensureReadable(studentId);
    return await this.feeService.getByStudent(studentId);
  }

  // The student's route intervals in the selected year; none is an empty list.
  async getTransport(studentId: string) {
    await this.ensureReadable(studentId);
    const route = await this.studentRouteService.getByStudentId(studentId);
    return { route };
  }
}
