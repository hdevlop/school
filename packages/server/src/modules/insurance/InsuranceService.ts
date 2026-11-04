import { Service } from '../../najm';
import { StudentService } from '../students/StudentService';
import { StudentEnrollmentService } from '../studentEnrollments/StudentEnrollmentService';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

@Service()
export class InsuranceService {
  @Year() private readonly year!: ResolvedAcademicYear;
  constructor(private students: StudentService, private enrollments: StudentEnrollmentService) {}

  /** The selected year's register exposes only the fields printed on it. */
  async getRegister() {
    // Read the owned roster first; history must only be loaded for these students.
    const students = await this.students.getAll();
    const start = Number(this.year.label.slice(0, 4));
    const registerYears = new Set([this.year.label, `${start - 1}-${start}`]);
    const histories = await this.enrollments.listByStudents(students.map(student => student.id));
    return students.map((student) => ({
      id: student.id,
      studentCode: student.studentCode,
      name: student.name,
      arabicName: student.arabicName,
      dateOfBirth: student.dateOfBirth,
      birthplace: student.birthplace,
      birthplaceArabic: student.birthplaceArabic,
      previousSchool: student.previousSchool,
      enrollmentDate: student.enrollmentDate,
      status: student.status,
      class: student.class,
      enrollment: { enrolledOn: student.enrollment?.enrolledOn ?? null },
      levels: (histories.get(student.id) ?? []).flatMap(record => {
        // Placements are newest first, matching the selected-year roster's class.
        const className = record.placements[0]?.className;
        return registerYears.has(record.academicYear.label) && className
          ? [{ academicYear: record.academicYear.label, className }]
          : [];
      }),
    }));
  }
}
