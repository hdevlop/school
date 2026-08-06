import { z } from 'zod';
import { alertPriorityEnum, alertStatusEnum, alertTypeEnum, assessmentStatusEnum, assessmentTypeEnum, attendanceStatusEnum, calendarSystemEnum, disciplineActionEnum, disciplineCategoryEnum, disciplineSeverityEnum, driverStatusEnum, employmentTypeEnum, eventStatusEnum, eventTypeEnum, eventVisibilityEnum, examStatusEnum, examTypeEnum, expenseCategoryEnum, expenseStatusEnum, feeTypeStatusEnum, fuelTypeEnum, genderEnum, gradeStatusEnum, languageEnum, maritalStatusEnum, participantTypeEnum, paymentMethodEnum, feeInstallmentStatusEnum, paymentTypeEnum, refuelStatusEnum, relationshipTypeEnum, scheduleEnum, sectionStatusEnum, studentStatusEnum, teacherStatusEnum, userStatusEnum, vehicleStatusEnum, vehicleTypeEnum } from './ZodEnum';

const requiredId = z.preprocess((val) => val ?? "", z.string().min(1, "ID is required"));
const optionalId = z.preprocess(
  (val) => val === "" ? undefined : val,
  z.string().min(1, "ID cannot be empty").nullish().optional()
);
const emailField = z.string().email('Invalid email format').or(z.literal(""));
const phoneField = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number');
const nameField = z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long');
const dateField = z.string().regex(/^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/, 'Date must be in YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YY, or DD-MM-YYYY format');
const optionalDateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').nullable().optional();
const timePattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/;
const timeField = z.union([
  z.literal('').transform(() => undefined),
  z.string()
    .regex(timePattern, 'Time must be in HH:MM format')
    .transform((val) => {
      const match = val.trim().match(timePattern);
      return match ? `${match[1].padStart(2, '0')}:${match[2]}` : val;
    }),
]).optional().nullable();
const cinField = z.string().min(8, 'CIN must be at least 8 characters').max(20, 'CIN too long');
const addressField = z.string().max(500, 'Address too long').optional();
const academicYearField = z.string().min(9, 'Academic year is required').regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format');


const num = () => {
  const createChainable = (currentSchema: z.ZodTypeAny): any => {
    const methods = {
      positive: (msg = 'Must be positive') =>
        createChainable(currentSchema.refine((val: number) => val > 0, { message: msg })),

      min: (value: number, msg?: string) =>
        createChainable(currentSchema.refine(
          (val: number) => val >= value,
          { message: msg || `Must be at least ${value}` }
        )),

      max: (value: number, msg?: string) =>
        createChainable(currentSchema.refine(
          (val: number) => val <= value,
          { message: msg || `Cannot exceed ${value}` }
        )),

      int: (msg = 'Must be an integer') =>
        createChainable(currentSchema.refine(
          (val: number) => Number.isInteger(val),
          { message: msg }
        ))
    };

    return Object.assign(currentSchema, methods);
  };

  const isValidNumber = (val: any) => {
    if (val === null || val === undefined || Number.isNaN(val)) return false;
    if (typeof val === 'number') return true;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed !== '' && !isNaN(Number(trimmed));
    }
    return false;
  };

  const baseSchema = z.any()
    .refine(isValidNumber, { message: 'Must be a valid number' })
    .transform((val) => typeof val === 'string' ? Number(val) : val);

  return createChainable(baseSchema);
};
//=====================================================================//
// USER-ROLE VALIDATION SCHEMA
//=====================================================================//

export const userSchema = z.object({
  id: optionalId,
  username: nameField.max(50).optional(),
  email: emailField,
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleId: optionalId,
  roleName: nameField.max(50).optional(),
  lastLogin: optionalDateField,
  image: z.union([z.string(), z.instanceof(File), z.undefined()]).optional(),
  emailVerified: z.boolean().default(false),
  status: userStatusEnum,
  createdAt: optionalDateField,
});

export const roleSchema = z.object({
  id: optionalId,
  name: nameField.max(50),
  description: z.string().max(255, "Description too long").optional(),
  createdAt: optionalDateField,
});

//=====================================================================//
// PEOPLE VALIDATION SCHEMAS
//=====================================================================//

