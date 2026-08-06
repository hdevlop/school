import * as fake from './fakers';
import { nanoid } from 'nanoid';
import { feeTypeData, vehiclesData, sectionsData, DISCOUNT_CATALOG, SCHEDULES, classesData, subjectsData } from './staticData';
import { chance, getNumberOfChildren, getSubjectByName, getSubjectsNames, pickRandom, randomClass, randomSubject } from './fakers';
import teachersData from '../scripts/demo/data/teachers.json';

type DemoTeacherAssignment = {
   classId: string;
   sectionIds: string[];
   subjectIds: string[];
};

type DemoTeacher = {
   id: string;
   assignments?: DemoTeacherAssignment[];
};

//=========================================================================//
// ACADEMIC ENTITIES
//=========================================================================//

export function getClassByName(className: string) {
   return classesData.find(c => c.name === className);
}

export function getSectionsByClass(classId: string) {
   return sectionsData.filter(s => s.classId === classId);
}

export function generateFeeType() {
   return fake.randomFeeType();
}

export function generateClass() {
   const randomClass = fake.randomClass();
   return {
      id: randomClass.id,
      name: randomClass.name,
      description: randomClass.description,
      academicYear: randomClass.academicYear,
      level: randomClass.level
   };
}

export function generateSection(classId = null) {
   const selectedClassId = classId || generateClass().id;
   const classNumeric = parseInt(selectedClassId.replace(/\D/g, ''));
   const baseSectionNum = classNumeric * 3;
   const offset = fake.randomInt(0, 2);
   const sectionNum = baseSectionNum + offset;
   const sectionId = fake.createId('SC', sectionNum, 2);
   const sectionName = fake.randomSectionName();

   return {
      id: sectionId,
      name: sectionName,
      maxStudents: fake.randomInt(20, 30),
      roomNumber: fake.randomInt(1, 100),
      classId: selectedClassId
   };
}

export function generateSubject() {
   return fake.randomSubject();
}

function dateInputFromDate(date: Date): string {
   return date.toISOString().split('T')[0];
}

