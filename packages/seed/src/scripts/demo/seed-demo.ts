#!/usr/bin/env bun

import { RoleService } from 'najm-auth';
import { db } from '@server/database/db';
import { staffRoles } from '@server/database/schema';
import {
  SettingsService,
  SubjectService,
  ClassService,
  SectionService,
  FeeTypeService,
  ParentService,
  DriverService,
  VehicleService,
  TeacherService,
  StudentService,
  FeeService,
  PaymentService,
  ExpenseService,
  AttendanceService,
  VehicleAssignmentService,
  StudentRouteService,
  PayrollService,
  StaffService,
  AnnouncementService,
  EventService,
  AssessmentService,
  ExamService,
  GradeService,
  AlertService,
  RefuelService,
  MaintenanceService,
  DisciplineService,
  BehaviorRewardService,
} from '@server/modules/seed';
import rolesData from '../admin/data/roles.json';
import { runSeedTask } from '../shared/run-seed';
import { schoolSeedData } from '../shared/school-seed-data';
import { seedAttendance } from '../shared/seed-attendance';
import {
  alertsPack,
  announcementsPack,
  assessmentsPack,
  eventsPack,
  examsPack,
  expensesPack,
  gradesPack,
  maintenancePack,
  payrollPack,
  refuelsPack,
  selectedDemoClassNames,
  staffPack,
  studentRoutesPack,
  studentsPack,
  teachersPack,
  transportPack,
  vehicleAssignmentsPack,
  disciplinePack,
  behaviorRewardsPack,
} from './generator';

// generate all data in-memory from CLI params (--students, --teachers, --expenses)
const { students: studentsData, parents: parentsData, fees: feesData } = await studentsPack();
const { teachers: teachersData } = await teachersPack();
const { drivers: driversData, vehicles } = await transportPack();
const { expenses: expensesData } = await expensesPack();
const { announcements: announcementsData } = announcementsPack();
const { events: eventsData } = eventsPack();
const { assessments: assessmentsData } = assessmentsPack(teachersData);
const { exams: examsData } = examsPack(teachersData);
const { alerts: alertsData } = alertsPack(studentsData, teachersData);
const { vehicleAssignments: vehicleAssignmentsData } = vehicleAssignmentsPack(vehicles, driversData);
const { studentRoutes: studentRoutesData } = studentRoutesPack(studentsData, vehicles);
const { disciplineIncidents: disciplineIncidentsData } = disciplinePack(studentsData, teachersData);
const { behaviorRewards: behaviorRewardsData } = behaviorRewardsPack(studentsData, teachersData);
const { refuels: refuelsData } = refuelsPack(vehicles, driversData);
const { maintenance: maintenanceData } = maintenancePack(vehicles);
const { staff: staffData } = staffPack();
const { payrollPeriods } = payrollPack();

const selectedClassIds = new Set(
  schoolSeedData.classesData
    .filter((classItem: any) => selectedDemoClassNames.includes(classItem.name))
    .map((classItem: any) => classItem.id),
);
const selectedClassesData = schoolSeedData.classesData.filter((classItem: any) =>
  selectedClassIds.has(classItem.id),
);
const selectedSectionsData = schoolSeedData.sectionsData.filter((section: any) =>
  selectedClassIds.has(section.classId),
);

const normalizedVehiclesData = vehicles.map((vehicle: any) => ({
  ...vehicle,
  image: null,
  purchasePrice: vehicle.purchasePrice != null ? Number(vehicle.purchasePrice) : null,
  initialMileage: vehicle.initialMileage != null ? Number(vehicle.initialMileage) : null,
  currentMileage: vehicle.currentMileage != null ? Number(vehicle.currentMileage) : null,
}));

const normalizedFeesData = feesData.map((fee: any) => ({
  ...fee,
  baseAmount: undefined,
  grossAmount: undefined,
  netAmount: undefined,
  paidAmount: undefined,
  status: undefined,
  // Let FeeService resolve the effective date per student from their
  // enrollment date (max of enrollmentDate and academic-year start), so
  // mid-year enrollees don't fail the "billable enrollment period" rule.
  effectiveDate: undefined,
}));

