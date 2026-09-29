#!/usr/bin/env bun

import { RoleService } from 'najm-auth';
import { db } from '@sms/server/database';
import { sql } from 'drizzle-orm';
import { staffRoles } from '@sms/server/database/schema';
import {
  SettingsService,
  AcademicYearService,
  AcademicYearRepository,
  AcademicYearValidator,
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
  runWithResolvedYear,
  RefuelService,
  MaintenanceService,
  DisciplineService,
  BehaviorRewardService,
} from '@sms/server/modules/seed';
import rolesData from '../admin/data/roles.json';
import { runSeedTask } from '../shared/run-seed';
import { schoolSeedData, seedAcademicYear } from '../shared/school-seed-data';
import { getDemoReferenceDate } from '../shared/academic-year';
import { prepareDemoYear } from '../shared/demo-year';
import { remapDemoAcademicReferences } from '../shared/demo-references';
import { getDemoResumeFrom } from '../shared/demo-resume';
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
const resumeFrom = getDemoResumeFrom();
const studentPack = await studentsPack();
let studentsData = studentPack.students;
const { parents: parentsData, fees: feesData } = studentPack;
let { teachers: teachersData } = await teachersPack();
let { drivers: driversData, vehicles } = await transportPack();
const { expenses: expensesData } = await expensesPack();
const { announcements: announcementsData } = announcementsPack();
const { events: eventsData } = eventsPack();
let { assessments: assessmentsData } = assessmentsPack(teachersData);
let { exams: examsData } = examsPack(teachersData);
let { alerts: alertsData } = alertsPack(studentsData, teachersData);
const { vehicleAssignments: vehicleAssignmentsData } = vehicleAssignmentsPack(vehicles, driversData);
const { studentRoutes: studentRoutesData } = studentRoutesPack(studentsData, vehicles);
const { disciplineIncidents: disciplineIncidentsData } = disciplinePack(studentsData, teachersData);
const { behaviorRewards: behaviorRewardsData } = behaviorRewardsPack(studentsData, teachersData);
let { refuels: refuelsData } = refuelsPack(vehicles, driversData);
let { maintenance: maintenanceData } = maintenancePack(vehicles);
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
  // The dated assignment phase below owns the demo's driver history.
  driverId: undefined,
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

const TOTAL_SEED_PHASES = 29;
let completedSeedPhases = 0;

