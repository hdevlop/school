import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import {
   generateDriver,
   generateExpenses,
   generateFamilyUnit,
   generateFees,
   generateStudent,
   generateTeacher,
   generateVehicle,
   subjectsData,
   vehiclesData,
} from '@sms/contracts/fixtures';
import settingsData from '../school/data/settings.json';
import { schoolSeedData, seedAcademicId, seedAcademicYear } from '../shared/school-seed-data';
import { getDemoReferenceDate } from '../shared/academic-year';
import {
   MAX_TEACHER_LESSONS,
   PART_TIME_BELOW,
   fillSections,
   shareEvenly,
   shareUnits,
   subjectFamily,
   weeklyLessons,
} from '../shared/timetable';

const { classesData, sectionsData } = schoolSeedData;
const getClassByName = (name: string) => classesData.find((item) => item.name === name)!;
const getSectionsByClass = (classId: string) => sectionsData.filter((item) => item.classId === classId);
const demoReferenceDate = getDemoReferenceDate(seedAcademicYear);
const demoRunId = crypto.randomUUID().slice(0, 8);
const demoRecordId = (id: string) => `${seedAcademicId(id)}-${demoRunId}`;

// ============================================
// ⚙️ CONFIGURATION
// ============================================

// Parse CLI args:  --students=50 | --students 50 | -s 50
function getCliArg(long: string, short?: string): string | undefined {
   const args = process.argv.slice(2);
   for (let i = 0; i < args.length; i++) {
      const eqLong  = args[i].match(new RegExp(`^--${long}=(.+)$`));
      if (eqLong) return eqLong[1];
      if (args[i] === `--${long}`             && args[i + 1]) return args[i + 1];
      if (short && args[i] === `-${short}`    && args[i + 1]) return args[i + 1];
   }
   return undefined;
}

export const DEFAULT_DEMO_COUNTS = {
   students: 100,
   teachers: 0, // 0 = auto (sized to the student count, see demoHeadcount)
   announcements: 12,
   events: 12,
   assessments: 0, // 0 = auto (the full calendar for every taught section and subject)
   exams: 0, // 0 = auto (both semester exams for every taught section and subject)
   grades: 0, // 0 = auto (one grade per student for every completed assessment/exam)
   alerts: 25,
   disciplineIncidents: 40,
   behaviorRewards: 60,
   expenses: 0,
   payrollPeriods: 0, // 0 = auto (one run per month, Sep → now — matches expenses)
   vehicleAssignments: 8,
   studentRoutes: 20,
   refuels: 24,
   maintenance: 16,
   staff: 0, // 0 = auto (sized to the student count, see demoHeadcount)
};

export const DEFAULT_DEMO_CLASSES = ['CP','CE1','CE2','CM1','CM2','CE6','1AC','2AC','3AC'];
const DEFAULT_CLASSES_ARG = DEFAULT_DEMO_CLASSES.join(',');
const DEFAULT_STUDENT_COUNT = DEFAULT_DEMO_COUNTS.students;
const DEFAULT_TEACHER_LIMIT = DEFAULT_DEMO_COUNTS.teachers;

const totalStudents      = parseInt(getCliArg('students', 's') ?? String(DEFAULT_STUDENT_COUNT), 10); // total across selected classes
const teacherLimit       = parseInt(getCliArg('teachers', 't') ?? String(DEFAULT_TEACHER_LIMIT), 10); // 0 = auto
const classesArg         = getCliArg('classes', 'c') ?? DEFAULT_CLASSES_ARG;
const parseCount = (name: keyof typeof DEFAULT_DEMO_COUNTS, alias?: string) =>
   parseInt(getCliArg(name, alias) ?? String(DEFAULT_DEMO_COUNTS[name]), 10);

const featureCounts = {
   announcements: parseCount('announcements'),
   events: parseCount('events'),
   assessments: parseCount('assessments'),
   exams: parseCount('exams'),
   grades: parseCount('grades'),
   alerts: parseCount('alerts'),
   disciplineIncidents: parseCount('disciplineIncidents'),
   behaviorRewards: parseCount('behaviorRewards'),
   expenses: parseCount('expenses', 'e'), // 0 = auto (monthly from Sep)
   payrollPeriods: parseCount('payrollPeriods'),
   vehicleAssignments: parseCount('vehicleAssignments'),
   studentRoutes: parseCount('studentRoutes'),
   refuels: parseCount('refuels'),
   maintenance: parseCount('maintenance'),
   staff: parseCount('staff'),
};

/** School order: each class promotes into the next one. */
export const ALL_CLASS_NAMES = ['PS','MS','GS','CP','CE1','CE2','CM1','CM2','CE6','1AC','2AC','3AC','TC','1BAC','2BAC'];

const selectedClasses = (() => {
   if (classesArg.toUpperCase() === 'ALL' || !classesArg.trim()) return ALL_CLASS_NAMES;
   const picked = classesArg.toUpperCase().split(',').map(s => s.trim()).filter(s => ALL_CLASS_NAMES.includes(s));
   if (!picked.length) {
      console.warn(`⚠️  --classes="${classesArg}" matched none of ${ALL_CLASS_NAMES.join(',')} — falling back to ALL`);
      return ALL_CLASS_NAMES;
   }
   return picked;
})();

export const selectedDemoClassNames = selectedClasses;

// Distribute totalStudents evenly across selected classes, spreading remainder to first N classes.
// Within a class, fillSections opens sections as they fill.
function distributeStudents(total: number, classCount: number): number[] {
   if (classCount === 0) return [];
   const base = Math.floor(total / classCount);
   const extra = total % classCount;
   return Array.from({ length: classCount }, (_, i) => base + (i < extra ? 1 : 0));
}

const perClassCounts = distributeStudents(totalStudents, selectedClasses.length);