const uniqueFeesData = Array.from(
  new Map(
    normalizedFeesData.map((fee: any) => [
      `${fee.studentId}:${fee.academicYear}:${fee.feeTypeId}`,
      fee,
    ]),
  ).values(),
);

const STAFF_ROLE_DATA = [
  { code: 'teacher', label: 'Teacher', labels: { fr: 'Enseignant', ar: 'أستاذ', es: 'Profesor' }, category: 'teaching', sortOrder: 10, isSystem: true },
  { code: 'driver', label: 'Driver', labels: { fr: 'Chauffeur', ar: 'سائق', es: 'Conductor' }, category: 'transport', sortOrder: 20, isSystem: true },
  { code: 'busAssistant', label: 'Bus Assistant', labels: { fr: 'Assistant de bus', ar: 'مساعد الحافلة', es: 'Auxiliar de bus' }, category: 'transport', sortOrder: 21, isSystem: false },
  { code: 'principal', label: 'Principal', labels: { fr: 'Directeur', ar: 'مدير', es: 'Director' }, category: 'administration', sortOrder: 30, isSystem: false },
  { code: 'secretary', label: 'Secretary', labels: { fr: 'Secrétaire', ar: 'سكرتير', es: 'Secretario' }, category: 'administration', sortOrder: 31, isSystem: false },
  { code: 'receptionist', label: 'Receptionist', labels: { fr: 'Réceptionniste', ar: 'موظف الاستقبال', es: 'Recepcionista' }, category: 'administration', sortOrder: 32, isSystem: false },
  { code: 'accountant', label: 'Accountant', labels: { fr: 'Comptable', ar: 'محاسب', es: 'Contable' }, category: 'administration', sortOrder: 33, isSystem: false },
  { code: 'librarian', label: 'Librarian', labels: { fr: 'Bibliothécaire', ar: 'أمين المكتبة', es: 'Bibliotecario' }, category: 'support', sortOrder: 40, isSystem: false },
  { code: 'itSupport', label: 'IT Support', labels: { fr: 'Support informatique', ar: 'دعم تقني', es: 'Soporte informático' }, category: 'support', sortOrder: 41, isSystem: false },
  { code: 'assistant', label: 'Assistant', labels: { fr: 'Assistant', ar: 'مساعد', es: 'Asistente' }, category: 'support', sortOrder: 42, isSystem: false },
  { code: 'cleaner', label: 'Cleaner', labels: { fr: "Agent d'entretien", ar: 'عامل النظافة', es: 'Personal de limpieza' }, category: 'operations', sortOrder: 50, isSystem: false },
  { code: 'security', label: 'Security', labels: { fr: 'Agent de sécurité', ar: 'حارس الأمن', es: 'Seguridad' }, category: 'operations', sortOrder: 51, isSystem: false },
  { code: 'other', label: 'Other', labels: { fr: 'Autre', ar: 'آخر', es: 'Otro' }, category: 'support', sortOrder: 99, isSystem: false },
];

async function seedStaffRoles() {
  for (const role of STAFF_ROLE_DATA) {
    await db
      .insert(staffRoles)
      .values({
        code: role.code,
        label: role.label,
        labels: role.labels,
        category: role.category,
        sortOrder: role.sortOrder,
        isSystem: role.isSystem,
        active: true,
      })
      .onConflictDoUpdate({
        target: staffRoles.code,
        set: {
          label: role.label,
          labels: role.labels,
          category: role.category,
          sortOrder: role.sortOrder,
          isSystem: role.isSystem,
          active: true,
        },
      });
  }
  return STAFF_ROLE_DATA.length;
}