export const studentSchema = z.object({
  id: optionalId,
  classId: requiredId,
  sectionId: requiredId,
  studentCode: z.string(),
  name: nameField,
  email: emailField,
  phone: phoneField.nullish(),
  address: addressField,
  addressPlaceId: z.string().max(255).optional().nullable(),
  addressLatitude: z.number().min(-90).max(90).optional().nullable(),
  addressLongitude: z.number().min(-180).max(180).optional().nullable(),
  dateOfBirth: optionalDateField,
  gender: genderEnum,
  enrollmentDate: dateField,
  medicalConditions: z.string().max(1000, 'Medical conditions description too long').nullish().optional(),
  previousSchool: z.string().max(500, 'Previous school name too long').optional().nullable(),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  status: studentStatusEnum.default('active'),
});

export const parentSchema = z.object({
  id: optionalId,
  name: nameField,
  email: emailField.optional(),
  phone: phoneField,
  gender: genderEnum.optional(),
  address: addressField,
  dateOfBirth: optionalDateField,
  cin: cinField,
  occupation: z.string().max(100, 'Occupation too long').optional(),
  nationality: z.string().max(100, 'Nationality too long').optional(),
  maritalStatus: maritalStatusEnum.optional(),
  relationshipType: relationshipTypeEnum,
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  isEmergencyContact: z.boolean().optional().default(false),
  financialResponsibility: z.boolean().optional().default(false),
});