const CONFIG = {

   OUTPUT_DIR: 'src/scripts/demo/data',

   FEE_POLICY: {
      SCHEDULE: {
         MONTHLY_PROBABILITY: 0.8,
      },
      FEES: {
         // optional fee enrollment rates (real-world school averages)
         TRANSPORT: 0.40,  // 40% use school bus
         CAFETERIA: 0.50,  // 50% subscribe to cafeteria
         UNIFORM: 0.70,    // 70% purchase uniform through school
         BOOKS: 0.80,      // 80% buy books/materials via school
         SPORTS: 0.60,     // 60% join sports programme
         TECHNOLOGY: 0.50, // 50% pay computer-lab fee
         FIELD_TRIP: 0.50, // 50% join field trips
      },
   },

   // Only selected classes receive students. Each class gets its share of totalStudents,
   // filling a section before the next one opens.
   ASSIGNMENTS: selectedClasses.map((name, i) => {
      const classObj = getClassByName(name);
      const sections = classObj ? getSectionsByClass(classObj.id) : [];

      return {
         CLASS_NAME: name,
         SECTION_COUNTS: fillSections(perClassCounts[i], sections.length || 1),
      };
   }),

    DRIVER: {
       GENDER_PROBABILITY: {
          MALE: 0.9,
          FEMALE: 0.1
       }
    },

    EXPENSES: {
       COUNT: featureCounts.expenses,
    },
};

// A demo school is sized like a real private one: as many teachers as its
// sections' timetables need (see teachersPack), one support employee per 35
// students, one bus per 40 riders, and running costs in proportion to a
// 300-student campus. Fixed headcounts made a 100-student demo pay 100
// salaries, so payroll alone outran tuition.
const STUDENTS_PER_SUPPORT_EMPLOYEE = 35;
const RIDERS_PER_BUS = 40;
const REFERENCE_CAMPUS_STUDENTS = 300;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const demoHeadcount = {
   staff: featureCounts.staff > 0
      ? featureCounts.staff
      : Math.max(3, Math.ceil(totalStudents / STUDENTS_PER_SUPPORT_EMPLOYEE)),
   vehicles: clamp(Math.ceil(totalStudents * CONFIG.FEE_POLICY.FEES.TRANSPORT / RIDERS_PER_BUS), 2, vehiclesData.length),
   operatingCostScale: clamp(totalStudents / REFERENCE_CAMPUS_STUDENTS, 0.3, 2),
};

// ============================================
// 📦 DATA PACKS
// ============================================

/** New students per class, filling each class's sections in order. */
export function demoIntakeAssignments(counts: Array<{ className: string; students: number }>) {
   return counts.map(({ className, students }) => ({
      CLASS_NAME: className,
      SECTION_COUNTS: fillSections(students, getSectionsByClass(getClassByName(className).id).length || 1),
   }));
}

// `admittedOn` makes every generated student a new admission on that day.
export async function studentsPack(
   assignments: Array<{ CLASS_NAME: string; SECTION_COUNTS: number[] }> = CONFIG.ASSIGNMENTS,
   admittedOn?: string,
) {
   const db = { students: [], parents: [], fees: [] };

   for (const ASSIGNMENT of assignments) {

      const classObj = getClassByName(ASSIGNMENT.CLASS_NAME);
      const sections = getSectionsByClass(classObj.id);

      ASSIGNMENT.SECTION_COUNTS.forEach((targetCount, idx) => {
         const sectionObj = sections[idx];

         let currentCount = 0;

         while (currentCount < targetCount) {
            const family = generateFamilyUnit();

            for (let i = 0; i < family.childCount; i++) {
               if (currentCount >= targetCount) break;

               const student: any = generateStudent({
                  lastName: family.lastName,
                  address: family.address,
                  classId: classObj.id,
                  sectionId: sectionObj.id,
                  parentIds: family.parentIds,
                  academicYear: seedAcademicYear,
               });
               // Synthetic fixtures know when this year's placement begins;
               // the permanent admission date can belong to an older year.
               const yearStart = `${seedAcademicYear.slice(0, 4)}-09-01`;
               if (admittedOn) student.enrollmentDate = admittedOn;
               student.yearEnrolledOn = student.enrollmentDate > yearStart
                  ? student.enrollmentDate : yearStart;

               const fees = generateFees({
                  studentId: student.id,
                  policy: CONFIG.FEE_POLICY,
                  academicYear: seedAcademicYear,
               });

               db.fees.push(...fees);
               db.students.push(student);
               currentCount++;
            }

            db.parents.push(...family.parents);
         }
      });
   }

   return db;
}

// Monthly pay (MAD) of a full-time private-school teacher: a base by level plus seniority.
function teacherSalary(level: string, yearsOfExperience: number) {
   const base = level === 'Primaire' ? 4400 : 5200;
   return base + yearsOfExperience * 120 + Math.round(Math.random() * 6) * 100;
}

/**
 * Teachers for the sections that have students: every section is taught each
 * subject's weekly lessons, and each subject (history and geography count as
 * one) is shared evenly among as few teachers as a
 * full-time load allows, so the timetable fits and payroll follows the
 * school's size. A lighter load is a part-time contract paid in proportion.
 */
