import type { AttendanceService } from '@server/modules/seed';

function weightedAttendanceStatus(): string {
  // Realistic distribution: ~92% present. Previously 75% present / 10% late /
  // 10% absent, which made the monthly absent+late totals rival the whole roster.
  const r = Math.random();
  if (r < 0.92) return 'present';
  if (r < 0.96) return 'late';     // 4%
  return 'absent';                 // 4%
}

function getSchoolDays(fromDate: Date, toDate: Date): string[] {
  const days: string[] = [];
  const current = new Date(fromDate);
  while (current <= toDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      days.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function createProgressLogger(label: string, total: number, stepPercent = 10) {
  const stepCount = Math.max(1, Math.ceil(total * stepPercent / 100));
  let lastLoggedPercent = -stepPercent;

  return (processed: number, details = '') => {
    const percent = total === 0 ? 100 : Math.floor((processed / total) * 100);
    const shouldLog =
      processed === 0 ||
      processed === total ||
      processed % stepCount === 0 ||
      percent >= lastLoggedPercent + stepPercent;

    if (!shouldLog) return;

    lastLoggedPercent = percent;
    const suffix = details ? ` - ${details}` : '';
    console.log(`  ${label}: ${String(percent).padStart(3, ' ')}% (${processed}/${total})${suffix}`);
  };
}

export async function seedAttendance(
  attendanceService: AttendanceService,
  studentService: any,
  teacherService: any,
  staffService?: any,
) {
  const now = new Date();
  const academicYearStart = new Date(now.getFullYear(), 8, 1);
  if (academicYearStart > now) {
    academicYearStart.setFullYear(academicYearStart.getFullYear() - 1);
  }

  const schoolDays = getSchoolDays(academicYearStart, now);
  if (schoolDays.length === 0) return { studentCount: 0, teacherCount: 0 };

  const sampledDays = schoolDays.filter(() => Math.random() < 0.6);

  const allStudents = await studentService.getAll();
  const studentAttendanceData: any[] = [];
  console.log(`  Attendance plan: ${sampledDays.length} sampled days, ${allStudents.length} students`);
  const logStudentBuildProgress = createProgressLogger('Student attendance generation', allStudents.length);
  logStudentBuildProgress(0, 'prepared 0 records');

  for (const [index, student] of allStudents.entries()) {
    const studentDays = sampledDays.filter(() => Math.random() < 0.6);
    for (const date of studentDays) {
      studentAttendanceData.push({
        type: 'student',
        studentId: student.id,
        date,
        status: weightedAttendanceStatus(),
        notes: Math.random() < 0.05 ? 'Seed generated attendance' : undefined,
      });
    }
    logStudentBuildProgress(index + 1, `prepared ${studentAttendanceData.length} records`);
  }

  const allTeachers = await teacherService.getAll();
  const extraStaff = staffService ? await staffService.getAll() : [];
  const staffById = new Map<string, any>();
  allTeachers.forEach((teacher: any) => {
    if (teacher.staffId) {
      staffById.set(teacher.staffId, { ...teacher, id: teacher.staffId });
    }
  });
  extraStaff.forEach((staffMember: any) => {
    if (staffMember.id) staffById.set(staffMember.id, staffMember);
  });

  const allStaff = [...staffById.values()];
  const staffAttendanceData: any[] = [];
  console.log(`  Attendance plan: ${allStaff.length} staff members`);
  const logStaffBuildProgress = createProgressLogger('Staff attendance generation', allStaff.length);
  logStaffBuildProgress(0, 'prepared 0 records');

  for (const [index, staffMember] of allStaff.entries()) {
    const staffDays = sampledDays.filter(() => Math.random() < 0.85);
    for (const date of staffDays) {
      staffAttendanceData.push({
        type: 'staff',
        staffId: staffMember.id,
        date,
        status: weightedAttendanceStatus(),
        notes: Math.random() < 0.03 ? 'Seed generated attendance' : undefined,
      });
    }
    logStaffBuildProgress(index + 1, `prepared ${staffAttendanceData.length} records`);
  }

  const BATCH_SIZE = 500;
  let studentCount = 0;
  let staffCount = 0;
  const studentBatchTotal = Math.ceil(studentAttendanceData.length / BATCH_SIZE);
  const staffBatchTotal = Math.ceil(staffAttendanceData.length / BATCH_SIZE);
  const logStudentInsertProgress = createProgressLogger('Student attendance inserts', studentBatchTotal);
  const logStaffInsertProgress = createProgressLogger('Staff attendance inserts', staffBatchTotal);
  logStudentInsertProgress(0, 'inserted 0 records');

  for (let i = 0; i < studentAttendanceData.length; i += BATCH_SIZE) {
    const batch = studentAttendanceData.slice(i, i + BATCH_SIZE);
    const result = await attendanceService.seedDemo(batch);
    studentCount += result.length;
    logStudentInsertProgress(Math.floor(i / BATCH_SIZE) + 1, `inserted ${studentCount} records`);
  }

  logStaffInsertProgress(0, 'inserted 0 records');
  for (let i = 0; i < staffAttendanceData.length; i += BATCH_SIZE) {
    const batch = staffAttendanceData.slice(i, i + BATCH_SIZE);
    const result = await attendanceService.seedDemo(batch);
    staffCount += result.length;
    logStaffInsertProgress(Math.floor(i / BATCH_SIZE) + 1, `inserted ${staffCount} records`);
  }

  return { studentCount, staffCount, teacherCount: staffCount };
}