export const driverSchema = z.object({
  id: optionalId,
  name: nameField,
  email: emailField,
  cin: cinField,
  phone: phoneField,
  address: addressField,
  gender: genderEnum.optional(),
  licenseNumber: z.string().min(5, 'License number must be at least 5 characters').max(20, 'License number too long'),
  licenseType: z.string().max(10, 'License type too long'),
  licenseExpiry: dateField,
  hireDate: dateField,
  salary: num().positive('Salary must be positive').optional(),
  yearsOfExperience: num().int().min(0, 'Years of experience must be non-negative').optional(),
  emergencyContact: nameField.optional(),
  emergencyPhone: phoneField.optional(),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  status: driverStatusEnum.default('active'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export const teacherPersonalSchema = z.object({
  id: optionalId,
  name: nameField,
  cin: cinField,
  email: emailField,
  phone: phoneField,
  address: addressField,
  gender: genderEnum.optional(),
  emergencyContact: nameField.optional(),
  emergencyPhone: phoneField,
  status: teacherStatusEnum.default('active'),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
});

export const teacherProfessionalSchema = z.object({
  specialization: z.string().max(100, 'Specialization too long').optional(),
  yearsOfExperience: num().int().min(0, 'Years of experience must be non-negative').optional(),
  salary: num().positive('Salary must be positive').optional(),
  hireDate: dateField,
bankAccount: z.coerce
  .string()
  .max(100, { message: 'Bank account too long' })
  .optional(),
  employmentType: employmentTypeEnum.optional(),
    workloadHours: num().int().min(0, 'Workload hours must be non-negative').max(60, 'Workload hours cannot exceed 60').optional(),
    academicDegrees: z.string().max(500, 'Academic degrees description too long').optional(),
});

export const assignmentSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  sectionIds: z.array(z.string()).min(1, 'At least one section is required'),
  subjectIds: z.array(z.string()).min(1, 'At least one subject is required'),
  academicYear: z.string().optional()
});

export const assignmentsSchema = z.object({
  assignments: z.array(assignmentSchema).min(1, 'At least one parent is required')
})

export const teacherFullSchema = z.object({
  ...teacherPersonalSchema.shape,
  ...teacherProfessionalSchema.shape,
  ...assignmentsSchema.shape,
});

//=====================================================================//
// FEES VALIDATION SCHEMAS
//=====================================================================//

export const feeTypeSchema = z.object({
  id: optionalId,
  name: z.string().min(2, 'Fee type name must be at least 2 characters').max(100, 'Fee type name too long'),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  category: z.string(),
  amount: num().positive('Amount must be greater than 0').max(1_000_00, 'Amount too large'),
  paymentType: paymentTypeEnum.default('recurring'),
  status: feeTypeStatusEnum.default('active').optional(),
});

export const feeSchema = z.object({
  id: optionalId,
  studentId: requiredId,
  feeTypeId: requiredId,
  academicYear: academicYearField.optional(),
  effectiveDate: optionalDateField,
  schedule: scheduleEnum,
  baseAmount: num().positive('Base amount must be positive').optional(),
  discountAmount: num().min(0, 'Discount cannot be negative').optional(),
  discountReason: z.string().max(500, 'Discount reason too long').optional().nullable(),
  assignedBy: optionalId.nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
})

export const bulkFeeItemSchema = feeSchema.omit({ studentId: true })

export const bulkFeeFormSchema = z.object({
  studentId: requiredId,
  fees: z.array(bulkFeeItemSchema).min(1, 'At least one fee is required')
});

export const classBulkFeeFormSchema = z.object({
  classId: requiredId,
  sectionId: optionalId,
  feeTypeId: requiredId,
  schedule: scheduleEnum,
  academicYear: academicYearField.optional(),
  baseAmount: num().positive('Base amount must be positive').optional(),
  discountAmount: num().min(0, 'Discount cannot be negative').optional(),
  discountReason: z.string().max(500, 'Discount reason too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export const feeInstallmentSchema = z.object({
  feeId: optionalId,
  number: num().int().min(1, 'Installment must be at least 1'),
  dueDate: dateField,
  amount: num().positive('Amount must be greater than 0').max(1_000_00, 'Amount too large'),
  paidAmount: num().min(0, 'Paid amount cannot be negative').max(1_000_00, 'Amount too large').optional(),
  status: feeInstallmentStatusEnum.optional(),
});

export const feePaymentSchema = z.object({
  studentId: optionalId,
  amount: num().positive('Amount must be greater than 0').max(1_000_000, 'Amount too large').optional(),
  paymentMethod: paymentMethodEnum,
  paymentDate: dateField,
  checkNumber: z.preprocess((val) => val === "" ? null : val, z.string().max(50, 'Check number too long').optional().nullable()),
  checkDueDate: z.preprocess((val) => val === "" ? null : val, optionalDateField.nullable()),
  transactionRef: z.preprocess((val) => val === "" ? null : val, z.string().max(100, 'Transaction reference too long').optional().nullable()),
  receiptNumber: z.preprocess((val) => val === "" ? null : val, z.string().max(50, 'Receipt number too long').optional().nullable()),
  processedBy: optionalId,
  notes: z.preprocess((val) => val === "" ? null : val, z.string().max(1000, 'Notes too long').optional().nullable()),
  allocations: z.array(z.object({
    feeId: optionalId,
    number: z.number().int().positive('Installment must be a positive number'),
    amount: num().positive('Amount must be greater than 0')
  })).optional().nullable(),
})

export const paymentAllocationSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  feeId: z.string().min(1, 'Fee ID is required'),
  installmentId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['fee', 'installment']).default('installment'),
  notes: z.string().optional(),
});

export const parentsSchema = z.object({
  parents: z.array(parentSchema).optional().default([])
})

export const feesSchema = z.object({
  fees: z.array(bulkFeeItemSchema).min(1, 'At least one fee is required')
})

