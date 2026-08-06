// Export all entity generators
export {
   generateParent,
   generateParents,
   generateStudent,
   generateTeacher,
   generateDriver,
   generateVehicle,
   generateFee,
   generateFees,
   generateFeeStatus,
   generateExpense,
   generateExpenses,
   generateAnnouncement,
   generateEvent,
   generateExam,
   generateAssessment,
   generateClass,
   generateSection,
   generateSubject,
   generateFeeType,
   generateReceiptNumber,
   generateTransactionRef,
   generateInvoiceNumber,
   generatePaymentRef,
   generateCheckNumber,
   generateAllocationRef,
   TUITION_FEE_TYPE,
   TRANSPORT_FEE_TYPE,
   CAFETERIA_FEE_TYPE,
   REGISTRATION_FEE_TYPE,
   UNIFORM_FEE_TYPE,
   BOOKS_FEE_TYPE,
   SPORTS_FEE_TYPE,
   TECHNOLOGY_FEE_TYPE,
   FIELD_TRIP_FEE_TYPE,
   INITIAL_FEE_TYPES,
   OPTIONAL_FEE_TYPES
} from './entities';

// Export all static data
export {
   lastNames,
   femaleNames,
   maleNames,
   sections,
   streets,
   cities,
   conditions,
   schoolNames,
   relationshipType,
   maritalStatusArr,
   SCHEDULES,
   classesData,
   sectionsData,
   subjectsData,
   feeTypeData,
   vehiclesData,
} from './staticData';

// Export all utility functions
export * as fake from './fakers';
export { getNumberOfChildren } from './fakers';
export { buildFormFill, pick } from './formFill';
export type { FormFillOverride, FormFillOverrides } from './formFill';
