import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';
import { classesData, sectionsData, subjectsData, vehiclesData, generateFees } from '@/fakers/index';
import { generateDriver, generateFamilyUnit, generateStudent, generateTeacher, generateTeachers, generateVehicle, getClassByName, getSectionsByClass } from '@/fakers/entities';
import { generateExpenses } from '@/fakers/entities';

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
   students: 500,
   teachers: 50,
   announcements: 12,
   events: 12,
   assessments: 30,
   exams: 18,
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
   staff: 40,
};

export const DEFAULT_DEMO_CLASSES = ['CP','CE1','CE2','CM1','CM2','CE6','1AC','2AC','3AC'];
const DEFAULT_CLASSES_ARG = DEFAULT_DEMO_CLASSES.join(',');
const DEFAULT_STUDENT_COUNT = DEFAULT_DEMO_COUNTS.students;
const DEFAULT_TEACHER_LIMIT = DEFAULT_DEMO_COUNTS.teachers;

const totalStudents      = parseInt(getCliArg('students', 's') ?? String(DEFAULT_STUDENT_COUNT), 10); // total across selected classes
const teacherLimit       = parseInt(getCliArg('teachers', 't') ?? String(DEFAULT_TEACHER_LIMIT), 10); // 0 = no limit
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

const ALL_CLASS_NAMES = ['PS','MS','GS','CP','CE1','CE2','CM1','CM2','CE6','1AC','2AC','3AC','TC','1BAC','2BAC'];

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

   // Only selected classes receive students. Each class gets its share of totalStudents
   // spread across its available sections.
   ASSIGNMENTS: selectedClasses.map((name, i) => {
      const classObj = getClassByName(name);
      const sections = classObj ? getSectionsByClass(classObj.id) : [];

      return {
         CLASS_NAME: name,
         SECTION_COUNTS: distributeStudents(perClassCounts[i], sections.length || 1),
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

// ============================================
// 📦 DATA PACKS
// ============================================

export async function studentsPack() {
   const db = { students: [], parents: [], fees: [] };

   for (const ASSIGNMENT of CONFIG.ASSIGNMENTS) {

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
               });

               const fees = generateFees({
                  studentId: student.id,
                  policy: CONFIG.FEE_POLICY
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

export async function teachersPack() {
   const teachers = generateTeachers({
      ASSIGNMENTS: CONFIG.ASSIGNMENTS,
   });

   if (teacherLimit <= 0) return { teachers };

   const selectedTeachers = teachers.slice(0, teacherLimit);

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

   for (const vehicleData of vehiclesData) {
      const driver = generateDriver({ POLICY:CONFIG.DRIVER });
      drivers.push(driver);

      const vehicle = generateVehicle({
         driverId: driver.id,
         licensePlate: vehicleData.licensePlate,
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
    const expenses = generateExpenses(CONFIG.EXPENSES.COUNT);
    return { expenses };
}

function dateOnly(date: Date): string {
   return date.toISOString().split('T')[0];
}

function isoDate(date: Date): string {
   return date.toISOString();
}

function offsetDate(days: number): Date {
   const date = new Date();
   date.setDate(date.getDate() + days);
   return date;
}

function monthPeriod(offset: number): string {
   const date = new Date();
   date.setMonth(date.getMonth() - offset);
   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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

export function eventsPack(count = featureCounts.events) {
   const eventTypes = ['academic', 'sports', 'cultural', 'meeting', 'workshop', 'fieldtrip', 'ceremony'];
   return {
      events: Array.from({ length: Math.max(0, count) }, (_, i) => {
         const start = offsetDate(i % 4 === 0 ? -10 - i : 5 + i * 3);
         const registrationDeadline = new Date(start);
         registrationDeadline.setDate(registrationDeadline.getDate() - 2);
         const scoped = i % 3 === 0 ? randomClassSection() : {};
         const status = start < new Date() ? 'completed' : 'scheduled';
         return {
            title: [
               'Science fair',
               'Parent-teacher meeting',
               'Sports day',
               'Reading workshop',
               'Awards ceremony',
            ][i % 5],
            description: 'Generated demo event for dashboard calendar and operations views.',
            type: eventTypes[i % eventTypes.length],
            startDate: dateOnly(start),
            endDate: dateOnly(start),
            startTime: `${String(8 + (i % 7)).padStart(2, '0')}:00`,
            endTime: `${String(10 + (i % 7)).padStart(2, '0')}:00`,
            location: ['Main Hall', 'Library', 'Sports Field', 'Science Lab'][i % 4],
            venue: ['Main Hall', 'Library', 'Sports Field', 'Science Lab'][i % 4],
            visibility: ['public', 'students', 'parents', 'teachers'][i % 4],
            status,
            capacity: 40 + (i * 10),
            registrationRequired: i % 2 === 0,
            registrationDeadline: i % 2 === 0 ? dateOnly(registrationDeadline) : null,
            ...scoped,
            notes: 'Demo seed event.',
         };
      }),
   };
}

export function assessmentsPack(teachers: any[], count = featureCounts.assessments) {
   const contexts = teacherContexts(teachers);
   const types = ['quiz', 'assignment', 'project', 'participation', 'test', 'presentation'];
   return {
      assessments: Array.from({ length: Math.max(0, Math.min(count, contexts.length || count)) }, (_, i) => {
         const context = contexts.length ? contexts[i % contexts.length] : randomClassSection();
         const totalMarks = [10, 20, 40, 100][i % 4];
         return {
            id: `ASM${String(i + 1).padStart(4, '0')}`,
            ...context,
            title: ['Weekly quiz', 'Unit test', 'Class project', 'Oral presentation'][i % 4],
            description: 'Generated assessment for demo academic history.',
            type: types[i % types.length],
            date: dateOnly(offsetDate(i % 3 === 0 ? -20 - i : 7 + i)),
            duration: [30, 45, 60, 90][i % 4],
            totalMarks,
            passingMarks: Math.floor(totalMarks / 2),
            instructions: 'Complete the assessment according to teacher instructions.',
            status: i % 3 === 0 ? 'completed' : 'scheduled',
         };
      }),
   };
}

export function examsPack(teachers: any[], count = featureCounts.exams) {
   const contexts = teacherContexts(teachers);
   const types = ['midterm', 'final', 'standardized'];
   return {
      exams: Array.from({ length: Math.max(0, Math.min(count, contexts.length || count)) }, (_, i) => {
         const context = contexts.length ? contexts[(i * 2) % contexts.length] : randomClassSection();
         const totalMarks = [20, 40, 60, 100][i % 4];
         const hour = 8 + (i % 6);
         return {
            id: `EXM${String(i + 1).padStart(4, '0')}`,
            ...context,
            title: ['Mathematics exam', 'Language exam', 'Science exam', 'History exam'][i % 4],
            description: 'Generated exam for demo academic records.',
            type: types[i % types.length],
            date: dateOnly(offsetDate(i % 3 === 0 ? -30 - i : 14 + i)),
            startTime: `${String(hour).padStart(2, '0')}:00`,
            endTime: `${String(hour + 2).padStart(2, '0')}:00`,
            duration: 120,
            totalMarks,
            passingMarks: Math.floor(totalMarks / 2),
            roomNumber: String(10 + i),
            instructions: 'Read all questions carefully before answering.',
            status: i % 3 === 0 ? 'completed' : 'scheduled',
         };
      }),
   };
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
      const sectionStudents = students.filter((student: any) => student.sectionId === source.sectionId);
      for (const student of sectionStudents) {
         const missed = Math.random() < 0.08;
         const max = Number(source.totalMarks || 20);
         grades.push({
            studentId: student.id,
            [source.sourceKey]: source.id,
            marksObtained: missed ? 0 : Math.max(1, Math.round((max * (0.45 + Math.random() * 0.5)) * 100) / 100),
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
         } else if (type === 'system') {
            alert.subjectId = subjectsData[i % subjectsData.length]?.id;
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
               incidentAt: isoDate(offsetDate(-(2 + (i % 75)))),
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
               behaviorAt: isoDate(offsetDate(-(1 + (i % 60)))),
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
   return {
      studentRoutes: sample(students, count).map((student: any, i) => ({
         studentId: student.id,
         vehicleId: vehicles[i % vehicles.length]?.id,
         assignmentDate: dateOnly(offsetDate(-60 + i)),
         status: 'active',
         pickupLocation: student.address,
         dropoffLocation: 'School main gate',
         notes: 'Generated student transport route.',
      })).filter((route: any) => route.studentId && route.vehicleId),
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
            voucherNumber: `FUEL-${String(i + 1).padStart(4, '0')}`,
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

export function staffPack(count = featureCounts.staff) {
   const secondaryRoles = ['principal', 'secretary', 'receptionist', 'accountant', 'librarian', 'itSupport', 'busAssistant', 'cleaner', 'security'];
   return {
      staff: Array.from({ length: Math.max(0, count) }, (_, i) => {
         const base = generateDriver({ id: `STF${String(i + 1).padStart(4, '0')}` });
         const role = i % 2 === 0 ? 'assistant' : secondaryRoles[Math.floor(i / 2) % secondaryRoles.length];
         return {
            id: `STF${String(i + 1).padStart(4, '0')}`,
             employeeCode: `DEMO-STF-${String(i + 1).padStart(3, '0')}`,
             name: base.name,
             email: base.email,
             cin: base.cin,
            gender: base.gender,
            phone: base.phone,
            address: base.address,
            role,
            department: ['Administration', 'Operations', 'Support', 'Transport'][i % 4],
            compensationMode: 'monthly',
            salary: 3200 + (i % 6) * 600,
            employmentType: ['fullTime', 'partTime', 'contract'][i % 3],
            hireDate: base.hireDate,
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
   const now = new Date();
   const startYear = 2025;
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
   // count <= 0 → auto: full academic year (Sep → now). A positive count still
   // yields the last `count` calendar months (legacy behaviour, via --payrollPeriods).
   const payrollPeriods = count > 0
      ? Array.from({ length: count }, (_, i) => monthPeriod(i))
      : academicYearPeriods();
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