// ─────────────────────────────────────────────
// PAYMENT SEEDING
// Runs after fees + installments are created.
// Groups fees by student so one payment record
// covers all of a student's paid installments.
//
// Scenarios (per student):
//   80% → pay every past-due installment (partiallyPaid mid-year, paid if all done)
//   12% → pay first half of past-due installments (partiallyPaid)
//    8% → no payment (overdue)
// Tuned so collected tuition (~87% of billed) comfortably clears monthly
// payroll — a realistic school economy, not the old 55%-collection demo where
// paid payroll always outran collected income on the Income-vs-Expenses chart.
// ─────────────────────────────────────────────

const PAYMENT_METHODS = ['cash', 'bankTransfer', 'check', 'creditCard', 'debitCard', 'online'];
const COMPLETED_PAYMENT_METHODS = ['cash', 'bankTransfer', 'creditCard', 'debitCard', 'online'];
const LATE_SUMMER_PAYMENT_CAP = 25_000;
const LATE_SUMMER_PAYMENT_RATE = 0.04;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getMonthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function getLateSummerPaymentDate(today: string) {
  const now = new Date(`${today}T00:00:00`);
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month === 6 || month === 7) return today;
  if (month > 7) return `${year}-07-02`;
  return today;
}

function getFirstUnpaidPastDueInstallment(studentData: any, cutoffDate: string) {
  const candidates = [];

  for (const fee of studentData.fees ?? []) {
    for (const inst of (fee.installments as any[]) ?? []) {
      if (inst.dueDate > cutoffDate) continue;
      const amount = Number(inst.amount ?? 0);
      const paidAmount = Number(inst.paidAmount ?? 0);
      const remaining = Math.round((amount - paidAmount) * 100) / 100;
      if (remaining <= 0) continue;
      candidates.push({
        feeId: fee.id,
        number: inst.number,
        dueDate: inst.dueDate,
        amount: remaining,
      });
    }
  }

  return candidates.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}

