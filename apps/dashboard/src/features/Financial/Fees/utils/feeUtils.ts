// ==================== CONSTANTS ====================

export const SCHEDULE_TYPES = {
   MONTHLY: 'monthly',
   QUARTERLY: 'quarterly',
   SEMESTER: 'semester',
   ANNUALLY: 'annually',
   ONE_TIME: 'oneTime',
} as const;

// ==================== TYPE DEFINITIONS ====================

export interface Fee {
   studentId?: string;
   feeTypeId: string;
   feeTypeName?: string;
   schedule: string;
   netAmount?: number | string;
   discountAmount?: number | string;
   notes?: string;
}

export interface FeeType {
   id: string;
   name: string;
   amount: number | string;
   paymentType: string;
   category?: string;
   labels?: Record<string, string>;
}

const SEEDED_FEE_TYPE_IDS = new Set(['FT00', 'FT01', 'FT02', 'FT03', 'FT04', 'FT05', 'FT06', 'FT07', 'FT8'])

export const getFeeTypeDisplayName = (
   feeType: FeeType | null | undefined,
   translate: (key: string) => string,
   language: string,
): string => {
   if (!feeType) return ''

   const localizedLabel = feeType.labels?.[language]
   if (localizedLabel) return localizedLabel

   if (SEEDED_FEE_TYPE_IDS.has(feeType.id) && feeType.category) {
      const key = `feeTypes.category.${feeType.category}`
      const translatedCategory = translate(key)
      if (translatedCategory !== key) return translatedCategory
   }

   return feeType.name
}

// ==================== FEE FACTORY ====================

export const FeeFactory = {
   createFromFeeType: (feeType: FeeType): Fee => {
      const baseAmount = parseFloat(feeType.amount?.toString() || '0') || 0
      const schedule = feeType.paymentType === 'oneTime' ? SCHEDULE_TYPES.ONE_TIME : SCHEDULE_TYPES.MONTHLY

      return {
         feeTypeId: feeType.id,
         feeTypeName: feeType.name,
         schedule,
         netAmount: baseAmount,
         discountAmount: 0,
         notes: ''
      }
   }
};

// ==================== FEE DATA TRANSFORMERS ====================

export const injectStudentIdToFees = (fees: Fee[], studentId: string): Fee[] => {
   return fees.map(fee => ({
      ...fee,
      studentId
   }));
};

export const prepareBulkFeesForSubmission = (formData: { fees?: Fee[] }, studentId: string) => {
   if (!formData.fees || !Array.isArray(formData.fees)) {
      return { fees: [] };
   }

   return {
      fees: injectStudentIdToFees(formData.fees, studentId)
   };
};

// ==================== FEE HELPERS ====================

export const getFeeTypeName = (feeTypes: FeeType[], feeTypeId: string): string => {
   const feeType = feeTypes.find(ft => ft.id === feeTypeId);
   return feeType?.name || '';
};

export const getFeeTypeById = (feeTypes: FeeType[], id: string): FeeType | undefined => {
   return feeTypes.find(ft => ft.id === id);
};

export const isOneTimePaymentType = (feeTypes: FeeType[], feeTypeId: string): boolean => {
   const feeType = getFeeTypeById(feeTypes, feeTypeId);
   return feeType?.paymentType === 'oneTime';
};
