import { Service } from '../../najm';
import { StudentService } from '../students/StudentService';

@Service()
export class InsuranceService {
  constructor(private students: StudentService) {}

  /** The selected year's register exposes only the fields printed on it. */
  async getRegister() {
    return (await this.students.getAll()).map((student) => ({
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
    }));
  }
}