function createProgressLogger(label: string, total: number, stepPercent = 5) {
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

async function seedPayments(feeService: FeeService, paymentService: PaymentService) {
  // getAll() returns the student-grouped overview — we only need the student IDs
  const studentRows = await feeService.getAll();
  const today = new Date().toISOString().split('T')[0];
  const lateSummerPaymentDate = getLateSummerPaymentDate(today);
  const lateSummerPaymentLimit = Math.max(1, Math.ceil(studentRows.length * LATE_SUMMER_PAYMENT_RATE));

  let paymentCount = 0;
  let skippedCount = 0;
  let latePaymentCount = 0;
  let latePaymentTotal = 0;
  const skippedStudentIds: string[] = [];
  const logPaymentProgress = createProgressLogger('Payment seeding', studentRows.length);
  logPaymentProgress(0, 'created 0, skipped 0');

  for (const [index, row] of studentRows.entries()) {
    const studentId = row.student.id;
    try {
      const scenario = Math.random();

      // 8% of students -> no payment, fees remain overdue
      if (scenario < 0.08) {
        skippedCount++;
        skippedStudentIds.push(studentId);
        continue;
      }

      // Fetch full fee list with installments for this student
      const studentData = await feeService.getByStudent(studentId);
      if (!studentData) continue;

      // Collect all installments to pay, keyed by their due-date month
      const byMonth = new Map<string, { feeId: string; number: number; amount: number; dueDate: string }[]>();

      for (const fee of studentData.fees) {
        const installments: any[] = (fee.installments as any[]) ?? [];
        const pastDue = installments
          .filter((i: any) => i.dueDate <= today)
          .sort((a: any, b: any) => a.number - b.number);

        if (pastDue.length === 0) continue;

        // 12% partially paid -> pay only the first half of past-due installments
        // 80% fully paid -> pay all past-due installments
        const toPay = scenario < 0.20
          ? pastDue.slice(0, Math.ceil(pastDue.length / 2))
          : pastDue;

        for (const inst of toPay) {
          const amount = Number(inst.amount);
          // Skip zero-amount installments (e.g. 100%-discounted fees) — the
          // payment validator rejects allocations with amount <= 0.
          if (!(amount > 0)) continue;
          const monthKey = getMonthKey(inst.dueDate);
          if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
          byMonth.get(monthKey)!.push({
            feeId: fee.id,
            number: inst.number,
            amount,
            dueDate: inst.dueDate,
          });
        }
      }

      if (byMonth.size === 0) continue;

      // Create one payment per month so income distributes across the chart
      for (const [, monthInstallments] of byMonth) {
        const allocations = monthInstallments.map(({ feeId, number, amount }) => ({ feeId, number, amount }));
        const totalAmount = allocations.reduce((sum, a) => sum + a.amount, 0);
        if (totalAmount <= 0) continue;

        const method = pick(PAYMENT_METHODS);
        const paymentDate = monthInstallments.map(i => i.dueDate).sort().at(-1) ?? today;

        try {
          await paymentService.record({
            studentId,
            amount: totalAmount,
            paymentDate,
            paymentMethod: method,
            checkNumber: method === 'check' ? `CHK-${Math.random().toString().substring(2, 8)}` : null,
            checkDueDate: method === 'check' ? addDays(paymentDate, 30) : null,
            checkBank: method === 'check' ? 'Attijariwafa Bank' : null,
            transactionRef: ['bankTransfer', 'online'].includes(method)
              ? `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
              : null,
            allocations,
            autoAllocate: false,
            keepRemainderAsCredit: false,
          });
          paymentCount++;
        } catch (e: any) {
          console.warn(`  ⚠️  Payment skipped for student ${studentId}: ${e?.message}`);
          if (e?.stack) console.warn(e.stack);
          continue;
        }
      }
    } finally {
      logPaymentProgress(index + 1, `created ${paymentCount}, skipped ${skippedCount}`);
    }
  }

  const lateCandidates = [...skippedStudentIds].sort(() => Math.random() - 0.5);
  const logLateProgress = createProgressLogger('Late-payment pass', lateCandidates.length, 10);
  logLateProgress(0, `created ${latePaymentCount}/${lateSummerPaymentLimit}, total ${latePaymentTotal} MAD`);

  for (const [index, studentId] of lateCandidates.entries()) {
    if (latePaymentCount >= lateSummerPaymentLimit || latePaymentTotal >= LATE_SUMMER_PAYMENT_CAP) break;

    try {
      const studentData = await feeService.getByStudent(studentId);
      if (!studentData) continue;

      const installment = getFirstUnpaidPastDueInstallment(studentData, lateSummerPaymentDate);
      if (!installment) continue;

      const remainingCap = Math.round((LATE_SUMMER_PAYMENT_CAP - latePaymentTotal) * 100) / 100;
      const amount = Math.min(installment.amount, remainingCap);
      if (amount <= 0) continue;

      const method = pick(COMPLETED_PAYMENT_METHODS);
      try {
        await paymentService.record({
          studentId,
          amount,
          paymentDate: lateSummerPaymentDate,
          paymentMethod: method,
          checkNumber: null,
          transactionRef: ['bankTransfer', 'online'].includes(method)
            ? `LATE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
            : null,
          allocations: [{ feeId: installment.feeId, number: installment.number, amount }],
          autoAllocate: false,
          keepRemainderAsCredit: false,
          notes: 'Late summer catch-up payment for an overdue installment.',
        });
        latePaymentCount++;
        latePaymentTotal = Math.round((latePaymentTotal + amount) * 100) / 100;
        paymentCount++;
      } catch (e: any) {
        console.warn(`  ⚠️  Late payment skipped for student ${studentId}: ${e?.message}`);
        continue;
      }
    } finally {
      logLateProgress(index + 1, `created ${latePaymentCount}/${lateSummerPaymentLimit}, total ${latePaymentTotal} MAD`);
    }
  }

  return { paymentCount, skippedCount, latePaymentCount, latePaymentTotal };
}

async function createSequential<T>(items: T[], create: (item: T) => Promise<any>) {
  const created = [];
  for (const item of items) {
    try {
      created.push(await create(item));
    } catch (error: any) {
      console.warn(`  ⚠️  Seed item skipped: ${error?.message || error}`);
    }
  }
  return created;
}

async function seedConductRecords(
  disciplineService: DisciplineService,
  behaviorRewardService: BehaviorRewardService,
  teachers: any[],
) {
  const teachersById = new Map(teachers.map((teacher: any) => [teacher.id, teacher]));
  let disciplineCount = 0;
  let resolvedCount = 0;
  let rewardCount = 0;

  for (const item of disciplineIncidentsData) {
    const teacher = teachersById.get(item.teacherId) as any;
    if (!teacher?.userId) continue;

    const { teacherId: _teacherId, resolution, ...input } = item;
    try {
      const incident = await disciplineService.create(input as any, {
        id: teacher.userId,
        role: 'teacher',
      });
      disciplineCount++;

      if (resolution && incident?.id) {
        await disciplineService.resolve(incident.id, resolution as any, {
          id: teacher.userId,
          role: 'teacher',
        });
        resolvedCount++;
      }
    } catch (error: any) {
      console.warn(`  ⚠️  Discipline seed skipped for student ${item.studentId}: ${error?.message || error}`);
    }
  }

  for (const item of behaviorRewardsData) {
    const teacher = teachersById.get(item.teacherId) as any;
    if (!teacher?.userId) continue;

    const { teacherId: _teacherId, ...input } = item;
    try {
      await behaviorRewardService.create(input as any, {
        id: teacher.userId,
        role: 'teacher',
      });
      rewardCount++;
    } catch (error: any) {
      console.warn(`  ⚠️  Behavior reward seed skipped for student ${item.studentId}: ${error?.message || error}`);
    }
  }

  return { disciplineCount, resolvedCount, rewardCount };
}

async function seedUniqueFees(feeService: FeeService, fees: any[]) {
  const createdFees = [];
  const knownKeysByStudent = new Map<string, Set<string>>();
  let skippedFees = 0;
  const logFeeProgress = createProgressLogger('Fees + installments', fees.length);
  logFeeProgress(0, 'created 0, skipped 0');

  for (const [index, fee] of fees.entries()) {
    try {
      let knownKeys = knownKeysByStudent.get(fee.studentId);
      if (!knownKeys) {
        const existing = await feeService.getByStudent(fee.studentId);
        knownKeys = new Set(
          (existing?.fees || []).map((existingFee: any) =>
            `${existingFee.academicYear}:${existingFee.feeTypeId}`,
          ),
        );
        knownKeysByStudent.set(fee.studentId, knownKeys);
      }

      const key = `${fee.academicYear}:${fee.feeTypeId}`;
      if (knownKeys.has(key)) {
        skippedFees++;
        continue;
      }

      const createdFee = await feeService.create(fee);
      createdFees.push(createdFee);
      knownKeys.add(key);
    } finally {
      logFeeProgress(index + 1, `created ${createdFees.length}, skipped ${skippedFees}`);
    }
  }

  return createdFees;
}

async function seedPayroll(payrollService: PayrollService, periods: string[]) {
  let createdCount = 0;
  let paidCount = 0;
  const logPayrollProgress = createProgressLogger('Payroll periods', periods.length, 10);
  logPayrollProgress(0, 'created 0 payslips, paid 0');

  for (const [periodIndex, period] of periods.entries()) {
    try {
      const result = await payrollService.runPayroll({ period });
      createdCount += result.createdCount;

      const paymentDate = `${period}-28`;
      const logPayslipProgress = createProgressLogger(`Payroll ${period} payments`, result.created.length, 25);
      logPayslipProgress(0, `paid ${paidCount}`);

      for (const [index, payslip] of result.created.entries()) {
        if (index % 3 !== 0) {
          await payrollService.pay(payslip.id, {
            paymentMethod: 'bankTransfer',
            paymentDate,
            transactionRef: `PAYROLL-${period}-${String(index + 1).padStart(3, '0')}`,
            notes: 'Generated demo payroll payment.',
          });
          paidCount++;
        }
        logPayslipProgress(index + 1, `paid ${paidCount}`);
      }
    } finally {
      logPayrollProgress(periodIndex + 1, `created ${createdCount} payslips, paid ${paidCount}`);
    }
  }

  return { createdCount, paidCount };
}

runSeedTask('demo seed', async (server) => {
  const roleService = await server.container.resolve(RoleService);
  const settingsService = await server.container.resolve(SettingsService);
  const subjectService = await server.container.resolve(SubjectService);
  const classService = await server.container.resolve(ClassService);
  const sectionService = await server.container.resolve(SectionService);
  const feeTypeService = await server.container.resolve(FeeTypeService);
  const parentService = await server.container.resolve(ParentService);
  const driverService = await server.container.resolve(DriverService);
  const vehicleService = await server.container.resolve(VehicleService);
  const vehicleAssignmentService = await server.container.resolve(VehicleAssignmentService);
  const teacherService = await server.container.resolve(TeacherService);
  const staffService = await server.container.resolve(StaffService);
  const studentService = await server.container.resolve(StudentService);
  const studentRouteService = await server.container.resolve(StudentRouteService);
  const feeService = await server.container.resolve(FeeService);
  const paymentService = await server.container.resolve(PaymentService);
  const expenseService = await server.container.resolve(ExpenseService);
  const payrollService = await server.container.resolve(PayrollService);
  const announcementService = await server.container.resolve(AnnouncementService);
  const eventService = await server.container.resolve(EventService);
  const assessmentService = await server.container.resolve(AssessmentService);
  const examService = await server.container.resolve(ExamService);
  const gradeService = await server.container.resolve(GradeService);
  const attendanceService = await server.container.resolve(AttendanceService);
  const alertService = await server.container.resolve(AlertService);
  const refuelService = await server.container.resolve(RefuelService);
  const maintenanceService = await server.container.resolve(MaintenanceService);
  const disciplineService = await server.container.resolve(DisciplineService);
  const behaviorRewardService = await server.container.resolve(BehaviorRewardService);

  console.log('🌱 Starting school demo data seeding...');

  await roleService.seedDefaultRoles(rolesData);
  console.log('✅ Roles ready');

  const staffRolesCount = await seedStaffRoles();
  console.log(`✅ Staff roles ready (${staffRolesCount} roles)`);

  await settingsService.create(schoolSeedData.settingsData);
  console.log('✅ Settings seeded');

  await subjectService.seedDemoSubjects(schoolSeedData.subjectsData);
  console.log('✅ Subjects seeded');

  await classService.seedDemoClasses(selectedClassesData);
  console.log(`✅ Classes seeded (${selectedClassesData.length} records)`);

  await sectionService.seedDemoSections(selectedSectionsData);
  console.log(`✅ Sections seeded (${selectedSectionsData.length} records)`);

  await feeTypeService.seedDemoFeeTypes(schoolSeedData.feeTypesData);
  console.log('✅ Fee types seeded');

  await parentService.createBulk(parentsData);
  console.log('✅ Parents seeded');

  await driverService.createBulk(driversData);
  console.log('✅ Drivers seeded');

  await vehicleService.createBulk(normalizedVehiclesData);
  console.log('✅ Vehicles seeded');

  const createdAssignments = await createSequential(
    vehicleAssignmentsData,
    (item: any) => vehicleAssignmentService.create(item),
  );
  console.log(`✅ Vehicle assignments seeded (${createdAssignments.length} records)`);

  const createdTeachers = await teacherService.createBulk(teachersData);
  console.log(`✅ Teachers seeded (${createdTeachers.length} records)`);

  const createdStaff = await createSequential(staffData, (item) => staffService.create(item));
  console.log(`✅ Extra staff seeded (${createdStaff.length} records)`);

  const createdStudents = await studentService.createBulk(studentsData);
  console.log(`✅ Students seeded (${createdStudents.length} records)`);

  const availableTeachers = await teacherService.getAll();
  const conductResult = await seedConductRecords(
    disciplineService,
    behaviorRewardService,
    availableTeachers,
  );
  console.log(
    `✅ Student conduct seeded (${conductResult.disciplineCount} discipline incidents, ${conductResult.resolvedCount} resolved, ${conductResult.rewardCount} behavior rewards)`,
  );

  const createdStudentRoutes = await createSequential(
    studentRoutesData,
    (item: any) => studentRouteService.assign(item),
  );
  console.log(`✅ Student routes seeded (${createdStudentRoutes.length} records)`);

  const createdFees = await seedUniqueFees(feeService, uniqueFeesData);
  console.log(`✅ Fees + installments seeded (${createdFees.length} records)`);

  console.log('💳 Recording payments...');
  const { paymentCount, skippedCount, latePaymentCount, latePaymentTotal } = await seedPayments(feeService, paymentService);
  console.log(
    `✅ Payments seeded (${paymentCount} records, ${skippedCount} students left unpaid, ${latePaymentCount} late summer payments totaling ${latePaymentTotal} MAD)`,
  );

  console.log('💸 Seeding expenses...');
  const createdExpenses = await expenseService.seedDemoExpenses(expensesData);
  console.log(`✅ Expenses seeded (${createdExpenses.length} records)`);

  console.log('🧾 Seeding payroll...');
  const payrollResult = await seedPayroll(payrollService, payrollPeriods);
  console.log(`✅ Payroll seeded (${payrollResult.createdCount} payslips, ${payrollResult.paidCount} paid)`);

  const createdAnnouncements = await announcementService.createBulk(announcementsData);
  console.log(`✅ Announcements seeded (${createdAnnouncements.length} records)`);

  const createdEvents = await createSequential(eventsData, (item) => eventService.create(item));
  console.log(`✅ Events seeded (${createdEvents.length} records)`);

  const createdAssessments = await createSequential(
    assessmentsData,
    (item) => assessmentService.create(item),
  );
  console.log(`✅ Assessments seeded (${createdAssessments.length} records)`);

  const createdExams = await createSequential(examsData, (item) => examService.create(item));
  console.log(`✅ Exams seeded (${createdExams.length} records)`);

  const assessmentContexts = assessmentsData
    .slice(0, createdAssessments.length)
    .map((assessment, index) => ({
      ...assessment,
      id: createdAssessments[index]?.id,
    }))
    .filter((assessment) => assessment.id);
  const examContexts = examsData
    .slice(0, createdExams.length)
    .map((exam, index) => ({
      ...exam,
      id: createdExams[index]?.id,
    }))
    .filter((exam) => exam.id);
  console.log('🧮 Seeding grades...');
  const { grades: gradesData } = gradesPack(
    createdStudents.length ? createdStudents : studentsData,
    assessmentContexts,
    examContexts,
  );
  const assessmentGradeCount = gradesData.filter((grade: any) => grade.assessmentId).length;
  const examGradeCount = gradesData.filter((grade: any) => grade.examId).length;
  console.log(
    `  Grade generation: prepared ${gradesData.length} records ` +
    `(${assessmentGradeCount} assessment, ${examGradeCount} exam)`,
  );
  const createdGrades = await gradeService.seedDemoGrades(gradesData);
  console.log(`✅ Grades seeded (${createdGrades.length} records)`);

  console.log('📋 Seeding attendance...');
  const { studentCount, staffCount } = await seedAttendance(attendanceService, studentService, teacherService, staffService);
  console.log(`✅ Attendance seeded (${studentCount} student records, ${staffCount} staff records)`);

  const createdAlerts = await alertService.seedDemoAlerts(alertsData);
  console.log(`✅ Alerts seeded (${createdAlerts.length} records)`);

  const createdRefuels = await refuelService.seedDemoRefuels(refuelsData);
  console.log(`✅ Refuels seeded (${createdRefuels.length} records)`);

  const createdMaintenance = await maintenanceService.seedDemoMaintenances(maintenanceData);
  console.log(`✅ Maintenance seeded (${createdMaintenance.length} records)`);

  console.log('\n✨ Demo seed completed successfully!');
});