const transportAssignmentSchema = z.object({
  vehicleId: z.string().optional().default(''),
  assignmentDate: optionalDateField,
  pickupLocation: z.string().max(500).optional().default(''),
  pickupPlaceId: z.string().max(255).optional().nullable(),
  pickupLatitude: z.number().min(-90).max(90).optional().nullable(),
  pickupLongitude: z.number().min(-180).max(180).optional().nullable(),
  dropoffLocation: z.string().max(500).optional().nullable(),
  dropoffPlaceId: z.string().max(255).optional().nullable(),
  dropoffLatitude: z.number().min(-90).max(90).optional().nullable(),
  dropoffLongitude: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

export const transportSchema = z.object({
  transportEnabled: z.boolean().optional().default(false),
  transportAssignment: transportAssignmentSchema.optional().nullable(),
}).superRefine((value, ctx) => {
  if (!value.transportEnabled) return
  if (!value.transportAssignment?.vehicleId) {
    ctx.addIssue({ code: 'custom', path: ['transportAssignment', 'vehicleId'], message: 'Vehicle is required' })
  }
  if (!value.transportAssignment?.pickupLocation) {
    ctx.addIssue({ code: 'custom', path: ['transportAssignment', 'pickupLocation'], message: 'Pickup location is required' })
  }
})

export const fullStudentSchema = z.object({
  ...studentSchema.shape,
  ...parentsSchema.shape,
  ...feesSchema.shape,
  transportEnabled: z.boolean().optional().default(false),
  transportAssignment: transportAssignmentSchema.optional().nullable(),
});

//=====================================================================//
// SCHOOL STRUCTURE VALIDATION SCHEMAS
//=====================================================================//

export const subjectSchema = z.object({
  id: optionalId,
  code: z.string().min(2, 'Subject code must be at least 2 characters').max(10, 'Subject code too long'),
  name: z.string().min(2, 'Subject name must be at least 2 characters').max(100, 'Subject name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  gradeLevel: num().int().min(1).max(12).optional(),
});

export const sectionSchema = z.object({
  id: optionalId,
  classId: requiredId,
  name: z.string().min(1, 'Section name is required').max(10, 'Section name too long'),
  maxStudents: num().int().min(1, 'Max students must be at least 1').max(100, 'Max students cannot exceed 100').default(30),
  roomNumber: num().max(10000, 'Room number too long').optional(),
  status: sectionStatusEnum.default('active'),
});

export const classSchema = z.object({
  id: optionalId,
  name: z.string().min(1, 'Class name is required').max(50, 'Class name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  academicYear: academicYearField,
  level: z.string().min(1, 'Class level is required'),
});

export const attendanceSchema = z.object({
  studentId: requiredId,
  teacherId: requiredId,
  subjectId: requiredId,
  sectionId: requiredId,
  date: dateField,
  status: attendanceStatusEnum.default('present'),
  notes: z.string().max(500, 'Notes too long').optional(),
})

export const assessmentSchema = z.object({
  classId: requiredId,
  sectionId: optionalId,
  sectionIds: z.array(requiredId).min(1, 'Select at least one section'),
  subjectId: requiredId,
  teacherId: requiredId,
  teacherAssignmentId: optionalId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  type: assessmentTypeEnum.default('quiz'),
  date: dateField,
  duration: num().int().min(1, 'Duration must be at least 1 minute').max(480, 'Duration cannot exceed 8 hours'),
  totalMarks: num().positive('Total marks must be greater than 0').max(1000, 'Total marks cannot exceed 1000').default(20),
  passingMarks: num().min(0, 'Passing marks must be non-negative').max(1000, 'Passing marks cannot exceed 1000').default(10),
  instructions: z.string().max(2000, 'Instructions too long').optional().nullable(),
  status: assessmentStatusEnum.default('scheduled'),
  assessmentId: optionalId,
})

export const bulkAssessmentSchema = z.object({
  assessments: z.array(assessmentSchema)
    .min(1, 'At least one assessment is required')
    .max(50, 'Cannot create more than 50 assessments at once'),
})

export const gradeSchema = z.object({
  assessmentId: optionalId,
  examId: optionalId,
  teacherId: requiredId,
  subjectId: requiredId,
  sectionId: requiredId,
  studentId: requiredId,
  classId: optionalId,
  gradeId: optionalId,
  assessmentTitle: z.string().min(3, 'Assessment title must be at least 3 characters').max(200, 'Assessment title too long').optional(),
  marksObtained: num().min(0, 'Marks obtained must be non-negative').max(1000, 'Marks obtained cannot exceed 1000'),
  feedback: z.string().max(1000, 'Feedback too long').optional().nullable(),
  status: gradeStatusEnum.default('graded'),
}).refine((data) => Boolean(data.assessmentId) !== Boolean(data.examId), {
  message: 'Select either an assessment or an exam',
  path: ['assessmentId'],
})

export const examSchema = z.object({
  classId: optionalId,
  sectionId: optionalId,
  sectionIds: z.array(requiredId).min(1, 'Select at least one section'),
  subjectId: requiredId,
  teacherId: requiredId,
  examId: optionalId,
  teacherAssignmentId: optionalId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  type: examTypeEnum.default('midterm'),
  date: dateField,
  startTime: timeField,
  endTime: timeField,
  duration: num().int().min(30, 'Exam duration must be at least 30 minutes').max(480, 'Duration cannot exceed 8 hours'),
  totalMarks: num().positive('Total marks must be greater than 0').max(1000, 'Total marks cannot exceed 1000'),
  passingMarks: num().min(0, 'Passing marks must be non-negative').max(1000, 'Passing marks cannot exceed 1000'),
  roomNumber: num().max(50, 'Room number too long').optional().nullable(),
  instructions: z.string().max(2000, 'Instructions too long').optional().nullable(),
  status: examStatusEnum.default('scheduled'),
})

//=====================================================================//
// ANNOUNCEMENT VALIDATION SCHEMA
//=====================================================================//

export const announcementSchema = z.object({
  id: optionalId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content too long'),
  authorId: optionalId,
  targetAudience: z.enum(['all', 'students', 'teachers', 'parents', 'class']),
  classId: optionalId,
  classIds: z.array(requiredId).min(1, 'Select at least one class').optional(),
  publishDate: dateField.optional(),
  expiryDate: dateField.optional(),
})

//=====================================================================//
// DISCIPLINE VALIDATION SCHEMAS
//=====================================================================//

export const disciplineSchema = z.object({
  id: optionalId,
  studentId: requiredId,
  incidentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Incident date is required'),
  incidentTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Incident time is required'),
  category: disciplineCategoryEnum,
  severity: disciplineSeverityEnum.default('medium'),
  location: z.string().max(150, 'Location is too long').optional().nullable(),
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description is too long'),
});

export const resolveDisciplineSchema = z.object({
  actionType: disciplineActionEnum,
  actionNote: z.string().max(1000, 'Action note is too long').optional().nullable(),
  resolutionNote: z.string().trim().min(1, 'Resolution note is required').max(2000, 'Resolution note is too long'),
});

//=====================================================================//
// ALERT VALIDATION SCHEMA
//=====================================================================//

export const alertSchema = z.object({
  type: alertTypeEnum,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message too long'),
  priority: alertPriorityEnum.default('medium'),
  status: alertStatusEnum.default('active'),
  studentId: optionalId,
  teacherId: optionalId,
  classId: optionalId,
  subjectId: optionalId,
  targetAudience: z.enum(['all', 'students', 'teachers', 'parents']).optional(),
  authorId: optionalId,
  isRead: z.boolean().default(false),
});

export const behaviorRewardSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  behaviorDate: z.string().min(1, 'Behavior date is required'),
  behaviorTime: z.string().min(1, 'Behavior time is required'),
  category: z.enum([
    'academic_effort', 'improvement', 'respect', 'helpfulness', 'leadership',
    'teamwork', 'responsibility', 'community_service', 'excellent_attendance', 'other',
  ]),
  recognitionLevel: z.enum(['appreciation', 'achievement', 'excellence']),
  description: z.string().trim().min(1, 'Description is required').max(2000, 'Description is too long'),
  rewardType: z.enum([
    'verbal_praise', 'written_praise', 'merit', 'badge',
    'certificate', 'privilege', 'prize', 'other',
  ]),
  points: z.coerce.number().int('Points must be an integer').min(0).max(100),
  rewardNote: z.string().trim().max(1000, 'Reward note is too long').optional().nullable(),
});

//=====================================================================//
// EVENTS VALIDATION SCHEMAS
//=====================================================================//

export const eventSchema = z.object({
  id: optionalId,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional().nullable(),
  type: eventTypeEnum,
  startDate: dateField,
  endDate: dateField,
  startTime: timeField,
  endTime: timeField,
  location: z.string().max(200, 'Location too long').optional().nullable(),
  venue: z.string().max(200, 'Venue too long').optional().nullable(),
  organizerId: optionalId,
  classId: optionalId.nullable(),
  classIds: z.array(z.string().min(1)).min(1, 'Select at least one class'),
  sectionId: optionalId.nullable(),
  visibility: eventVisibilityEnum.default('public'),
  status: eventStatusEnum.default('scheduled'),
  capacity: num().int().positive('Capacity must be positive').optional().nullable(),
  registrationRequired: z.boolean().default(false),
  registrationDeadline: optionalDateField.nullable(),
  attachments: z.any().optional().nullable(),
  notes: z.string().max(2000, 'Notes too long').optional().nullable(),
});

export const eventParticipantSchema = z.object({
  eventId: optionalId,
  participantId: optionalId,
  participantType: participantTypeEnum,
  attendanceStatus: attendanceStatusEnum.optional().nullable(),
  notes: z.string().max(500, 'Notes too long').optional().nullable(),
});

//=====================================================================//
// EXPENSES VALIDATION SCHEMAS
//=====================================================================//

export const expenseSchema = z.object({
  id: optionalId,
  category: expenseCategoryEnum,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  amount: num().positive('Amount must be greater than 0').max(10000000, 'Amount too large'),
  expenseDate: dateField,
  paymentMethod: paymentMethodEnum.optional().nullable(),
  paymentDate: optionalDateField.nullable(),
  vendor: z.string().max(200, 'Vendor name too long').optional().nullable(),
  invoiceNumber: z.string().max(100, 'Invoice number too long').optional().nullable(),
  receiptNumber: z.string().max(100, 'Receipt number too long').optional().nullable(),
  checkNumber: z.string().max(50, 'Check number too long').optional().nullable(),
  transactionRef: z.string().max(100, 'Transaction reference too long').optional().nullable(),
  status: expenseStatusEnum.default('pending'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export const expenseApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(1000, 'Rejection reason too long').optional().nullable(),
})

export const expensePaymentSchema = z.object({
  paymentMethod: paymentMethodEnum,
  paymentDate: dateField,
  checkNumber: z.string().max(50, 'Check number too long').optional().nullable(),
  transactionRef: z.string().max(100, 'Transaction reference too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
})

//=====================================================================//
// TRANSPORT VALIDATION SCHEMAS
//=====================================================================//

export const vehicleSchema = z.object({
  id: optionalId,
  name: z.string().min(2, 'Vehicle name must be at least 2 characters').max(100, 'Vehicle name too long'),
  brand: z.string().min(2, 'Brand must be at least 2 characters').max(100, 'Brand too long'),
  model: z.string().min(2, 'Model must be at least 2 characters').max(100, 'Model too long'),
  year: num().int().min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in future'),
  type: vehicleTypeEnum.default('fullbus'),
  capacity: num().int().min(1, 'Capacity must be at least 1').max(200, 'Capacity cannot exceed 200'),
  licensePlate: z.string().min(2, 'License plate must be at least 2 characters').max(50, 'License plate too long'),
  driverId: optionalId.nullable(),
  image: z.string().max(500, 'Image path too long').optional().nullable().default('novehicle.png'),
  purchaseDate: optionalDateField.nullable(),
  purchasePrice: num().min(0, 'Purchase price must be non-negative').max(10000000, 'Purchase price too large').optional().nullable(),
  initialMileage: num().min(0, 'Initial mileage must be non-negative').max(10000000, 'Initial mileage too large').optional().nullable(),
  currentMileage: num().min(0, 'Current mileage must be non-negative').max(10000000, 'Current mileage too large').optional().nullable(),
  status: vehicleStatusEnum.default('active'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export const refuelSchema = z.object({
  id: optionalId,
  busId: optionalId,
  refuelDate: dateField,
  quantity: num().positive('Quantity must be greater than 0').max(10000, 'Quantity too large'),
  unitPrice: num().positive('Unit price must be greater than 0').max(100000, 'Unit price too large'),
  totalCost: num().positive('Total cost must be greater than 0').max(10000000, 'Total cost too large').optional(),
  fuelType: fuelTypeEnum.default('diesel'),
  odometer: num().min(0, 'Odometer must be non-negative').max(10000000, 'Odometer value too large').optional().nullable(),
  fuelStation: z.string().max(200, 'Fuel station name too long').optional().nullable(),
  invoiceNumber: z.string().max(100, 'Invoice number too long').optional().nullable(),
  paymentMethod: paymentMethodEnum.optional().nullable(),
  paidBy: optionalId.nullable(),
  status: refuelStatusEnum.default('completed'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

//=====================================================================//
// SETTINGS VALIDATION SCHEMA
//=====================================================================//

export const settingsSchema = z.object({
  // School Information
  schoolName: z.string().min(2, 'School name must be at least 2 characters').max(200, 'School name too long'),
  schoolAddress: z.string().max(500, 'School address too long').optional(),
  schoolAddressPlaceId: z.string().max(255).optional().nullable(),
  schoolAddressLatitude: z.number().min(-90).max(90).optional().nullable(),
  schoolAddressLongitude: z.number().min(-180).max(180).optional().nullable(),
  schoolPhone: phoneField,
  schoolEmail: emailField,
  schoolWebsite: z.string().url('Must be a valid URL').max(255, 'School website URL too long').optional(), // New
  schoolLogo: z.string().url('Must be a valid image URL').max(255, 'School logo URL too long').optional(), // New
  currentAcademicYear: academicYearField,

  // Academic Settings
  gradingScale: z.any().optional(),
  attendanceRequirement: num().min(0, 'Attendance requirement must be non-negative').max(100, 'Attendance requirement cannot exceed 100').default(75.00),
  attendanceMode: z.enum(['daily', 'per_class']).default('daily'),
  maxClassSize: num().int('Max class size must be an integer').min(1, 'Max class size must be at least 1').max(200, 'Max class size cannot exceed 200').default(34),
  minimumPassingGrade: num().min(0, 'Minimum passing grade must be non-negative').max(100, 'Minimum passing grade cannot exceed 100').default(60.00),
  defaultExamDuration: num().int('Default exam duration must be in minutes').min(15, 'Exam duration must be at least 15 minutes').max(480, 'Exam duration cannot exceed 480 minutes').default(120),
  calendarSystem: calendarSystemEnum.default('SEMESTER'),
  startMonth: z.string().default('september'),
  endMonth: z.string().default('june'),

  // Notification Settings
  academicAlerts: z.boolean().default(true),
  attendanceAlerts: z.boolean().default(true),
  eventAlerts: z.boolean().default(true),
  homeworkAlerts: z.boolean().default(true),
  feesReminder: z.boolean().default(true),
  feesOverdueAlerts: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  parentNotifications: z.boolean().default(true),
  lowGradeAlerts: z.boolean().default(true),
  allowLateSubmission: z.boolean().default(true),
  examResultsAlerts: z.boolean().default(true),
  disciplinaryAlerts: z.boolean().default(true),
  achievementAlerts: z.boolean().default(true),
  maintenanceNotifications: z.boolean().default(true),

  // Security Settings
  twoFactorEnabled: z.boolean().default(false),
  sessionTimeout: z.string().regex(/^\d{1,4}$/, 'Session timeout must be a number between 1-9999 minutes').default('60'),
  passwordRequireSymbols: z.boolean().default(true),
  loginNotifications: z.boolean().default(true),
  parentAccessEnabled: z.boolean().default(true),
  teacherAccessEnabled: z.boolean().default(true),
  studentAccessEnabled: z.boolean().default(true),

  // System Preferences
  timeZone: z.string().min(1, 'Time zone is required').default('UTC'),
  language: languageEnum.default('en'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  dateFormat: z.enum(['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD-MM-YY', 'DD-MM-YYYY']).default('MM/DD/YYYY'), // Adjusted default to match table
  timeFormat: z.enum(['12', '24']).default('12'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').regex(/^[A-Z]{3}$/, 'Currency must be uppercase ISO code').default('USD'),

  // Academic Calendar Settings
  gradingPeriods: num().int('Grading periods must be an integer').min(1, 'Grading periods must be at least 1').max(12, 'Grading periods cannot exceed 12').default(4),
  schoolStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time format (HH:MM)').default('08:00'),
  schoolEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time format (HH:MM)').default('15:00'),
  lunchBreakDuration: num().int('Lunch break duration must be in minutes').min(15, 'Lunch break must be at least 15 minutes').max(120, 'Lunch break cannot exceed 120 minutes').default(30),

  // Maintenance & Backup Settings
  maintenanceMode: z.boolean().default(false),
  autoBackup: z.boolean().default(true),

});

//=====================================================================//
// UTILITY SCHEMAS
//=====================================================================//

export const idParamSchema = z.object({
  id: optionalId,
});

export const paginationSchema = z.object({
  page: num().int().min(1).default(1),
  limit: num().int().min(1).max(100).default(10),
});

export const dateRangeSchema = z.object({
  dateFrom: dateField,
  dateTo: dateField,
})