export async function teachersPack() {
   const yearStart = `${seedAcademicYear.slice(0, 4)}-09-01`;
   const units = CONFIG.ASSIGNMENTS.flatMap(({ CLASS_NAME, SECTION_COUNTS }) => {
      const classEntity = getClassByName(CLASS_NAME);
      return getSectionsByClass(classEntity.id)
         .filter((_, index) => (SECTION_COUNTS[index] ?? 0) > 0)
         .flatMap((section) => subjectsData.map((subject, subjectIndex) => ({
            family: subjectFamily(subject.code),
            subjectIndex,
            level: classEntity.level,
            classId: classEntity.id,
            sectionId: section.id,
            subjectId: subject.id,
            subjectName: subject.name,
            lessons: weeklyLessons(classEntity.level, subject.code),
         })));
   }).sort((a, b) => a.family - b.family || a.level.localeCompare(b.level));

   const families = [...new Set(units.map((unit) => unit.family))];
   const shares = teacherLimit > 0
      ? shareUnits(units, teacherLimit)
      : families.flatMap((family) => shareEvenly(units.filter((unit) => unit.family === family)));

   const selectedTeachers: any[] = shares.map((share) => {
      const yearsOfExperience = 2 + Math.floor(Math.random() * 24);
      const bySection = new Map<string, any>();
      for (const unit of [...share].sort((a, b) => a.subjectIndex - b.subjectIndex)) {
         const assignment = bySection.get(unit.sectionId)
            ?? { classId: unit.classId, sectionIds: [unit.sectionId], subjectIds: [] };
         assignment.subjectIds.push(unit.subjectId);
         bySection.set(unit.sectionId, assignment);
      }
      const lessonsBySubject = new Map<string, number>();
      for (const unit of share) lessonsBySubject.set(unit.subjectName, (lessonsBySubject.get(unit.subjectName) ?? 0) + unit.lessons);
      const specialization = [...lessonsBySubject].sort((a, b) => b[1] - a[1])[0][0];
      const workloadHours = share.reduce((sum, unit) => sum + unit.lessons, 0);
      const partTime = workloadHours < PART_TIME_BELOW;
      const fullSalary = teacherSalary(share[0].level, yearsOfExperience);
      const teacher = generateTeacher({
         specialization,
         yearsOfExperience,
         workloadHours,
         employmentType: partTime ? 'partTime' : 'fullTime',
         salary: partTime ? Math.round(fullSalary * workloadHours / MAX_TEACHER_LESSONS / 100) * 100 : fullSalary,
         assignments: [...bySection.values()],
      });
      return { ...teacher, hireDate: teacher.hireDate > yearStart ? yearStart : teacher.hireDate };
   });

   for (let i = selectedTeachers.length; i < teacherLimit; i++) {
      const classEntity = selectedClassRecords()[i % selectedClassRecords().length];
      const sections = getSectionsByClass(classEntity.id);
      const subject = subjectsData[i % subjectsData.length];
      const primarySection = sections[i % sections.length];
      const secondarySection = sections[(i + 1) % sections.length];
      const sectionIds = Array.from(new Set([
         primarySection?.id,
         i % 3 === 0 ? secondarySection?.id : null,
      ].filter(Boolean)));

      selectedTeachers.push(generateTeacher({
         hireDate: `${seedAcademicYear.slice(0, 4)}-09-01`,
         specialization: subject.name,
         assignments: [{
            classId: classEntity.id,
            sectionIds,
            subjectIds: [subject.id],
         }],
      }));
   }

   return { teachers: selectedTeachers };
}

export async function transportPack() {
   const drivers = [];
   const vehicles = [];

   for (const vehicleData of vehiclesData.slice(0, demoHeadcount.vehicles)) {
      const driver = generateDriver({ POLICY:CONFIG.DRIVER, hireDate: `${seedAcademicYear.slice(0, 4)}-09-01` });
      drivers.push(driver);

      const vehicle = generateVehicle({
         driverId: driver.id,
         licensePlate: `${vehicleData.licensePlate}-${seedAcademicYear}-${demoRunId}`,
         status: vehicleData.status,
      });

      vehicles.push(vehicle);
   }

    return {
       drivers,
       vehicles,
    };
}

export async function expensesPack() {
    const expenses = generateExpenses(CONFIG.EXPENSES.COUNT, {
       academicYear: seedAcademicYear,
       referenceDate: demoReferenceDate,
       scale: demoHeadcount.operatingCostScale,
    });
    return { expenses };
}

function dateOnly(date: Date): string {
   return date.toISOString().split('T')[0];
}

function isoDate(date: Date): string {
   return date.toISOString();
}

function offsetDate(days: number): Date {
   const date = new Date(demoReferenceDate);
   date.setDate(date.getDate() + days);
   const startsOn = new Date(`${seedAcademicYear.slice(0, 4)}-09-01T00:00:00.000Z`);
   const endsOn = new Date(`${seedAcademicYear.slice(5)}-08-31T23:59:59.999Z`);
   return date < startsOn ? startsOn : date > endsOn ? endsOn : date;
}

// A recent moment inside the seed year, once the student's placement has begun:
// a record's date decides its year and the class it is filed under.
function recentMomentInSeedYear(student: any, i: number): string {
   const earliest = student.yearEnrolledOn ?? `${seedAcademicYear.slice(0, 4)}-09-01`;
   const moment = offsetDate(-(1 + (i % 60)));
   return dateOnly(moment) < earliest ? `${earliest}T10:00:00.000Z` : isoDate(moment);
}

function pick<T>(items: T[]): T {
   return items[Math.floor(Math.random() * items.length)];
}

function sample<T>(items: T[], count: number): T[] {
   if (count <= 0 || items.length === 0) return [];
   const copy = [...items];
   for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
   }
   return copy.slice(0, Math.min(count, copy.length));
}

function selectedClassRecords() {
   return classesData.filter((classEntity: any) => selectedClasses.includes(classEntity.name));
}

function randomClassSection() {
   const classEntity = pick(selectedClassRecords());
   const classSections = sectionsData.filter((section: any) => section.classId === classEntity.id);
   return {
      classId: classEntity.id,
      sectionId: pick(classSections)?.id,
   };
}

function teacherContexts(teachers: any[]) {
   const contexts = [];
   for (const teacher of teachers) {
      for (const assignment of teacher.assignments || []) {
         for (const sectionId of assignment.sectionIds || []) {
            for (const subjectId of assignment.subjectIds || []) {
               contexts.push({
                  teacherId: teacher.id,
                  teacherUserId: teacher.userId,
                  classId: assignment.classId,
                  sectionId,
                  subjectId,
               });
            }
         }
      }
   }
   return contexts;
}