function timeInput(hour: number, minute = 0): string {
   return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function futureSchoolDate(minDays = 3, maxDays = 90): string {
   const date = new Date();
   date.setDate(date.getDate() + fake.randomInt(minDays, maxDays));
   return dateInputFromDate(date);
}

function addDays(dateText: string, days: number): string {
   const date = new Date(`${dateText}T00:00:00`);
   date.setDate(date.getDate() + days);
   return dateInputFromDate(date);
}

function pickAcademicContext() {
   const teacher = fake.selectRandomElement(teachersData as DemoTeacher[]);
   const assignment = fake.selectRandomElement<DemoTeacherAssignment>(teacher.assignments || []);
   const classId = assignment?.classId || fake.randomClass().id;
   const classSections = assignment?.sectionIds?.length
      ? assignment.sectionIds
      : sectionsData.filter((section: any) => section.classId === classId).map((section: any) => section.id);

   return {
      classId,
      sectionId: fake.selectRandomElement(classSections),
      subjectId: fake.selectRandomElement(assignment?.subjectIds?.length ? assignment.subjectIds : subjectsData.map((subject: any) => subject.id)),
      teacherId: teacher.id,
   };
}

const ANNOUNCEMENT_TITLES = [
   'Parent meeting reminder',
   'School schedule update',
   'Uniform policy reminder',
   'Library week announcement',
   'Cafeteria menu update',
   'Transport route notice',
   'Exam preparation notice',
   'Sports day information',
   'End-of-term ceremony',
   'Administrative office hours',
];

const ANNOUNCEMENT_CONTENT = [
   'Please review this important school notice and contact the administration if you need additional information.',
   'This announcement is shared with the selected audience to keep families and staff aligned on upcoming school activities.',
   'The school administration asks everyone concerned to take note of the details and respect the indicated schedule.',
   'A short reminder for the school community. Further details can be requested from the main office during working hours.',
];

export function generateAnnouncement(options: any = {}) {
   const targetAudience = options.targetAudience || fake.selectRandomElement(['all', 'students', 'teachers', 'parents', 'class']);
   const publishDate = options.publishDate || futureSchoolDate(0, 20);
   const isClassAudience = targetAudience === 'class';
   const classEntity = isClassAudience ? fake.randomClass() : null;
   const classSections = classEntity
      ? sectionsData.filter((section: any) => section.classId === classEntity.id)
      : [];

   return {
      title: options.title || fake.selectRandomElement(ANNOUNCEMENT_TITLES),
      content: options.content || fake.selectRandomElement(ANNOUNCEMENT_CONTENT),
      targetAudience,
      classId: isClassAudience ? classEntity?.id : undefined,
      sectionId: isClassAudience && classSections.length && Math.random() < 0.5
         ? fake.selectRandomElement(classSections as any[]).id
         : undefined,
      publishDate,
      expiryDate: options.expiryDate || addDays(publishDate, fake.randomInt(7, 45)),
   };
}

const EVENT_TITLES = {
   academic: ['Science fair', 'Reading workshop', 'Math challenge', 'Academic orientation'],
   sports: ['Sports day', 'Football tournament', 'Athletics morning', 'Inter-class games'],
   cultural: ['Cultural week', 'Art exhibition', 'Theater afternoon', 'Poetry celebration'],
   holiday: ['School holiday', 'National holiday observance', 'Mid-term break'],
   exam: ['Mock exam session', 'Exam briefing', 'Revision day'],
   meeting: ['Parent-teacher meeting', 'Staff coordination meeting', 'Class council'],
   workshop: ['Digital skills workshop', 'First aid workshop', 'Study skills workshop'],
   fieldtrip: ['Museum field trip', 'Science center visit', 'Historical site visit'],
   ceremony: ['Awards ceremony', 'End-of-term ceremony', 'Graduation rehearsal'],
   conference: ['Education conference', 'Student leadership conference'],
   other: ['School community event', 'Open campus activity'],
};

export function generateEvent(options: any = {}) {
   const type = options.type || fake.selectRandomElement(Object.keys(EVENT_TITLES));
   const startDate = options.startDate || futureSchoolDate(2, 80);
   const hour = fake.randomInt(8, 15);
   const classScoped = Math.random() < 0.45;
   const classEntity = classScoped ? fake.randomClass() : null;
   const classSections = classEntity
      ? sectionsData.filter((section: any) => section.classId === classEntity.id)
      : [];

   return {
      title: options.title || fake.selectRandomElement(EVENT_TITLES[type]),
      description: options.description || fake.randomSentence(),
      type,
      startDate,
      endDate: options.endDate || addDays(startDate, Math.random() < 0.85 ? 0 : 1),
      startTime: options.startTime || timeInput(hour, 0),
      endTime: options.endTime || timeInput(Math.min(hour + fake.randomInt(1, 3), 18), 0),
      location: options.location || fake.city(),
      venue: options.venue || fake.selectRandomElement(['Main Hall', 'Library', 'Sports Field', 'Room 12', 'Science Lab']),
      classId: classEntity?.id,
      sectionId: classSections.length && Math.random() < 0.5 ? fake.selectRandomElement(classSections as any[]).id : undefined,
      visibility: options.visibility || fake.selectRandomElement(['public', 'teachers', 'students', 'parents', 'staff']),
      status: options.status || 'scheduled',
      capacity: options.capacity ?? (Math.random() < 0.5 ? fake.randomInt(20, 250) : undefined),
      registrationRequired: options.registrationRequired ?? Math.random() < 0.35,
      registrationDeadline: options.registrationDeadline || (Math.random() < 0.35 ? addDays(startDate, -2) : undefined),
      notes: options.notes || '',
   };
}

const EXAM_TITLES = ['Mathematics exam', 'Language exam', 'Science exam', 'History exam', 'Geography exam', 'Computer science exam'];
const ASSESSMENT_TITLES = ['Weekly quiz', 'Homework assessment', 'Class project', 'Oral presentation', 'Practical activity', 'Unit test'];

export function generateExam(options: any = {}) {
   const context = pickAcademicContext();
   const date = options.date || futureSchoolDate(5, 75);
   const hour = fake.randomInt(8, 14);
   const duration = options.duration ?? fake.selectRandomElement([60, 90, 120]);
   const totalMarks = options.totalMarks ?? fake.selectRandomElement([20, 40, 60, 100]);

   return {
      ...context,
      title: options.title || fake.selectRandomElement(EXAM_TITLES),
      description: options.description || fake.randomSentence(),
      type: options.type || fake.selectRandomElement(['midterm', 'final', 'standardized']),
      date,
      startTime: options.startTime || timeInput(hour, 0),
      endTime: options.endTime || timeInput(Math.min(hour + Math.ceil(duration / 60), 18), duration % 60),
      duration,
      totalMarks,
      passingMarks: options.passingMarks ?? Math.floor(totalMarks * 0.5),
      roomNumber: options.roomNumber ?? fake.randomInt(1, 45),
      instructions: options.instructions || 'Read all instructions carefully before answering.',
      status: options.status || 'scheduled',
   };
}

export function generateAssessment(options: any = {}) {
   const context = pickAcademicContext();
   const totalMarks = options.totalMarks ?? fake.selectRandomElement([10, 20, 40, 100]);

   return {
      ...context,
      title: options.title || fake.selectRandomElement(ASSESSMENT_TITLES),
      description: options.description || fake.randomSentence(),
      type: options.type || fake.selectRandomElement(['quiz', 'assignment', 'project', 'participation', 'test', 'presentation']),
      date: options.date || futureSchoolDate(3, 60),
      duration: options.duration ?? fake.selectRandomElement([30, 45, 60, 90]),
      totalMarks,
      passingMarks: options.passingMarks ?? Math.floor(totalMarks * 0.5),
      instructions: options.instructions || 'Complete the work individually and submit it before the deadline.',
      status: options.status || 'scheduled',
   };
}


//========================//
// TEACHERS ENTITIES
// =======================//

function generateRandomAssignments() {
   const numClasses = fake.integer(1, 2); 
   const assignments = [];
   const usedClassIds = new Set();
   
   for (let i = 0; i < numClasses; i++) {
      let classEntity;
      do {
         classEntity = randomClass();
      } while (usedClassIds.has(classEntity.id));
      usedClassIds.add(classEntity.id);
      
      const sections = getSectionsByClass(classEntity.id); 
      
      const numSections = fake.integer(1, Math.min(3, sections.length));
      const selectedSections = fake.shuffle(sections).slice(0, numSections);

      const numSubjects = fake.integer(1, 2);
      const subjectIds = [];
      const usedSubjectIds = new Set();
      
      for (let j = 0; j < numSubjects; j++) {
         let subject;
         do {
            subject = randomSubject();
         } while (usedSubjectIds.has(subject.id));
         usedSubjectIds.add(subject.id);
         subjectIds.push(subject.id);
      }
      
      assignments.push({
         classId: classEntity.id,
         sectionIds: selectedSections.map((s:any) => s.id),
         subjectIds: subjectIds
      });
   }
   
   return assignments;
}


export function generateTeacher(options = null) {
   const gender = options?.gender || fake.gender();
   const { firstName, lastName, fullName } = fake.fullName(gender, options?.lastName);

   const yearsOfExperience = options?.yearsOfExperience ?? fake.yearsOfExperience();
   const salary = options?.salary ?? fake.teacherSalary(yearsOfExperience);

   const hireDate = options?.hireDate || fake.teacherHireDate(yearsOfExperience);
   const bankAccount = options?.bankAccount || fake.bankAccount();

   const emergencyGender = fake.gender();
   const emergencyName = fake.fullName(emergencyGender);

   const specialization = options?.specialization || fake.teacherSpecialization();
   const employmentType = options?.employmentType || fake.teacherEmploymentType();
   const academicDegrees = options?.academicDegrees || fake.teacherAcademicDegree();
   const workloadHours = options?.workloadHours ?? fake.teacherWorkloadHours();

   const assignments = options?.assignments !== undefined 
      ? options.assignments 
      : generateRandomAssignments();

   return {
      id: options?.id || nanoid(5),
      cin: fake.cin(),
      name: fullName,
      email: fake.email(firstName, lastName),
      phone: fake.phone(),
      address: options?.sharedAddress || fake.address(),
      gender: gender,
      specialization: specialization,
      yearsOfExperience: yearsOfExperience,
      salary: salary,
      hireDate: hireDate,
      bankAccount: bankAccount,
      employmentType: employmentType,
      workloadHours: workloadHours,
      academicDegrees: academicDegrees,
      emergencyContact: emergencyName.fullName,
      emergencyPhone: fake.phone(),
      status: options?.status || 'active',
      assignments: assignments
   };
}

// School level per class. Teachers are shared by (level + subject) so one
// "Maths" teacher covers every class in their level, instead of a separate
// teacher per class — which previously produced ~one teacher per class×subject
// (~60) and an unrealistically large payroll.
const CLASS_LEVEL: Record<string, string> = {
   PS: 'primary', MS: 'primary', GS: 'primary', CP: 'primary', CE1: 'primary',
   CE2: 'primary', CM1: 'primary', CM2: 'primary', CE6: 'primary',
   '1AC': 'college', '2AC': 'college', '3AC': 'college',
   TC: 'lycee', '1BAC': 'lycee', '2BAC': 'lycee',
};
const getClassLevel = (className: string) => CLASS_LEVEL[className] ?? 'primary';

export function createAssignments(policy) {
   const assignmentsByTeacher = new Map();
   const allSubjectNames = getSubjectsNames();

   for (const a of policy.ASSIGNMENTS) {
      const classEntity = getClassByName(a.CLASS_NAME);
      const sections = getSectionsByClass(classEntity.id);
      const level = getClassLevel(a.CLASS_NAME);

      for (const subjectName of allSubjectNames) {
         const subject = getSubjectByName(subjectName);
         // One teacher per subject per level — shared across all classes in it.
         const key = `${level}-${subject.id}`;

         if (!assignmentsByTeacher.has(key)) {
            assignmentsByTeacher.set(key, {
               specialization: subject.name,
               assignments: []
            });
         }

         const teacherData = assignmentsByTeacher.get(key);

         let classAssignment = teacherData.assignments.find(
            x => x.classId === classEntity.id
         );

         if (!classAssignment) {
            classAssignment = {
               classId: classEntity.id,
               sectionIds: [],
               subjectIds: []
            };
            teacherData.assignments.push(classAssignment);
         }

         if (!classAssignment.subjectIds.includes(subject.id)) {
            classAssignment.subjectIds.push(subject.id);
         }

         for (const section of sections) {
            if (!classAssignment.sectionIds.includes(section.id)) {
               classAssignment.sectionIds.push(section.id);
            }
         }
      }
   }

   return Array.from(assignmentsByTeacher.values());
}

export function generateTeachers(policy) {
   const assignmentsData = createAssignments(policy);

   return assignmentsData.map(data =>
      generateTeacher({
         specialization: data.specialization,
         assignments: data.assignments
      })
   );
}

//=========================================================================//
// TRANSPORT ENTITIES
//=========================================================================//

export function pickDGender(PROBABILITY) {
   const r = Math.random();
   return r < PROBABILITY
      ? 'M'
      : 'F';
}

export function generateVehicle(options = null) {
   const baseVehicle = fake.selectRandomElement(vehiclesData);

   const driverId = options?.driverId !== undefined
      ? options.driverId
      : fake.randomDriver(options?.drivers);

   return {
      id: options?.id || nanoid(5),
      name: baseVehicle.name,
      brand: baseVehicle.brand,
      model: baseVehicle.model,
      year: baseVehicle.year,
      type: baseVehicle.type,
      capacity: baseVehicle.capacity,
      licensePlate: options?.licensePlate || baseVehicle.licensePlate,
      driverId,
      purchaseDate: baseVehicle.purchaseDate,
      purchasePrice: baseVehicle.purchasePrice,
      initialMileage: baseVehicle.initialMileage,
      currentMileage: baseVehicle.currentMileage,
      status: options?.status || baseVehicle.status,
      notes: options?.notes !== undefined ? options.notes : baseVehicle.notes
   };
}

export function generateDriver(options = null) {
   const { GENDER_PROBABILITY } = options?.POLICY ?? {};

   const gender = options?.gender ??
      (GENDER_PROBABILITY
         ? pickDGender(GENDER_PROBABILITY.MALE)
         : fake.gender());

   const { firstName, lastName, fullName } =
      fake.fullName(gender, options?.lastName);

   const yearsOfExperience =
      options?.yearsOfExperience ?? fake.randomInt(2, 30);

   return {
      id: options?.id || nanoid(5),
      name: fullName,
      email: fake.email(firstName, lastName),
      cin: fake.cin(),
      phone: fake.phone(),
      address: options?.sharedAddress || fake.address(),
      gender,
      licenseNumber: fake.driverLicenseNumber(),
      licenseType: fake.driverLicenseType(),
      licenseExpiry: options?.licenseExpiry || fake.futureDate(1, 5),
      hireDate: options?.hireDate || fake.pastDate(10),
      salary:
         options?.salary ??
         fake.driverSalary(yearsOfExperience),
      yearsOfExperience,
      emergencyContact: fake.fullName(fake.gender()).fullName,
      emergencyPhone: fake.phone(),
      status: options?.status || 'active',
      notes:
         options?.notes ??
         (Math.random() < 0.3 ? fake.randomSentence() : null),
   };
}

//=========================================================================//
// FAMILLY ENTITIES
//=========================================================================//

export function generateParent(options = null) {
   const gender = options?.gender || fake.gender();
   const { firstName, lastName, fullName } = fake.fullName(gender, options?.lastName);

   return {
      id: options?.id || nanoid(5),
      name: fullName,
      email: fake.email(firstName, lastName),
      phone: fake.phone(),
      gender,
      address: options?.address || fake.address(),
      dateOfBirth: fake.parentBirthdate(),
      cin: fake.cin(),
      occupation: fake.occupation(),
      nationality: fake.nationality(),
      maritalStatus: options?.maritalStatus || fake.maritalStatus(),
      relationshipType: options?.relationshipType || (gender === 'F' ? 'mother' : 'father'),
      isEmergencyContact: fake.boolean(),
      financialResponsibility: fake.financialResponsibility()
   };
}

export function generateParents(options = null) {
   const address = fake.address();
   const maritalStatus = options?.maritalStatus || fake.maritalStatus();

   if (maritalStatus === 'widowed' || maritalStatus === 'single') {
      const gender = options?.gender || (Math.random() < 0.7 ? 'F' : 'M');
      return [
         generateParent({
            ...options,
            gender,
            address,
            maritalStatus,
            relationshipType: options?.relationshipType || (gender === 'F' ? 'mother' : 'father')
         })
      ];
   }

   const father = generateParent({
      ...options,
      gender: 'M',
      address,
      maritalStatus,
      relationshipType: 'father'
   });

   const mother = generateParent({
      ...options,
      gender: 'F',
      address,
      maritalStatus,
      relationshipType: 'mother'
   });

   return [father, mother];
}

export function generateStudent(options = null) {
   const gender = options?.gender ?? fake.gender();
   const lastName = options?.lastName ?? fake.lastName();
   const firstName = options?.firstName ?? fake.firstName(gender);
   const newClass = options?.classId ?? fake.randomClass().id;
   let newSection = options?.sectionId;
   if (!newSection) {
      const classSections = sectionsData.filter(s => s.classId === newClass);
      if (classSections.length > 0) {
         newSection = fake.selectRandomElement(classSections).id;
      }
   }

   return {
      id: options?.id || nanoid(5),
      studentCode: options?.studentCode || fake.studentCode(),
      name: `${firstName} ${lastName}`,
      email: fake.email(firstName, lastName),
      phone: fake.phone(),
      address: options?.address || fake.address(),
      dateOfBirth: fake.studentBirthdate(),
      gender: gender,
      classId: newClass,
      sectionId: newSection,
      enrollmentDate: options?.enrollmentDate || fake.enrollmentDate(
         // Cap at the fee's academic-year end so the fee's enrollment check passes.
         `${Number((classesData[0]?.academicYear || '2025-2026').split('-')[0]) + 1}-06-30`,
      ),
      graduationDate: null,
      medicalConditions: fake.medicalConditions(),
      previousSchool: fake.previousSchool(),
      status: 'active',
      ...(options?.parentIds && { parentIds: options.parentIds }),
   };
}

export function generateFamilyUnit() {
   const parents = generateParents();
   return {
      parents,
      lastName: parents[0].name.split(' ').pop() || 'Doe',
      address: parents[0].address,
      parentIds: parents.map(p => p.id),
      childCount: getNumberOfChildren()
   };
}

//=========================================================================//
// FINANCIAL ENTITIES
//=========================================================================//
export const TUITION_FEE_TYPE = feeTypeData.find(f => f.name.includes('Tuition'));
export const TRANSPORT_FEE_TYPE = feeTypeData.find(f => f.name.includes('Transport'));
export const CAFETERIA_FEE_TYPE = feeTypeData.find(f => f.name.includes('Cafeteria'));
export const REGISTRATION_FEE_TYPE = feeTypeData.find(f => f.name.includes('Registration'));
export const UNIFORM_FEE_TYPE = feeTypeData.find(f => f.name.includes('Uniform'));
export const BOOKS_FEE_TYPE = feeTypeData.find(f => f.name.includes('Books'));
export const SPORTS_FEE_TYPE = feeTypeData.find(f => f.name.includes('Sports'));
export const TECHNOLOGY_FEE_TYPE = feeTypeData.find(f => f.name.includes('Technology'));
export const FIELD_TRIP_FEE_TYPE = feeTypeData.find(f => f.name.includes('Field'));

export const INITIAL_FEE_TYPES = [
   TUITION_FEE_TYPE,
   REGISTRATION_FEE_TYPE,
];

export const OPTIONAL_FEE_TYPES = [
   TRANSPORT_FEE_TYPE,
   CAFETERIA_FEE_TYPE,
   UNIFORM_FEE_TYPE,
   BOOKS_FEE_TYPE,
   SPORTS_FEE_TYPE,
   TECHNOLOGY_FEE_TYPE,
   FIELD_TRIP_FEE_TYPE,
];

function generateRef(prefix: string): string {
   const now = new Date();
   const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
   const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
   return `${prefix}-${datePart}-${rand}`;
}

export const generateReceiptNumber = () => generateRef('RCP');
export const generateTransactionRef = () => generateRef('TXN');
export const generateInvoiceNumber = () => generateRef('INV');
export const generatePaymentRef = () => generateRef('PAY');
export const generateAllocationRef = () => generateRef('ALLOC');
export const generateCheckNumber = () => `CHK-${Math.random().toString().substring(2, 8)}`;

export function generateDiscountMeta() {
   return pickRandom(DISCOUNT_CATALOG);
}

/**
 * Returns a realistic fee status based on a mid-year school scenario:
 * 60% paid, 15% pending, 15% overdue, 10% partial
 */
export function generateFeeStatus(): string {
   const r = Math.random();
   if (r < 0.60) return 'paid';
   if (r < 0.75) return 'pending';
   if (r < 0.90) return 'overdue';
   return 'partial';
}

export function resolveSchedule(feeType, policy) {
   if (feeType.paymentType === 'oneTime') {
      return 'oneTime';
   }

   return Math.random() < policy.SCHEDULE.MONTHLY_PROBABILITY
      ? 'monthly'
      : pickRandom(
         SCHEDULES.filter(s => s !== 'oneTime')
      );
}

export function generateFee(options) {
   const feeType = options.feeType || fake.randomFeeType();
   // Cap discount at 50% of the fee's base amount so netAmount stays positive
   // and installments never round to 0 (which would make payment seeding fail
   // with "Allocation amount must be greater than 0").
   const baseAmount = Number(feeType?.amount ?? 0);
   const rawDiscount = options.discountAmount ?? fake.discount();
   const maxDiscount = Math.max(0, Math.floor(baseAmount * 0.5));
   const discountAmount = Math.min(rawDiscount, maxDiscount);
   const academicYear = options.academicYear || classesData[0]?.academicYear || '2025-2026';
   const hasDiscount = discountAmount > 0;
   const discountMeta = hasDiscount ? generateDiscountMeta() : null;

   // Default effectiveDate to September 1st of the academic year start
   // so installments begin from the start of the school year, not the seed date.
   const effectiveDate = options.effectiveDate || `${academicYear.split('-')[0]}-09-01`;

   return {
      id: options.id || nanoid(5),
      studentId: options.studentId,
      feeTypeId: feeType.id,
      academicYear,
      effectiveDate,
      schedule: options.schedule,
      discountAmount,

      discountReason: hasDiscount
         ? options.discountReason || discountMeta.reason
         : null,

      status: options.status || generateFeeStatus(),
      assignedBy: options.assignedBy || null,
      notes: options.notes || (hasDiscount ? discountMeta.note : null),
   };
}

const DEFAULT_FEES_POLICY = {
   SCHEDULE: { MONTHLY_PROBABILITY: 0.8 },
   FEES: {
      TRANSPORT: 0.4,
      CAFETERIA: 0.5,
      UNIFORM: 0.7,
      BOOKS: 0.8,
      SPORTS: 0.6,
      TECHNOLOGY: 0.5,
      FIELD_TRIP: 0.5,
   },
};

export function generateFees({ studentId, policy } = { studentId: undefined, policy: DEFAULT_FEES_POLICY }) {
   policy = policy ?? DEFAULT_FEES_POLICY;
   const fees = [];

   function createFee(feeType) {
      return generateFee({
         studentId,
         feeType,
         schedule: resolveSchedule(feeType, policy),
      });
   }

   for (const feeType of INITIAL_FEE_TYPES) {
      fees.push(createFee(feeType));
   }

   if (chance(policy.FEES.TRANSPORT)) fees.push(createFee(TRANSPORT_FEE_TYPE));
   if (chance(policy.FEES.CAFETERIA)) fees.push(createFee(CAFETERIA_FEE_TYPE));
   if (chance(policy.FEES.UNIFORM)) fees.push(createFee(UNIFORM_FEE_TYPE));
   if (chance(policy.FEES.BOOKS)) fees.push(createFee(BOOKS_FEE_TYPE));
   if (chance(policy.FEES.SPORTS)) fees.push(createFee(SPORTS_FEE_TYPE));
   if (chance(policy.FEES.TECHNOLOGY)) fees.push(createFee(TECHNOLOGY_FEE_TYPE));
   if (chance(policy.FEES.FIELD_TRIP)) fees.push(createFee(FIELD_TRIP_FEE_TYPE));

   return fees;
}

export function generateExpense(options = null) {
   const category = options?.category || fake.expenseCategory();
   const status = options?.status || fake.expenseStatus();
   const paymentMethod = options?.paymentMethod || fake.paymentMethod();
   const eDate = options?.expenseDate || fake.expenseDate(options?.month, options?.year);

   return {
      id: options?.id || nanoid(5),
      category: category,
      title: options?.title || fake.expenseTitle(category),
      amount: options?.amount ?? fake.expenseAmount(category),
      expenseDate: eDate,
      paymentMethod: paymentMethod,
      paymentDate: options?.paymentDate || fake.paymentDate(status, eDate),
      invoiceNumber: options?.invoiceNumber || fake.invoiceNumber(),
      receiptNumber: options?.receiptNumber ?? fake.receiptNumber(),
      checkNumber: options?.checkNumber ?? (paymentMethod === 'check' ? fake.checkNumber() : null),
      status,
      rejectionReason: status === 'rejected' ? (options?.rejectionReason || fake.rejectionReason()) : null,
      notes: options?.notes || fake.expenseNotes(category),
   };
}

/**
 * Generate realistic monthly school expenses from Sep 2025 to current month.
 * Each month gets a core set of recurring expenses (rent, salaries, utilities)
 * plus some variable ones (maintenance, supplies, etc.).
 */
export function generateExpenses(count = 30, options: any = {}) {
   const now = new Date();
   const startYear = 2025;
   const startMonth = 8; // September (0-indexed)
   const endYear = now.getFullYear();
   const endMonth = now.getMonth();

   // Build list of months in the academic year up to now
   const months: { month: number; year: number }[] = [];
   let y = startYear, m = startMonth;
   while (y < endYear || (y === endYear && m <= endMonth)) {
      months.push({ month: m, year: y });
      m++;
      if (m > 11) { m = 0; y++; }
   }

   if (months.length === 0) return [];

   // Recurring monthly expenses every school generates
   const RECURRING_CATEGORIES = ['rent', 'utilities', 'cleaning', 'security', 'transport'];
   // Variable expenses that appear some months
   const VARIABLE_CATEGORIES = ['maintenance', 'supplies', 'equipment', 'food', 'marketing', 'training', 'technology', 'insurance', 'tax', 'miscellaneous'];

   const expenses: any[] = [];

   for (const { month, year } of months) {
      const isSummerBreakMonth = month === 6 || month === 7;
      if (isSummerBreakMonth) {
         const expenseDate = `${year}-${String(month + 1).padStart(2, '0')}-02`;
         expenses.push(generateExpense({
            ...options,
            category: 'supplies',
            title: 'Summer office supplies',
            amount: 1200 + Math.floor(Math.random() * 1800),
            month,
            year,
            expenseDate,
            paymentDate: expenseDate,
            status: 'paid',
            notes: 'Light summer-break operating expense.',
         }));
         continue;
      }

      // Recurring: one expense per category per month
      for (const cat of RECURRING_CATEGORIES) {
         expenses.push(generateExpense({ ...options, category: cat, month, year, status: 'paid' }));
      }

      // Variable: 2-5 random extras per month
      const extraCount = fake.randomInt(2, 5);
      for (let i = 0; i < extraCount; i++) {
         const cat = pickRandom(VARIABLE_CATEGORIES);
         // Past months are mostly paid; current month has some pending
         const isPastMonth = year < endYear || (year === endYear && month < endMonth);
         const status = isPastMonth
            ? (Math.random() < 0.85 ? 'paid' : 'approved')
            : fake.expenseStatus();
         expenses.push(generateExpense({ ...options, category: cat, month, year, status }));
      }
   }

   // If a specific count was requested and it's less, trim; if more, we return all
   if (count && expenses.length > count) {
      return fake.shuffle(expenses).slice(0, count);
   }

   return expenses;
}
