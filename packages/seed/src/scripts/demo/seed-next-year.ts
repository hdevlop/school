#!/usr/bin/env bun

import { randomUUID } from 'crypto';
import { defaultSchoolYearCalendar } from '@sms/contracts/academic-years';
import {
  SettingsService,
  SettingsRepository,
  AcademicYearService,
  AcademicYearRepository,
  AcademicYearValidator,
  AcademicYearTransitionService,
  StudentEnrollmentService,
  ClassService,
  SectionService,
  ParentService,
  DriverService,
  VehicleService,
  TeacherService,
  StudentService,
  StaffService,
  FeeService,
  PaymentService,
  RolloverService,
  ExpenseService,
  AttendanceService,
  PayrollService,
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
  ClassRoutineService,
  runWithResolvedYear,
} from '@sms/server/modules/seed';
import { runSeedTask } from '../shared/run-seed';
import { schoolSeedData, seedAcademicYear } from '../shared/school-seed-data';
import { remapDemoAcademicReferences } from '../shared/demo-references';
import { seedAttendance } from '../shared/seed-attendance';
import { seedTimetables } from '../shared/seed-timetables';
import {
  createPhaseRunner,
  createSequential,
  findAdministratorId,
  normalizeDemoFees,
  seedConductRecords,
  seedPayments,
  seedPayroll,
  seedUniqueFees,
} from '../shared/demo-phases';
import {
  ALL_CLASS_NAMES,
  alertsPack,
  announcementsPack,
  assessmentsPack,
  behaviorRewardsPack,
  demoIntakeAssignments,
  disciplinePack,
  eventsPack,
  examsPack,
  expensesPack,
  gradesPack,
  maintenancePack,
  payrollPack,
  refuelsPack,
  selectedDemoClassNames,
  studentsPack,
} from './generator';

// One later year of the history seed. The school, its people and the previous
// year already exist, and the previous year is the active one. This year
// follows it the way a school moves on: the year transition promotes each
// class into the next one (a few repeat or leave, the top class graduates),
// the year becomes active, fees roll over, a new intake joins the first class,
// and the year's own activity is recorded.

const REPEAT_RATE = 0.03;
const WITHDRAW_RATE = 0.02;
const TRANSFER_IN_RATE = 0.03;

const targetLabel = seedAcademicYear;
const targetStart = Number(targetLabel.slice(0, 4));
const sourceLabel = `${targetStart - 1}-${targetStart}`;
const classOrder = ALL_CLASS_NAMES.filter((name) => selectedDemoClassNames.includes(name));
const selectedClassesData = schoolSeedData.classesData.filter((item) => classOrder.includes(item.name));
const selectedClassIds = new Set(selectedClassesData.map((item) => item.id));
const selectedSectionsData = schoolSeedData.sectionsData.filter((item) => selectedClassIds.has(item.classId));

const seedPhase = createPhaseRunner(21);

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