export function announcementsPack(count = featureCounts.announcements) {
   const audiences = ['all', 'students', 'teachers', 'parents', 'class'];
   return {
      announcements: Array.from({ length: Math.max(0, count) }, (_, i) => {
         const targetAudience = audiences[i % audiences.length] as any;
         const scoped = targetAudience === 'class' ? randomClassSection() : {};
         const publish = offsetDate(-i);
         return {
            title: [
               'Parent meeting reminder',
               'School schedule update',
               'Transport route notice',
               'Assessment calendar notice',
               'Cafeteria menu update',
            ][i % 5],
            content: 'Please review this school notice and contact the administration if more information is needed.',
            targetAudience,
            ...scoped,
            publishDate: isoDate(publish),
            expiryDate: isoDate(offsetDate(20 + i)),
         };
      }),
   };
}

// A day of the seed's teaching year: September to December fall in its first
// calendar year, January to August in the second.
function teachingDate(month: number, day: number) {
   const year = seedAcademicYear.slice(month >= 9 ? 0 : 5, month >= 9 ? 4 : 9);
   return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(date: string, days: number) {
   const moved = new Date(`${date}T12:00:00.000Z`);
   moved.setUTCDate(moved.getUTCDate() + days);
   return dateOnly(moved);
}

/** The date itself, or the Monday after when it falls on a Sunday. */
function schoolDay(date: string) {
   return new Date(`${date}T12:00:00.000Z`).getUTCDay() === 0 ? addDays(date, 1) : date;
}

/** The Monday of the week that starts on or after the date. */
function weekStarting(date: string) {
   const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
   return addDays(date, (8 - weekday) % 7);
}

/** What has already happened by today is done; the rest of the year is still ahead. */
function statusOn(date: string) {
   return date <= dateOnly(new Date()) ? 'completed' : 'scheduled';
}

// One school year's events, September to June.
const EVENT_CALENDAR = [
   { month: 9, day: 15, title: 'Back-to-school assembly', type: 'ceremony', location: 'Main Hall', visibility: 'public' },
   { month: 10, day: 17, title: 'Parent-teacher meeting', type: 'meeting', location: 'Main Hall', visibility: 'parents' },
   { month: 11, day: 12, title: 'Reading workshop', type: 'workshop', location: 'Library', visibility: 'students' },
   { month: 12, day: 10, title: 'Science fair', type: 'academic', location: 'Science Lab', visibility: 'public' },
   { month: 1, day: 28, title: 'Winter sports tournament', type: 'sports', location: 'Sports Field', visibility: 'students' },
   { month: 2, day: 6, title: 'First-semester results meeting', type: 'meeting', location: 'Main Hall', visibility: 'parents' },
   { month: 3, day: 11, title: 'Cultural week', type: 'cultural', location: 'Main Hall', visibility: 'public' },
   { month: 4, day: 15, title: 'Museum field trip', type: 'fieldtrip', location: 'City museum', visibility: 'students' },
   { month: 4, day: 29, title: 'Teacher training day', type: 'workshop', location: 'Library', visibility: 'teachers' },
   { month: 5, day: 13, title: 'Sports day', type: 'sports', location: 'Sports Field', visibility: 'public' },
   { month: 6, day: 12, title: 'Awards ceremony', type: 'ceremony', location: 'Main Hall', visibility: 'public' },
   { month: 6, day: 26, title: 'End-of-year show', type: 'cultural', location: 'Main Hall', visibility: 'public' },
];

export function eventsPack(count = featureCounts.events) {
   return {
      events: Array.from({ length: Math.max(0, count) }, (_, i) => {
         const event = EVENT_CALENDAR[i % EVENT_CALENDAR.length];
         // Past the calendar, events repeat a week later so their dates stay apart.
         const startDate = schoolDay(addDays(teachingDate(event.month, event.day), Math.floor(i / EVENT_CALENDAR.length) * 7));
         const scoped = event.type === 'fieldtrip' || event.type === 'workshop' && event.visibility === 'students'
            ? randomClassSection() : {};
         const hour = event.type === 'meeting' ? 16 : 9;
         return {
            title: event.title,
            description: 'Generated demo event for dashboard calendar and operations views.',
            type: event.type,
            startDate,
            endDate: startDate,
            startTime: `${String(hour).padStart(2, '0')}:00`,
            endTime: `${String(hour + 2).padStart(2, '0')}:00`,
            location: event.location,
            venue: event.location,
            visibility: event.visibility,
            status: statusOn(startDate),
            capacity: 40 + (i * 10),
            registrationRequired: i % 2 === 0,
            registrationDeadline: i % 2 === 0 ? addDays(startDate, -2) : null,
            ...scoped,
            notes: 'Demo seed event.',
         };
      }),
   };
}

// Every section's subjects, numbered within the section so its exams can be
// laid out over the exam week.
function sectionContexts(teachers: any[]) {
   const bySection = new Map<string, number>();
   return teacherContexts(teachers).map((context) => {
      const ordinal = bySection.get(context.sectionId) ?? 0;
      bySection.set(context.sectionId, ordinal + 1);
      return { ...context, ordinal };
   });
}

const subjectNames = new Map(subjectsData.map((subject) => [subject.id, subject.name]));

// Continuous assessment: a test in every subject about every six weeks.
const ASSESSMENT_CALENDAR = [
   { month: 9, day: 29, type: 'quiz', title: 'Diagnostic quiz', totalMarks: 10, duration: 30 },
   { month: 11, day: 10, type: 'test', title: 'Test 1', totalMarks: 20, duration: 60 },
   { month: 12, day: 15, type: 'assignment', title: 'Homework 1', totalMarks: 20, duration: 45 },
   { month: 2, day: 16, type: 'test', title: 'Test 2', totalMarks: 20, duration: 60 },
   { month: 4, day: 6, type: 'project', title: 'Class project', totalMarks: 20, duration: 90 },
   { month: 5, day: 18, type: 'test', title: 'Test 3', totalMarks: 20, duration: 60 },
];

/**
 * Every subject of every taught section follows the assessment calendar, a
 * section's subjects spread over the same week. Those already past are
 * completed and graded. A positive count keeps the first ones, round by round.
 */
export function assessmentsPack(teachers: any[], count = featureCounts.assessments) {
   const contexts = sectionContexts(teachers);
   const assessments = ASSESSMENT_CALENDAR.flatMap((round, roundIndex) => contexts.map((context, contextIndex) => {
      const { ordinal, ...placement } = context;
      const date = schoolDay(addDays(teachingDate(round.month, round.day), ordinal % 5));
      return {
         id: demoRecordId(`ASM${String(roundIndex * contexts.length + contextIndex + 1).padStart(4, '0')}`),
         ...placement,
         title: `${subjectNames.get(context.subjectId) ?? 'Subject'} · ${round.title}`,
         description: 'Generated assessment for demo academic history.',
         type: round.type,
         date,
         duration: round.duration,
         totalMarks: round.totalMarks,
         passingMarks: Math.floor(round.totalMarks / 2),
         instructions: 'Complete the assessment according to teacher instructions.',
         status: statusOn(date),
      };
   }));
   return { assessments: count > 0 ? assessments.slice(0, count) : assessments };
}

// Two semester exams, each section sitting two subjects a day, morning and afternoon.
const EXAM_CALENDAR = [
   { month: 1, day: 19, type: 'midterm', title: 'First-semester exam' },
   { month: 6, day: 1, type: 'final', title: 'Final exam' },
];

/** Every subject of every taught section sits both semester exams; see `assessmentsPack` for the count. */
export function examsPack(teachers: any[], count = featureCounts.exams) {
   const contexts = sectionContexts(teachers);
   const rooms = new Map([...new Set(contexts.map((context) => context.sectionId))].map((sectionId, index) => [sectionId, String(10 + index)]));
   const exams = EXAM_CALENDAR.flatMap((session, sessionIndex) => contexts.map((context, contextIndex) => {
      const { ordinal, ...placement } = context;
      const date = addDays(weekStarting(teachingDate(session.month, session.day)), Math.floor(ordinal / 2) % 6);
      const hour = ordinal % 2 === 0 ? 8 : 14;
      return {
         id: demoRecordId(`EXM${String(sessionIndex * contexts.length + contextIndex + 1).padStart(4, '0')}`),
         ...placement,
         title: `${subjectNames.get(context.subjectId) ?? 'Subject'} · ${session.title}`,
         description: 'Generated exam for demo academic records.',
         type: session.type,
         date,
         startTime: `${String(hour).padStart(2, '0')}:00`,
         endTime: `${String(hour + 2).padStart(2, '0')}:00`,
         duration: 120,
         totalMarks: 20,
         passingMarks: 10,
         roomNumber: rooms.get(context.sectionId),
         instructions: 'Read all questions carefully before answering.',
         status: statusOn(date),
      };
   }));
   return { exams: count > 0 ? exams.slice(0, count) : exams };
}

// A student's usual level, from 0.45 to 0.9 of the marks, so their results
// read like one pupil's rather than a fresh draw each time.
function studentLevel(studentId: string) {
   let hash = 0;
   for (const char of studentId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
   return 0.45 + (Math.abs(hash) % 46) / 100;
}

export function gradesPack(
   students: any[],
   assessments: any[],
   exams: any[] = [],
   count = featureCounts.grades,
) {
   const completedAssessments = assessments
      .filter((assessment: any) => assessment.status === 'completed')
      .map((assessment: any) => ({ ...assessment, sourceKey: 'assessmentId', sourceLabel: 'assessment' }));
   const completedExams = exams
      .filter((exam: any) => exam.status === 'completed')
      .map((exam: any) => ({ ...exam, sourceKey: 'examId', sourceLabel: 'exam' }));
   const completedSources = [];
   const sourceCount = Math.max(completedAssessments.length, completedExams.length);

   for (let index = 0; index < sourceCount; index++) {
      if (completedAssessments[index]) completedSources.push(completedAssessments[index]);
      if (completedExams[index]) completedSources.push(completedExams[index]);
   }

   const grades = [];
   for (const source of completedSources) {
      const sectionStudents = students.filter((student: any) =>
         student.sectionId === source.sectionId && student.yearEnrolledOn <= source.date);
      for (const student of sectionStudents) {
         const missed = Math.random() < 0.04;
         const max = Number(source.totalMarks || 20);
         const share = Math.min(1, Math.max(0.15, studentLevel(student.id) + (Math.random() - 0.5) * 0.3));
         grades.push({
            studentId: student.id,
            [source.sourceKey]: source.id,
            marksObtained: missed ? 0 : Math.max(0.5, Math.round(max * share * 4) / 4),
            feedback: missed
               ? `Absent during ${source.sourceLabel}.`
               : `Generated ${source.sourceLabel} feedback for the demo profile.`,
            status: missed ? 'missed' : 'graded',
            gradedBy: source.teacherUserId || null,
         });
      }
   }

   return { grades: count > 0 ? grades.slice(0, count) : grades };
}

export function alertsPack(students: any[], teachers: any[], count = featureCounts.alerts) {
   const types = ['academic', 'attendance', 'behavioral', 'health', 'system', 'announcement', 'reminder', 'emergency'];
   const priorities = ['low', 'medium', 'high', 'critical'];
   return {
      alerts: Array.from({ length: Math.max(0, count) }, (_, i) => {
         const type = types[i % types.length];
         const alert: any = {
            type,
            title: `${type[0].toUpperCase()}${type.slice(1)} alert`,
            message: 'Generated alert to exercise dashboard alerts, reports, and profile views.',
            priority: priorities[i % priorities.length],
            status: i % 5 === 0 ? 'acknowledged' : 'active',
            isRead: i % 5 === 0,
            targetAudience: ['all', 'students', 'teachers', 'parents'][i % 4],
         };
         if (['academic', 'attendance', 'behavioral', 'health'].includes(type) && students.length) {
            alert.studentId = students[i % students.length].id;
         } else if (type === 'reminder' && teachers.length) {
            alert.teacherId = teachers[i % teachers.length].id;
         } else if (type === 'announcement') {
            alert.classId = selectedClassRecords()[i % selectedClassRecords().length]?.id;
         }
         return alert;
      }),
   };
}

function conductContexts(students: any[], teachers: any[]) {
   const teachersBySection = new Map<string, any[]>();

   for (const teacher of teachers) {
      for (const assignment of teacher.assignments || []) {
         for (const sectionId of assignment.sectionIds || []) {
            const existing = teachersBySection.get(sectionId) || [];
            existing.push(teacher);
            teachersBySection.set(sectionId, existing);
         }
      }
   }

   return students
      .filter((student: any) => student.status === 'active' && student.classId && student.sectionId)
      .flatMap((student: any) => {
         const assignedTeachers = teachersBySection.get(student.sectionId) || [];
         return assignedTeachers.length
            ? [{ student, teacher: assignedTeachers[0] }]
            : [];
      });
}

export function disciplinePack(
   students: any[],
   teachers: any[],
   count = featureCounts.disciplineIncidents,
) {
   const contexts = conductContexts(students, teachers);
   const categories = [
      'classroom_disruption', 'disrespect', 'bullying', 'fighting', 'cheating',
      'vandalism', 'uniform_violation', 'device_misuse', 'prohibited_item', 'other',
   ];
   const severities = ['low', 'medium', 'high', 'critical'];
   const actions = [
      'verbal_warning', 'written_warning', 'detention', 'counseling',
      'parent_meeting', 'suspension', 'other',
   ];
   const descriptions = [
      'Repeatedly interrupted the lesson after classroom expectations were explained.',
      'Used disrespectful language during a disagreement with a classmate.',
      'Misused a personal device during class without permission.',
      'Damaged shared classroom materials and did not report it immediately.',
      'Did not follow the school uniform expectations after a reminder.',
   ];

   return {
      disciplineIncidents: Array.from(
         { length: contexts.length ? Math.max(0, count) : 0 },
         (_, i) => {
            const { student, teacher } = contexts[i % contexts.length];
            const shouldResolve = i % 3 !== 0;
            return {
               teacherId: teacher.id,
               studentId: student.id,
               incidentAt: recentMomentInSeedYear(student, i),
               category: categories[i % categories.length],
               severity: severities[i % severities.length],
               location: ['Classroom', 'Playground', 'Library', 'School entrance'][i % 4],
               description: descriptions[i % descriptions.length],
               resolution: shouldResolve ? {
                  actionType: actions[i % actions.length],
                  actionNote: 'The response was discussed with the student and documented for follow-up.',
                  resolutionNote: 'The student acknowledged the incident and agreed to the follow-up plan.',
               } : null,
            };
         },
      ),
   };
}

export function behaviorRewardsPack(
   students: any[],
   teachers: any[],
   count = featureCounts.behaviorRewards,
) {
   const contexts = conductContexts(students, teachers);
   const categories = [
      'academic_effort', 'improvement', 'respect', 'helpfulness', 'leadership',
      'teamwork', 'responsibility', 'community_service', 'excellent_attendance', 'other',
   ];
   const recognitionLevels = ['appreciation', 'achievement', 'excellence'];
   const rewardTypes = [
      'verbal_praise', 'written_praise', 'merit', 'badge',
      'certificate', 'privilege', 'prize', 'other',
   ];
   const descriptions = [
      'Consistently supported classmates and contributed positively to group work.',
      'Showed strong improvement through focused effort and thoughtful participation.',
      'Demonstrated leadership by organizing materials and helping the class stay on task.',
      'Modelled respectful communication and responsibility throughout the school day.',
      'Maintained excellent attendance and arrived prepared for every lesson this period.',
   ];

   return {
      behaviorRewards: Array.from(
         { length: contexts.length ? Math.max(0, count) : 0 },
         (_, i) => {
            const { student, teacher } = contexts[(i * 3) % contexts.length];
            const recognitionLevel = recognitionLevels[i % recognitionLevels.length];
            return {
               teacherId: teacher.id,
               studentId: student.id,
               behaviorAt: recentMomentInSeedYear(student, i),
               category: categories[i % categories.length],
               recognitionLevel,
               description: descriptions[i % descriptions.length],
               rewardType: rewardTypes[i % rewardTypes.length],
               points: recognitionLevel === 'excellence' ? 30 : recognitionLevel === 'achievement' ? 20 : 10,
               rewardNote: i % 4 === 0 ? 'Recognized during the weekly class celebration.' : null,
            };
         },
      ),
   };
}

export function vehicleAssignmentsPack(vehicles: any[], drivers: any[], count = featureCounts.vehicleAssignments) {
   return {
      vehicleAssignments: sample(vehicles, count).map((vehicle: any, i) => ({
         vehicleId: vehicle.id,
         driverId: vehicle.driverId || drivers[i % drivers.length]?.id,
         assignmentDate: dateOnly(offsetDate(-90 + i * 3)),
         status: i % 4 === 0 ? 'completed' : 'active',
         unassignmentDate: i % 4 === 0 ? dateOnly(offsetDate(-15 + i)) : null,
         notes: 'Generated vehicle-driver assignment.',
      })).filter((assignment: any) => assignment.vehicleId && assignment.driverId),
   };
}

export function studentRoutesPack(students: any[], vehicles: any[], count = featureCounts.studentRoutes) {
   const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
   ];
   const startMonth = months.indexOf(settingsData.startMonth);
   const endMonth = months.indexOf(settingsData.endMonth);
   const startYear = Number(seedAcademicYear.split('-')[0]);
   const endYear = endMonth < startMonth ? startYear + 1 : startYear;
   const yearStart = dateOnly(new Date(Date.UTC(startYear, startMonth, 1)));
   const yearEnd = dateOnly(new Date(Date.UTC(endYear, endMonth + 1, 0)));
   const eligibleStudents = students.filter((student: any) =>
      student.status === 'active' && student.enrollmentDate && student.enrollmentDate <= yearEnd,
   );
   const activeVehicles = vehicles.filter((vehicle: any) => vehicle.status === 'active');

   if (count > 0 && eligibleStudents.length > 0 && activeVehicles.length === 0) {
      throw new Error('Cannot generate student routes without an active vehicle');
   }

   return {
      studentRoutes: sample(eligibleStudents, count).map((student: any, i) => {
         const scheduledDate = dateOnly(new Date(Date.UTC(startYear, startMonth, 1 + i * 7)));
         return {
            studentId: student.id,
            vehicleId: activeVehicles[i % activeVehicles.length].id,
            assignmentDate: [yearStart, student.enrollmentDate, scheduledDate > yearEnd ? yearEnd : scheduledDate]
               .sort().at(-1)!,
            status: 'active',
            pickupLocation: student.address,
            dropoffLocation: 'School main gate',
            notes: 'Generated student transport route.',
         };
      }),
   };
}

export function refuelsPack(vehicles: any[], drivers: any[], count = featureCounts.refuels) {
   return {
      refuels: Array.from({ length: Math.max(0, count) }, (_, i) => {
         const vehicle = vehicles[i % vehicles.length];
         const liters = 35 + (i % 8) * 5;
         const costPerLiter = 13.5 + (i % 4) * 0.35;
         return {
            vehicleId: vehicle?.id,
            drivers: vehicle?.driverId || drivers[i % drivers.length]?.id || null,
            datetime: isoDate(offsetDate(-80 + i * 3)),
            liters: liters.toFixed(2),
            costPerLiter: costPerLiter.toFixed(2),
            totalCost: (liters * costPerLiter).toFixed(2),
            fuelLevelAfter: String(60 + (i % 5) * 8),
            voucherNumber: demoRecordId(`FUEL-${String(i + 1).padStart(4, '0')}`),
            mileageAtRefuel: String(Number(vehicle?.currentMileage || 10000) + i * 120),
            attendant: ['Afriquia', 'Shell', 'TotalEnergies'][i % 3],
            notes: 'Generated refuel history.',
         };
      }).filter((refuel: any) => refuel.vehicleId),
   };
}

export function maintenancePack(vehicles: any[], count = featureCounts.maintenance) {
   const types = ['scheduled', 'repair', 'inspection', 'oilChange', 'filterChange', 'other'];
   return {
      maintenance: Array.from({ length: Math.max(0, count) }, (_, i) => {
         const vehicle = vehicles[i % vehicles.length];
         return {
            vehicleId: vehicle?.id,
            type: types[i % types.length],
            title: ['Oil change', 'Brake inspection', 'Tire rotation', 'Annual inspection'][i % 4],
            dueHours: String(100 + i * 25),
            cost: String(500 + i * 125),
            scheduledDate: dateOnly(offsetDate(5 + i * 2)),
            priority: ['low', 'normal', 'high', 'critical'][i % 4],
            partsUsed: i % 2 === 0 ? 'Filters, oil, inspection kit' : null,
            assignedTo: ['Garage Atlas', 'Internal workshop', 'Transport team'][i % 3],
            notes: 'Generated maintenance schedule.',
         };
      }).filter((item: any) => item.vehicleId),
   };
}

// Hiring order and monthly pay (MAD) of a private school's support staff: the
// posts every campus needs come first, at or above the SMIG.
const SUPPORT_STAFF_POSTS = [
   { role: 'principal', department: 'Administration', salary: 9500 },
   { role: 'accountant', department: 'Administration', salary: 5500 },
   { role: 'secretary', department: 'Administration', salary: 4200 },
   { role: 'cleaner', department: 'Operations', salary: 3300 },
   { role: 'security', department: 'Operations', salary: 3500 },
   { role: 'assistant', department: 'Support', salary: 3600 },
   { role: 'busAssistant', department: 'Transport', salary: 3300 },
   { role: 'receptionist', department: 'Administration', salary: 3800 },
   { role: 'itSupport', department: 'Support', salary: 6000 },
   { role: 'librarian', department: 'Support', salary: 4200 },
];
// Larger campuses add these posts again once every post above is filled.
const REPEATED_SUPPORT_POSTS = ['assistant', 'cleaner', 'busAssistant', 'secretary', 'security']
   .map((role) => SUPPORT_STAFF_POSTS.find((post) => post.role === role)!);

export function staffPack(count = demoHeadcount.staff) {
   return {
      staff: Array.from({ length: Math.max(0, count) }, (_, i) => {
         const base = generateDriver({ id: `STF${String(i + 1).padStart(4, '0')}` });
         const post = SUPPORT_STAFF_POSTS[i]
            ?? REPEATED_SUPPORT_POSTS[(i - SUPPORT_STAFF_POSTS.length) % REPEATED_SUPPORT_POSTS.length];
         return {
            id: demoRecordId(`STF${String(i + 1).padStart(4, '0')}`),
             employeeCode: `DEMO-${seedAcademicYear}-${demoRunId}-STF-${String(i + 1).padStart(3, '0')}`,
             name: base.name,
             email: base.email,
             cin: base.cin,
            gender: base.gender,
            phone: base.phone,
            address: base.address,
            role: post.role,
            department: post.department,
            compensationMode: 'monthly',
            salary: post.salary + (i % 3) * 200,
            employmentType: i < SUPPORT_STAFF_POSTS.length ? 'fullTime' : ['fullTime', 'partTime', 'contract'][i % 3],
            hireDate: base.hireDate > `${seedAcademicYear.slice(0, 4)}-09-01`
               ? `${seedAcademicYear.slice(0, 4)}-09-01` : base.hireDate,
            status: 'active',
            bankAccount: `MA64${String(1000000000000000 + i).padStart(16, '0')}`,
            emergencyContact: base.emergencyContact,
            emergencyPhone: base.emergencyPhone,
         };
      }),
   };
}

// Academic-year payroll periods: one run per school month from September through
// June. July/August stay light in the demo dashboard, matching the summer-break
// expense profile instead of making the current-month KPI look like regular term.
function academicYearPeriods(): string[] {
   const now = demoReferenceDate;
   const startYear = Number(seedAcademicYear.split('-')[0]);
   const startMonth = 8; // September (0-indexed)
   const endYear = now.getFullYear();
   const endMonth = now.getMonth();
   const periods: string[] = [];
   let y = startYear, m = startMonth;
   while (y < endYear || (y === endYear && m <= endMonth)) {
      if (m !== 6 && m !== 7) {
         periods.push(`${y}-${String(m + 1).padStart(2, '0')}`);
      }
      m++;
      if (m > 11) { m = 0; y++; }
   }
   return periods;
}

export function payrollPack(count = featureCounts.payrollPeriods) {
   // Only teaching months in the selected year, up to the demo reference day.
   const periods = academicYearPeriods();
   const payrollPeriods = count > 0
      ? periods.slice(-count)
      : periods;
   return { payrollPeriods };
}

// ============================================
// 🚀 MAIN EXECUTION
// ============================================

const OUTPUT_DIR = join(process.cwd(), CONFIG.OUTPUT_DIR);

async function generate() {
   console.log(`\n🚀 Starting Data Generation...`);
   console.time("⏱️ Generation Time");

   try {
       const [studentData, teacherData, transportData, expenseData] = await Promise.all([
          studentsPack(),
          teachersPack(),
          transportPack(),
          expensesPack()
       ]);
       const announcementData = announcementsPack();
       const eventData = eventsPack();
       const assessmentData = assessmentsPack(teacherData.teachers);
       const examData = examsPack(teacherData.teachers);
       const gradeData = gradesPack(studentData.students, assessmentData.assessments, examData.exams);
       const alertData = alertsPack(studentData.students, teacherData.teachers);
       const disciplineData = disciplinePack(studentData.students, teacherData.teachers);
       const behaviorRewardData = behaviorRewardsPack(studentData.students, teacherData.teachers);
       const vehicleAssignmentData = vehicleAssignmentsPack(transportData.vehicles, transportData.drivers);
       const studentRouteData = studentRoutesPack(studentData.students, transportData.vehicles);
       const refuelData = refuelsPack(transportData.vehicles, transportData.drivers);
       const maintenanceData = maintenancePack(transportData.vehicles);
       const staffData = staffPack();
       const payrollData = payrollPack();

      // Cleanup and setup output directory
      rmSync(OUTPUT_DIR, { recursive: true, force: true });
      mkdirSync(OUTPUT_DIR, { recursive: true });

      // Prepare files for writing
       const files = {
          'students.json': studentData.students,
          'parents.json': studentData.parents,
          'fees.json': studentData.fees,
          'teachers.json': teacherData.teachers,
          'drivers.json': transportData.drivers,
          'vehicles.json': transportData.vehicles,
          'expenses.json': expenseData.expenses,
          'announcements.json': announcementData.announcements,
          'events.json': eventData.events,
          'assessments.json': assessmentData.assessments,
          'exams.json': examData.exams,
          'grades.json': gradeData.grades,
          'alerts.json': alertData.alerts,
          'disciplineIncidents.json': disciplineData.disciplineIncidents,
          'behaviorRewards.json': behaviorRewardData.behaviorRewards,
          'vehicleAssignments.json': vehicleAssignmentData.vehicleAssignments,
          'studentRoutes.json': studentRouteData.studentRoutes,
          'refuels.json': refuelData.refuels,
          'maintenance.json': maintenanceData.maintenance,
          'staff.json': staffData.staff,
          'payrollPeriods.json': payrollData.payrollPeriods,
       };

      // Write files concurrently
      await Promise.all(
         Object.entries(files).map(([name, data]) =>
            Bun.write(join(OUTPUT_DIR, name), JSON.stringify(data, null, 2))
         )
      );

      console.log(`\n✅ Generation Complete! Data saved to ${OUTPUT_DIR}/`);
      console.log(`--- Generated Counts ---`);
      console.log(`   Students:  ${studentData.students.length}`);
      console.log(`   Parents:   ${studentData.parents.length}`);
      console.log(`   Fees:      ${studentData.fees.length}`);
      console.log(`   Teachers:  ${teacherData.teachers.length}`);
       console.log(`   Drivers:   ${transportData.drivers.length}`);
       console.log(`   Vehicles:  ${transportData.vehicles.length}`);
       console.log(`   Expenses:  ${expenseData.expenses.length}`);
       console.log(`   Announcements: ${announcementData.announcements.length}`);
       console.log(`   Events:    ${eventData.events.length}`);
       console.log(`   Assessments: ${assessmentData.assessments.length}`);
       console.log(`   Exams:     ${examData.exams.length}`);
       console.log(`   Grades:    ${gradeData.grades.length}`);
       console.log(`   Alerts:    ${alertData.alerts.length}`);
       console.log(`   Discipline incidents: ${disciplineData.disciplineIncidents.length}`);
       console.log(`   Behavior rewards: ${behaviorRewardData.behaviorRewards.length}`);
       console.log(`   Vehicle assignments: ${vehicleAssignmentData.vehicleAssignments.length}`);
       console.log(`   Student routes: ${studentRouteData.studentRoutes.length}`);
       console.log(`   Refuels:   ${refuelData.refuels.length}`);
       console.log(`   Maintenance: ${maintenanceData.maintenance.length}`);
       console.log(`   Staff:     ${staffData.staff.length}`);
       console.log(`   Payroll periods: ${payrollData.payrollPeriods.length}`);


   } catch (error) {
      console.error(`\n❌ Error during generation:`, error);
      process.exit(1);
   } finally {
      console.timeEnd("⏱️ Generation Time");
   }
}

if (import.meta.main) generate();
