
import { PaymentHeader } from './PaymentHeader';
import { PaymentForm } from './PaymentForm';
import { AutoAllocationTools } from './AutoAllocationTools';
import { InstallmentList } from './InstallmentList';
import { PaymentSummary } from './PaymentSummary';
import { useFees } from '@/features/Financial/Fees/hooks/useFees';
import { Label, NSkeleton } from 'najm-kit';

interface MultiFeesPaymentProps {
   studentId: string;
   studentFees?: any;
   compact?: boolean;
}

const MultiFeesPayment = ({ studentId, studentFees: initialStudentFees, compact = false }: MultiFeesPaymentProps) => {

   const shouldFetchStudentFees = !initialStudentFees && Boolean(studentId);
   const { studentFees: fetchedStudentFees, isStudentFeesLoading } = useFees({
      studentId,
      enabled: shouldFetchStudentFees,
   });
   const studentFees = initialStudentFees ?? fetchedStudentFees;

   if (shouldFetchStudentFees && isStudentFeesLoading) {
      return <MultiFeesPaymentSkeleton />;
   }

   if (!studentFees) {
      return (
         <div className="flex items-center justify-center h-full bg-white rounded-xl">
            <p className="text-gray-600">No fee data available</p>
         </div>
      );
   }

   const contentClassName = compact
      ? 'flex flex-col gap-3 p-4'
      : 'grid grid-cols-[1fr_2fr] gap-4 flex-1 overflow-hidden p-4';

   return (
      <div className={`flex flex-col bg-white rounded-xl overflow-hidden ${compact ? '' : 'h-full'}`}>
         <PaymentHeader student={studentFees} />

         <div className={contentClassName}>

            <div className={`flex flex-col gap-3 ${compact ? '' : 'min-h-0'}`}>
               <div className="font-semibold text-gray-900 flex items-center gap-2">
                  <Label className="text-sm font-semibold">💳 Payment Details</Label>
               </div>
               <PaymentForm studentId={studentId} />
               <PaymentSummary compact={compact} />
            </div>

            {!compact && (
               <div className='flex min-h-0 flex-col gap-3 overflow-hidden border-l-2 border-gray-300 pl-4'>
                  <div className="flex shrink-0 items-center gap-2 font-semibold text-gray-900">
                     <Label className="text-sm font-semibold">📋 Select Installments to Pay</Label>
                  </div>
                  <AutoAllocationTools studentFees={studentFees} />
                  <InstallmentList studentFees={studentFees} />
               </div>
            )}

         </div>
      </div>
   );
};

const MultiFeesPaymentSkeleton = () => {
   const formRows = Array.from({ length: 4 });
   const feeRows = Array.from({ length: 6 });

   return (
      <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white">
         <div className="shrink-0 bg-linear-to-r from-pink-600 to-orange-500 px-5 py-3">
            <div className="flex items-center gap-3">
               <NSkeleton className="h-9 w-9 rounded-full bg-white/35" />
               <div className="flex flex-col gap-2">
                  <NSkeleton className="h-5 w-36 bg-white/35" />
                  <NSkeleton className="h-3 w-64 bg-white/25" />
               </div>
            </div>
         </div>

         <div className="grid flex-1 grid-cols-[1fr_2fr] gap-4 overflow-hidden p-4">
            <div className="flex min-h-0 flex-col gap-3">
               <NSkeleton className="h-5 w-32" />

               <div className="grid grid-cols-2 gap-4">
                  {formRows.map((_, index) => (
                     <div key={index} className="flex flex-col gap-2">
                        <NSkeleton className="h-3 w-28" />
                        <NSkeleton className="h-10 w-full rounded-md" />
                     </div>
                  ))}
               </div>

               <div className="flex flex-col gap-2">
                  <NSkeleton className="h-3 w-24" />
                  <NSkeleton className="h-20 w-full rounded-md" />
               </div>

               <div className="flex flex-1 flex-col gap-3 rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <div className="flex items-center justify-between">
                     <NSkeleton className="h-5 w-36 bg-white/20" />
                     <NSkeleton className="h-5 w-5 rounded-full bg-white/20" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 rounded-lg border border-green-500/30 bg-green-900/20 p-3">
                     {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="flex flex-col items-center gap-2">
                           <NSkeleton className="h-3 w-20 bg-white/20" />
                           <NSkeleton className="h-6 w-16 bg-white/25" />
                        </div>
                     ))}
                  </div>
                  <div className="mt-auto">
                     <NSkeleton className="h-10 w-full rounded-md bg-white/20" />
                  </div>
               </div>
            </div>

            <div className="flex min-h-0 flex-col gap-3 overflow-hidden border-l-2 border-gray-300 pl-4">
               <NSkeleton className="h-5 w-48" />

               <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                        <NSkeleton className="h-9 w-9 rounded-md" />
                        <div className="flex flex-col gap-2">
                           <NSkeleton className="h-4 w-36" />
                           <NSkeleton className="h-3 w-56" />
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <NSkeleton className="h-9 w-40 rounded-md" />
                        <NSkeleton className="h-9 w-28 rounded-md" />
                        <NSkeleton className="h-9 w-24 rounded-md" />
                     </div>
                  </div>
               </div>

               <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
                  {feeRows.map((_, index) => (
                     <div key={index} className="rounded-lg border border-border bg-card px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                           <div className="flex min-w-0 flex-1 items-center gap-2">
                              <NSkeleton className="h-8 w-8 rounded-md" />
                              <NSkeleton className="h-4 w-36" />
                              <NSkeleton className="h-3 w-28" />
                              <NSkeleton className="h-3 w-24" />
                           </div>
                           <NSkeleton className="h-5 w-5 rounded-full" />
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
};

export default MultiFeesPayment;