runSeedTask(`history year ${targetLabel}`, async (server) => {
  const resolve = <T>(token: new (...args: any[]) => T) => server.container.resolve(token) as Promise<T>;
  const settingsService = await resolve(SettingsService);
  const settingsRepository = await resolve(SettingsRepository);
  const academicYearService = await resolve(AcademicYearService);
  const academicYearRepository = await resolve(AcademicYearRepository);
  const academicYearValidator = await resolve(AcademicYearValidator);
  const transitionService = await resolve(AcademicYearTransitionService);
  const enrollmentService = await resolve(StudentEnrollmentService);
  const classService = await resolve(ClassService);
  const sectionService = await resolve(SectionService);
  const parentService = await resolve(ParentService);
  const driverService = await resolve(DriverService);
  const vehicleService = await resolve(VehicleService);
  const teacherService = await resolve(TeacherService);
  const studentService = await resolve(StudentService);
  const staffService = await resolve(StaffService);
  const feeService = await resolve(FeeService);
  const paymentService = await resolve(PaymentService);
  const rolloverService = await resolve(RolloverService);
  const expenseService = await resolve(ExpenseService);
  const attendanceService = await resolve(AttendanceService);
  const payrollService = await resolve(PayrollService);
  const announcementService = await resolve(AnnouncementService);
  const eventService = await resolve(EventService);
  const assessmentService = await resolve(AssessmentService);
  const examService = await resolve(ExamService);
  const gradeService = await resolve(GradeService);
  const alertService = await resolve(AlertService);
  const refuelService = await resolve(RefuelService);
  const maintenanceService = await resolve(MaintenanceService);
  const classRoutineService = await resolve(ClassRoutineService);
  const disciplineService = await resolve(DisciplineService);
  const behaviorRewardService = await resolve(BehaviorRewardService);

  const actorId = await findAdministratorId();
  const settings = await settingsService.getAdminSettings();
  if (settings?.currentAcademicYear !== sourceLabel) {
    throw new Error(`${targetLabel} follows ${sourceLabel}, but the active year is ${settings?.currentAcademicYear ?? 'not set'}`);
  }
  const source = await academicYearValidator.resolve(sourceLabel, 'admin');
  const inSource = <T>(run: () => Promise<T>) => runWithResolvedYear(server.container, source, run);

  console.log(`🌱 Moving the school from ${sourceLabel} to ${targetLabel}...`);

  const draft = await seedPhase('Academic year', async () => {
    const registered = await academicYearService.list('admin');
    if (registered.years.some((year) => year?.label === targetLabel)) {
      throw new Error(`${targetLabel} already exists; reset the demo data before seeding history`);
    }
    await academicYearService.create({
      label: targetLabel,
      ...defaultSchoolYearCalendar(targetLabel),
      provenance: 'verified',
      provenanceNote: 'Synthetic September-June calendar created by the demo history seed',
    } as any, actorId);
    return academicYearValidator.resolve(targetLabel, 'admin');
  });
  const enrolledOn = draft.reportingStartsOn;
  const inDraft = <T>(run: () => Promise<T>) => runWithResolvedYear(server.container, draft, run);

  // The new year's classes and sections, keyed by name for the promotion map.
  const { classIds, sectionIds, targetClassByName, targetSectionByName } = await seedPhase('Classes + sections', () => inDraft(async () => {
    await classService.seedDemoClasses(selectedClassesData);
    const existingClasses = await classService.getAll();
    const classIds = new Map(selectedClassesData.map((item) => {
      const existing = existingClasses.find((candidate) => candidate.name === item.name);
      if (!existing) throw new Error(`Class ${item.name} was not created in ${targetLabel}`);
      return [item.id, existing.id];
    }));
    const sections = selectedSectionsData.map((item) => ({ ...item }));
    remapDemoAcademicReferences(sections, classIds);
    await sectionService.seedDemoSections(sections);
    const existingSections = await sectionService.getAll();
    const sectionIds = new Map(sections.map((item) => {
      const existing = existingSections.find((candidate) => candidate.classId === item.classId && candidate.name === item.name);
      if (!existing) throw new Error(`Section ${item.name} was not created in ${targetLabel}`);
      return [item.id, existing.id];
    }));
    const targetClassByName = new Map(existingClasses.map((item) => [item.name, item.id]));
    const targetSectionByName = new Map(existingSections.map((item) =>
      [`${existingClasses.find((schoolClass) => schoolClass.id === item.classId)?.name}:${item.name}`, item.id]));
    console.log(`  ${classIds.size} classes, ${sectionIds.size} sections`);
    return { classIds, sectionIds, targetClassByName, targetSectionByName };
  }));

  // Where each of last year's sections sits by name.
  const sourceSectionNames = await inSource(async () => {
    const [sourceClasses, sourceSections] = await Promise.all([classService.getAll(), sectionService.getAll()]);
    const classNames = new Map(sourceClasses.map((item) => [item.id, item.name]));
    return new Map(sourceSections.map((item) => [item.id, { className: classNames.get(item.classId)!, sectionName: item.name }]));
  });
  const targetPlacement = (className: string, sectionName: string) => {
    const classId = targetClassByName.get(className);
    const sectionId = targetSectionByName.get(`${className}:${sectionName}`);
    return classId && sectionId ? { classId, sectionId } : null;
  };

  // Teachers keep their classes and subjects; only the year's rooms change.
  await seedPhase('Teacher assignments', async () => {
    const teachers = await inSource(() => teacherService.getAll());
    let assigned = 0;
    await inDraft(async () => {
      for (const teacher of teachers) {
        for (const assignment of teacher.assignments ?? []) {
          for (const sourceSectionId of assignment.sectionIds ?? []) {
            const named = sourceSectionNames.get(sourceSectionId);
            const placement = named && targetPlacement(named.className, named.sectionName);
            if (!placement) continue;
            for (const subjectId of assignment.subjectIds ?? []) {
              await teacherService.assignSubject({ teacherId: teacher.id, ...placement, subjectId });
              assigned++;
            }
          }
        }
      }
    });
    console.log(`  ${assigned} teaching assignments carried into ${targetLabel}`);
  });

  // The application's own year transition: promote, repeat, graduate or withdraw.
  const transition = await seedPhase('Promotion', () => inSource(async () => {
    const roster = (await studentService.getAll()).filter((student) => student.status === 'active');
    const topClass = classOrder.at(-1);
    const mappings = [...sourceSectionNames].flatMap(([sourceSectionId, named]) => {
      const nextClass = classOrder[classOrder.indexOf(named.className) + 1];
      const placement = nextClass && targetPlacement(nextClass, named.sectionName);
      return placement ? [{
        sourceSectionId, targetClassId: placement.classId, targetSectionId: placement.sectionId, outcome: 'promote' as const,
      }] : [];
    });
    const studentDecisions: any[] = [];
    for (const student of roster) {
      const named = sourceSectionNames.get(student.sectionId!);
      if (!named) continue;
      if (named.className === topClass) {
        studentDecisions.push({ studentId: student.id, outcome: 'graduate' });
        continue;
      }
      const chance = Math.random();
      const repeatPlacement = targetPlacement(named.className, named.sectionName);
      if (chance < REPEAT_RATE && repeatPlacement) {
        studentDecisions.push({
          studentId: student.id, outcome: 'repeat',
          targetClassId: repeatPlacement.classId, targetSectionId: repeatPlacement.sectionId,
        });
      } else if (chance < REPEAT_RATE + WITHDRAW_RATE) {
        studentDecisions.push({ studentId: student.id, outcome: 'withdraw' });
      }
    }
    const input = { sourceAcademicYearId: source.id, enrolledOn, mappings, studentDecisions };
    const preview = await transitionService.preview(draft.id, input);
    if (!preview.commitAvailable) {
      const codes = [...new Set(preview.issues.map((issue) => issue.code))].join(', ');
      throw new Error(`The ${sourceLabel} → ${targetLabel} transition has issues: ${codes}`);
    }
    const run = await transitionService.commit(draft.id, {
      preview: input, idempotencyKey: randomUUID(), expectedPreviewHash: preview.previewHash,
    }, actorId);
    const outcomes = run.outcomes as Array<{ studentId: string; outcome: string }>;
    const count = (outcome: string) => outcomes.filter((item) => item.outcome === outcome).length;
    console.log(`  ${count('promote')} promoted, ${count('repeat')} repeating, ${count('graduate')} graduated, ${count('withdraw')} withdrawn`);
    return { run, sourceCount: roster.length, leavers: count('graduate') + count('withdraw') };
  }));

  // Activation's own steps, dated the first school day: AcademicYearService.activate
  // only switches to the year that holds today, which a past year never does.
  await seedPhase('Activation', async () => {
    const dispositions = (transition.run.outcomes as Array<{ studentId: string; outcome: string }>)
      .filter((item): item is { studentId: string; outcome: 'graduate' | 'withdraw' | 'omit' } =>
        item.outcome === 'graduate' || item.outcome === 'withdraw' || item.outcome === 'omit');
    const students = await enrollmentService.projectActiveYear(source.id, draft.id, dispositions);
    await academicYearRepository.setStatus(draft.id, 'open', actorId);
    const switched = await settingsRepository.switchActiveYear(source.id, { id: draft.id, label: draft.label });
    if (!switched) throw new Error(`The active year changed while ${targetLabel} was being activated`);
    await academicYearRepository.recordActivation({
      actorId,
      actorRole: 'admin',
      from: { id: source.id, label: source.label },
      to: { id: draft.id, label: draft.label },
      transitionRunId: transition.run.id,
      businessDate: enrolledOn,
      students,
    });
    console.log(`  ${targetLabel} is now the active year (${students.placed} placed, ${students.ended} ended)`);
  });

  const target = await academicYearValidator.resolve(targetLabel, 'admin');
  return runWithResolvedYear(server.container, target, async () => {
    await seedPhase('Fee rollover', async () => {
      const request = {
        fromYear: sourceLabel, toYear: targetLabel, copyDiscounts: true, includeOneTimeFees: true,
        dryRun: true, idempotencyKey: randomUUID(),
      };
      const preview = await rolloverService.preview(request, actorId);
      // A fresh key always commits here; a replayed key would return the stored run instead.
      const result = await rolloverService.commit({ ...request, runId: preview.id, confirmSettingsUpdate: false }, actorId);
      if (!('successCount' in result)) throw new Error('The fee rollover returned an earlier run');
      console.log(`  ${result.successCount} fees rolled over, ${result.skippedCount} skipped, ${result.errorCount} refused`);
    });

    // A new first class replaces the one promoted out, and a few students
    // transfer into the other classes.
    const newStudents = await seedPhase('New students', async () => {
      const perClass = Math.round(transition.sourceCount / classOrder.length);
      const transfers = Math.round(transition.sourceCount * TRANSFER_IN_RATE);
      const counts = new Map<string, number>([[classOrder[0], Math.max(perClass, transition.leavers)]]);
      for (let index = 0; index < transfers && classOrder.length > 1; index++) {
        const className = pickRandom(classOrder.slice(1));
        counts.set(className, (counts.get(className) ?? 0) + 1);
      }
      const intake = await studentsPack(
        demoIntakeAssignments([...counts].map(([className, students]) => ({ className, students }))),
        enrolledOn,
      );
      remapDemoAcademicReferences(intake.students, classIds, sectionIds);
      await parentService.createBulk(intake.parents);
      const created = await studentService.createBulkForSeed(intake.students);
      const createdIds = new Set(created.map((student) => student.id));
      const fees = await seedUniqueFees(feeService,
        normalizeDemoFees(intake.fees).filter((fee: any) => createdIds.has(fee.studentId)));
      console.log(`  ${created.length} students admitted (${counts.get(classOrder[0])} into ${classOrder[0]}), ${fees.length} fees`);
      return created;
    });

    const studentsData = (await studentService.getAll()).map((student) => ({
      ...student, yearEnrolledOn: student.enrollment?.enrolledOn,
    })) as any[];
    const studentIds = new Set(studentsData.map((student) => student.id));
    const teachersData = (await teacherService.getAll()).filter((teacher) => teacher.assignments.length > 0);
    const drivers = await driverService.getAll();
    const vehicles = (await vehicleService.getAll()).map((vehicle) => ({
      ...vehicle, driverId: vehicle.activeAssignment?.driverId,
    }));
    const staffIds = new Set([
      ...teachersData.map((teacher) => teacher.staffId),
      ...drivers.map((driver) => driver.staffId),
      ...(await staffService.getAll()).filter((member) => member.status === 'active').map((member) => member.id),
    ].filter(Boolean) as string[]);
    console.log(`  ${studentsData.length} students enrolled in ${targetLabel} (${newStudents.length} new)`);

    const { payments } = await seedPhase('Payments', async () => ({
      payments: await seedPayments(feeService, paymentService, studentIds, targetLabel),
    }));
    console.log(`✅ Payments seeded (${payments.paymentCount} records, ${payments.clearedChequeCount} cheques cleared, ${payments.skippedCount} students left unpaid)`);

    const createdExpenses = await seedPhase('Expenses', async () =>
      expenseService.seedDemoExpenses((await expensesPack()).expenses, actorId));
    console.log(`✅ Expenses seeded (${createdExpenses.length} records)`);

    const payroll = await seedPhase('Payroll', () => seedPayroll(payrollService, payrollPack().payrollPeriods, staffIds));
    console.log(`✅ Payroll seeded (${payroll.createdCount} payslips, ${payroll.paidCount} paid)`);

    const { announcements } = announcementsPack();
    const { events } = eventsPack();
    const { alerts } = alertsPack(studentsData, teachersData);
    remapDemoAcademicReferences([...announcements, ...events, ...alerts], classIds, sectionIds);

    const createdAnnouncements = await seedPhase('Announcements', () => announcementService.createBulk(announcements));
    console.log(`✅ Announcements seeded (${createdAnnouncements.length} records)`);

    const createdEvents = await seedPhase('Events', () =>
      createSequential('Events', events, (item) => eventService.create(item)));
    console.log(`✅ Events seeded (${createdEvents.length} records)`);

    const assessmentContexts: any[] = [];
    const createdAssessments = await seedPhase('Assessments', () =>
      createSequential('Assessments', assessmentsPack(teachersData).assessments, async (item) => {
        const created = await assessmentService.create(item);
        assessmentContexts.push({ ...item, id: created.id });
        return created;
      }));
    console.log(`✅ Assessments seeded (${createdAssessments.length} records)`);

    const examContexts: any[] = [];
    const createdExams = await seedPhase('Exams', () =>
      createSequential('Exams', examsPack(teachersData).exams, async (item) => {
        const created = await examService.create(item);
        examContexts.push({ ...item, id: created.id });
        return created;
      }));
    console.log(`✅ Exams seeded (${createdExams.length} records)`);

    const createdGrades = await seedPhase('Grades', () =>
      gradeService.seedDemoGrades(gradesPack(studentsData, assessmentContexts, examContexts).grades));
    console.log(`✅ Grades seeded (${createdGrades.length} records)`);

    const conduct = await seedPhase('Student conduct', () => seedConductRecords(
      disciplineService, behaviorRewardService, teachersData,
      disciplinePack(studentsData, teachersData).disciplineIncidents,
      behaviorRewardsPack(studentsData, teachersData).behaviorRewards,
    ));
    console.log(`✅ Student conduct seeded (${conduct.disciplineCount} incidents, ${conduct.rewardCount} rewards)`);

    const attendance = await seedPhase('Attendance', () =>
      seedAttendance(target, attendanceService, studentService, teacherService, staffService, { studentIds, staffIds }));
    console.log(`✅ Attendance seeded (${attendance.studentCount} student records, ${attendance.staffCount} staff records)`);

    const createdAlerts = await seedPhase('Alerts', () => alertService.seedDemoAlerts(alerts));
    console.log(`✅ Alerts seeded (${createdAlerts.length} records)`);

    const createdRefuels = await seedPhase('Refuels', () =>
      refuelService.seedDemoRefuels(refuelsPack(vehicles, drivers).refuels));
    console.log(`✅ Refuels seeded (${createdRefuels.length} records)`);

    const createdMaintenance = await seedPhase('Maintenance', () =>
      maintenanceService.seedDemoMaintenances(maintenancePack(vehicles).maintenance));
    console.log(`✅ Maintenance seeded (${createdMaintenance.length} records)`);

    const timetables = await seedPhase('Timetables', () => seedTimetables(classRoutineService, sectionService));
    console.log(`✅ Timetables seeded (${timetables.timetableCount} sections, ${timetables.lessonCount} lessons, ${timetables.skippedCount} left out)`);

    console.log(`\n✨ ${targetLabel} seeded as the continuation of ${sourceLabel}`);
  });
});
