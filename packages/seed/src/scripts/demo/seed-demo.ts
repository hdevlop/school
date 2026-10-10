#!/usr/bin/env bun

import { RoleService } from 'najm-auth';
import { db } from '@sms/server/database';
import { sql } from 'drizzle-orm';
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
  ClassRoutineService,
} from '@sms/server/modules/seed';
import rolesData from '../admin/data/roles.json';
import { runSeedTask } from '../shared/run-seed';
import { schoolSeedData, seedAcademicYear } from '../shared/school-seed-data';
import { prepareDemoYear } from '../shared/demo-year';
import { remapDemoAcademicReferences } from '../shared/demo-references';
import { getDemoResumeFrom } from '../shared/demo-resume';
import { seedAttendance } from '../shared/seed-attendance';
import { seedTimetables } from '../shared/seed-timetables';
import {
  createPhaseRunner,
  createRequiredSequential,
  createSequential,
  findAdministratorId,
  normalizeDemoFees,
  seedConductRecords,
  seedPayments,
  seedPayroll,
  seedStaffRoles,
  seedUniqueFees,
} from '../shared/demo-phases';
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

const uniqueFeesData = normalizeDemoFees(feesData);

const TOTAL_SEED_PHASES = 30;
const seedPhase = createPhaseRunner(TOTAL_SEED_PHASES);
// The history seed installs the school with its oldest year as the active one.
const historyStart = process.argv.slice(2).includes('--history-start');

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
  const classRoutineService = await server.container.resolve(ClassRoutineService);

  console.log('🌱 Starting school demo data seeding...');

  if (!resumeFrom) {
    await seedPhase('Roles', () => roleService.seedDefaultRoles(rolesData));
    console.log('✅ Roles ready');

    const staffRolesCount = await seedPhase('Staff roles', () => seedStaffRoles());
    console.log(`✅ Staff roles ready (${staffRolesCount} roles)`);

    await seedPhase('Settings', () => prepareDemoYear(
      settingsService, academicYearService, academicYearRepository, seedAcademicYear,
      historyStart ? seedAcademicYear : undefined,
    ));
    console.log('✅ Settings seeded');
  }

  const selectedYear = await academicYearValidator.resolve(seedAcademicYear, 'admin');
  return runWithResolvedYear(server.container, selectedYear, async () => {
    let seededStudentIds: Set<string>;
    let seededStaffIds: Set<string>;
    if (resumeFrom) {
      seedPhase.skipTo(20);
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
        return seedConductRecords(
          disciplineService, behaviorRewardService, availableTeachers, disciplineIncidentsData, behaviorRewardsData,
        );
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
      const { paymentCount, clearedChequeCount, skippedCount, latePaymentCount, latePaymentTotal } = await seedPhase(
        'Payments', () => seedPayments(feeService, paymentService, seededStudentIds, seedAcademicYear),
      );
      console.log(
        `✅ Payments seeded (${paymentCount} records, ${clearedChequeCount} cheques cleared, ${skippedCount} students left unpaid, ${latePaymentCount} late summer payments totaling ${latePaymentTotal} MAD)`,
      );

      console.log('💸 Seeding expenses...');
      const createdExpenses = await seedPhase('Expenses', async () => expenseService.seedDemoExpenses(expensesData, await findAdministratorId()));
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

    const timetables = await seedPhase('Timetables', () => seedTimetables(classRoutineService, sectionService));
    console.log(`✅ Timetables seeded (${timetables.timetableCount} sections, ${timetables.lessonCount} lessons, ${timetables.skippedCount} left out)`);

    console.log('\n✨ Demo seed completed successfully!');
  });
});