async function seedPhase<T>(label: string, task: () => Promise<T>): Promise<T> {
  const phase = completedSeedPhases + 1;
  const startedAt = performance.now();
  console.log(`  [${phase}/${TOTAL_SEED_PHASES}] ${label}: starting`);
  const heartbeat = setInterval(() => {
    const elapsedSeconds = Math.floor((performance.now() - startedAt) / 1000);
    console.log(`  [${phase}/${TOTAL_SEED_PHASES}] ${label}: still running (${elapsedSeconds}s)`);
  }, 15_000);

  try {
    const result = await task();
    completedSeedPhases++;
    const percent = Math.round(completedSeedPhases / TOTAL_SEED_PHASES * 100);
    const elapsedSeconds = ((performance.now() - startedAt) / 1000).toFixed(1);
    console.log(`  [${completedSeedPhases}/${TOTAL_SEED_PHASES}] ${percent}% complete: ${label} (${elapsedSeconds}s)`);
    return result;
  } catch (error) {
    console.error(`  [${phase}/${TOTAL_SEED_PHASES}] ${label}: failed`);
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}

async function seedPayments(feeService: FeeService, paymentService: PaymentService, seededStudentIds: Set<string>) {
  // Only the selected year's students created by this run receive demo payments.
  const studentRows = (await feeService.getAll()).filter((row) => seededStudentIds.has(row.student.id));
  const today = getDemoReferenceDate(seedAcademicYear).toISOString().split('T')[0];
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

      // Fetch only the selected year's fees and installments.
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

async function createSequential<T>(label: string, items: T[], create: (item: T) => Promise<any>) {
  const created = [];
  const logProgress = createProgressLogger(label, items.length, 10);
  logProgress(0, 'created 0, skipped 0');
  for (const [index, item] of items.entries()) {
    try {
      created.push(await create(item));
    } catch (error: any) {
      console.warn(`  ⚠️  Seed item skipped: ${error?.message || error}`);
    } finally {
      logProgress(index + 1, `created ${created.length}, skipped ${index + 1 - created.length}`);
    }
  }
  return created;
}

async function createRequiredSequential<T extends { studentId: string }>(items: T[], create: (item: T) => Promise<any>) {
  const created = [];
  const failures: unknown[] = [];
  const logProgress = createProgressLogger('Student routes', items.length, 10);
  logProgress(0, 'created 0, failed 0');
  for (const [index, item] of items.entries()) {
    try {
      created.push(await create(item));
    } catch (error) {
      failures.push(error);
      console.error(`  Student route failed for ${item.studentId}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      logProgress(index + 1, `created ${created.length}, failed ${failures.length}`);
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length}/${items.length} student routes failed to seed`);
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
  const logDisciplineProgress = createProgressLogger('Discipline incidents', disciplineIncidentsData.length, 10);
  logDisciplineProgress(0, 'created 0');

  for (const [index, item] of disciplineIncidentsData.entries()) {
    const teacher = teachersById.get(item.teacherId) as any;
    if (teacher?.userId) {
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
    logDisciplineProgress(index + 1, `created ${disciplineCount}, resolved ${resolvedCount}`);
  }

  const logRewardProgress = createProgressLogger('Behavior rewards', behaviorRewardsData.length, 10);
  logRewardProgress(0, 'created 0');
  for (const [index, item] of behaviorRewardsData.entries()) {
    const teacher = teachersById.get(item.teacherId) as any;
    if (teacher?.userId) {
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
    logRewardProgress(index + 1, `created ${rewardCount}`);
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
        const existing = await feeService.getByStudentAllYears(fee.studentId);
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

async function seedPayroll(payrollService: PayrollService, periods: string[], staffIds: Set<string>) {
  let createdCount = 0;
  let paidCount = 0;
  const logPayrollProgress = createProgressLogger('Payroll periods', periods.length, 10);
  logPayrollProgress(0, 'created 0 payslips, paid 0');

  for (const [periodIndex, period] of periods.entries()) {
    try {
      const result = await payrollService.runPayrollForSeed({ period }, staffIds);
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

runSeedTask(`demo seed for ${seedAcademicYear}`, async (server) => {
  // Check required migrations before creating any demo records.
  const columns = await db.execute(sql`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('announcements', 'alerts')
      AND column_name = 'academic_year_id'
  `);
  if (columns.length !== 2) throw new Error('Demo schema is behind: run bun run db:migrate, then retry the seed');
  const roleService = await server.container.resolve(RoleService);
  const settingsService = await server.container.resolve(SettingsService);
  const academicYearService = await server.container.resolve(AcademicYearService);
  const academicYearRepository = await server.container.resolve(AcademicYearRepository);
  const academicYearValidator = await server.container.resolve(AcademicYearValidator);
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

  if (!resumeFrom) {
    await seedPhase('Roles', () => roleService.seedDefaultRoles(rolesData));
    console.log('✅ Roles ready');

    const staffRolesCount = await seedPhase('Staff roles', () => seedStaffRoles());
    console.log(`✅ Staff roles ready (${staffRolesCount} roles)`);

    await seedPhase('Settings', () => prepareDemoYear(settingsService, academicYearService, academicYearRepository));
    console.log('✅ Settings seeded');
  }

  const selectedYear = await academicYearValidator.resolve(seedAcademicYear, 'admin');
  return runWithResolvedYear(server.container, selectedYear, async () => {
    let seededStudentIds: Set<string>;
    let seededStaffIds: Set<string>;
    if (resumeFrom) {
      completedSeedPhases = 20;
      console.log('Resuming at Announcements; using existing people and preserving completed financial phases.');
      studentsData = (await studentService.getAll()).map((student) => ({
        ...student, yearEnrolledOn: student.enrollment?.enrolledOn,
      })) as any;
      teachersData = (await teacherService.getAll()).filter((teacher) => teacher.assignments.length > 0);
      if (!studentsData.length || !teachersData.length) {
        throw new Error('Resume requires existing students and assigned teachers in the selected academic year');
      }
      driversData = (await driverService.getAll()).filter((driver) =>
        driver.hireDate === selectedYear.instructionStartsOn);
      vehicles = (await vehicleService.getAll()).filter((vehicle) =>
        vehicle.licensePlate?.includes(`-${seedAcademicYear}-`)).map((vehicle) => ({
          ...vehicle, driverId: vehicle.activeAssignment?.driverId,
        }));
      assessmentsData = assessmentsPack(teachersData).assessments;
      examsData = examsPack(teachersData).exams;
      alertsData = alertsPack(studentsData, teachersData).alerts;
      refuelsData = refuelsPack(vehicles, driversData).refuels;
      maintenanceData = maintenancePack(vehicles).maintenance;

      const existingClasses = await classService.getAll();
      const existingSections = await sectionService.getAll();
      const classIds = new Map(selectedClassesData.map((item) => {
        const existing = existingClasses.find((candidate) => candidate.name === item.name);
        if (!existing) throw new Error(`Resume class ${item.name} is missing; use the original --classes selection`);
        return [item.id, existing.id];
      }));
      const sectionIds = new Map(selectedSectionsData.map((item) => {
        const classId = classIds.get(item.classId) ?? item.classId;
        const existing = existingSections.find((candidate) => candidate.classId === classId && candidate.name === item.name);
        if (!existing) throw new Error(`Resume section ${item.name} is missing`);
        return [item.id, existing.id];
      }));
      remapDemoAcademicReferences([...announcementsData, ...eventsData, ...alertsData], classIds, sectionIds);
      seededStudentIds = new Set(studentsData.map((student: any) => student.id));
      seededStaffIds = new Set([
        ...teachersData.map((teacher) => teacher.staffId),
        ...(await staffService.getAll()).filter((member) => member.employeeCode?.startsWith(`DEMO-${seedAcademicYear}-`)).map((member) => member.id),
        ...driversData.map((driver) => driver.staffId),
      ]);
    } else {
      await seedPhase('Subjects', () => subjectService.seedDemoSubjects(schoolSeedData.subjectsData));
      console.log('✅ Subjects seeded');

      const createdClasses = await seedPhase('Classes', () => classService.seedDemoClasses(selectedClassesData));
      console.log(`✅ Classes seeded (${createdClasses.length} records)`);

      const existingClasses = await classService.getAll();
      const classIds = new Map(selectedClassesData.map((item) => {
        const existing = existingClasses.find((candidate) => candidate.name === item.name);
        if (!existing) throw new Error(`Demo class ${item.name} was not created in ${seedAcademicYear}`);
        return [item.id, existing.id];
      }));
      remapDemoAcademicReferences(selectedSectionsData, classIds);

      const createdSections = await seedPhase('Sections', () => sectionService.seedDemoSections(selectedSectionsData));
      console.log(`✅ Sections seeded (${createdSections.length} records)`);

      const existingSections = await sectionService.getAll();
      const sectionIds = new Map(selectedSectionsData.map((item) => {
        const existing = existingSections.find((candidate) => candidate.classId === item.classId && candidate.name === item.name);
        if (!existing) throw new Error(`Demo section ${item.name} was not created in ${seedAcademicYear}`);
        return [item.id, existing.id];
      }));
      remapDemoAcademicReferences([
        ...studentsData, ...teachersData, ...announcementsData, ...eventsData,
        ...assessmentsData, ...examsData, ...alertsData,
      ], classIds, sectionIds);

      await seedPhase('Fee types', () => feeTypeService.seedDemoFeeTypes(schoolSeedData.feeTypesData));
      console.log('✅ Fee types seeded');

      await seedPhase('Parents', () => parentService.createBulk(parentsData));
      console.log('✅ Parents seeded');

      const createdDrivers = await seedPhase('Drivers', () => driverService.createBulk(driversData));
      console.log('✅ Drivers seeded');

      await seedPhase('Vehicles', () => vehicleService.createBulk(normalizedVehiclesData));
      console.log('✅ Vehicles seeded');

      const createdAssignments = await seedPhase('Vehicle assignments', () => createSequential(
        'Vehicle assignments', vehicleAssignmentsData,
        (item: any) => vehicleAssignmentService.create(item),
      ));
      console.log(`✅ Vehicle assignments seeded (${createdAssignments.length} records)`);

      const createdTeachers = await seedPhase('Teachers', () => teacherService.createBulk(teachersData));
      console.log(`✅ Teachers seeded (${createdTeachers.length} records)`);

      const createdStaff = await seedPhase('Extra staff', () => createSequential(
        'Extra staff', staffData, (item) => staffService.create(item),
      ));
      console.log(`✅ Extra staff seeded (${createdStaff.length} records)`);

      const createdStudents = await seedPhase('Students', () => studentService.createBulkForSeed(studentsData));
      console.log(`✅ Students seeded (${createdStudents.length} records)`);
      seededStudentIds = new Set(createdStudents.map((student) => student.id));
      seededStaffIds = new Set([
        ...createdTeachers.map((teacher) => teacher.staffId),
        ...createdDrivers.map((driver) => driver.staffId),
        ...createdStaff.map((member) => member.id),
      ]);

      // Discipline incidents and behavior rewards belong to the year holding their date.
      const conductResult = await seedPhase('Student conduct', async () => {
        const availableTeachers = await teacherService.getAll();
        return seedConductRecords(disciplineService, behaviorRewardService, availableTeachers);
      });
      console.log(
        `✅ Student conduct seeded (${conductResult.disciplineCount} discipline incidents, ${conductResult.resolvedCount} resolved, ${conductResult.rewardCount} behavior rewards)`,
      );

      const createdStudentRoutes = await seedPhase('Student routes', () => createRequiredSequential(
        studentRoutesData,
        (item: any) => studentRouteService.assign(item),
      ));
      console.log(`✅ Student routes seeded (${createdStudentRoutes.length} records)`);

      const createdFees = await seedPhase('Fees + installments', () => seedUniqueFees(feeService, uniqueFeesData));
      console.log(`✅ Fees + installments seeded (${createdFees.length} records)`);

      console.log('💳 Recording payments...');
      const { paymentCount, skippedCount, latePaymentCount, latePaymentTotal } = await seedPhase(
        'Payments', () => seedPayments(feeService, paymentService, seededStudentIds),
      );
      console.log(
        `✅ Payments seeded (${paymentCount} records, ${skippedCount} students left unpaid, ${latePaymentCount} late summer payments totaling ${latePaymentTotal} MAD)`,
      );

      console.log('💸 Seeding expenses...');
      const createdExpenses = await seedPhase('Expenses', () => expenseService.seedDemoExpenses(expensesData));
      console.log(`✅ Expenses seeded (${createdExpenses.length} records)`);

      console.log('🧾 Seeding payroll...');
      const payrollResult = await seedPhase('Payroll', () => seedPayroll(payrollService, payrollPeriods, seededStaffIds));
      console.log(`✅ Payroll seeded (${payrollResult.createdCount} payslips, ${payrollResult.paidCount} paid)`);
    }

    const createdAnnouncements = await seedPhase('Announcements', () => announcementService.createBulk(announcementsData));
    console.log(`✅ Announcements seeded (${createdAnnouncements.length} records)`);

    const createdEvents = await seedPhase('Events', () =>
      createSequential('Events', eventsData, (item) => eventService.create(item)));
    console.log(`✅ Events seeded (${createdEvents.length} records)`);

    const assessmentContexts: any[] = [];
    const createdAssessments = await seedPhase('Assessments', () =>
      createSequential('Assessments', assessmentsData, async (item) => {
        const created = await assessmentService.create(item);
        assessmentContexts.push({ ...item, id: created.id });
        return created;
      }));
    console.log(`✅ Assessments seeded (${createdAssessments.length} records)`);

    const examContexts: any[] = [];
    const createdExams = await seedPhase('Exams', () =>
      createSequential('Exams', examsData, async (item) => {
        const created = await examService.create(item);
        examContexts.push({ ...item, id: created.id });
        return created;
      }));
    console.log(`✅ Exams seeded (${createdExams.length} records)`);

    console.log('🧮 Seeding grades...');
    const createdGrades = await seedPhase('Grades', async () => {
      const { grades: gradesData } = gradesPack(
        studentsData.filter((student) => seededStudentIds.has(student.id)),
        assessmentContexts,
        examContexts,
      );
      const assessmentGradeCount = gradesData.filter((grade: any) => grade.assessmentId).length;
      const examGradeCount = gradesData.filter((grade: any) => grade.examId).length;
      console.log(
        `  Grade generation: prepared ${gradesData.length} records ` +
        `(${assessmentGradeCount} assessment, ${examGradeCount} exam)`,
      );
      return gradeService.seedDemoGrades(gradesData);
    });
    console.log(`✅ Grades seeded (${createdGrades.length} records)`);

    console.log('📋 Seeding attendance...');
    const { studentCount, staffCount } = await seedPhase('Attendance', () =>
      seedAttendance(selectedYear, attendanceService, studentService, teacherService, staffService,
        { studentIds: seededStudentIds, staffIds: seededStaffIds }));
    console.log(`✅ Attendance seeded (${studentCount} student records, ${staffCount} staff records)`);

    const createdAlerts = await seedPhase('Alerts', () => alertService.seedDemoAlerts(alertsData));
    console.log(`✅ Alerts seeded (${createdAlerts.length} records)`);

    const createdRefuels = await seedPhase('Refuels', () => refuelService.seedDemoRefuels(refuelsData));
    console.log(`✅ Refuels seeded (${createdRefuels.length} records)`);

    const createdMaintenance = await seedPhase('Maintenance', () => maintenanceService.seedDemoMaintenances(maintenanceData));
    console.log(`✅ Maintenance seeded (${createdMaintenance.length} records)`);

    console.log('\n✨ Demo seed completed successfully!');
  });
});
