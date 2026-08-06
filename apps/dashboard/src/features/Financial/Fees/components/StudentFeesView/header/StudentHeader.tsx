import { Label } from 'najm-kit';
import { NAvatar, NButton } from 'najm-kit';
import { getAvatarFallback } from '@/lib/avatar';
import { CreditCard } from 'lucide-react';

export const StudentHeader = ({ studentFees, onPayClick, payDisabled = false }) => {

   const { student, alerts, assignment } = studentFees;

   return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-card-foreground">

         {/* Left: Avatar + Info */}
         <div className="flex items-center gap-3 flex-1 min-w-0">
            <NAvatar
               src={student.image}
               fallback={getAvatarFallback(student.name)}
               size="sm"
            />

            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-0.5">
                  <Label className="text-base font-semibold truncate">
                     {student.name}
                  </Label>
                  {alerts?.hasOverdueFees && (
                     <span className="w-2 h-2 bg-destructive rounded-full shrink-0" title={alerts.message} />
                  )}
               </div>

               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">📋 {student.studentCode}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>📚 {assignment.class.name}</span>
                  {assignment.section?.name && (
                     <>
                        <span className="text-muted-foreground/40">•</span>
                        <span>🏛️ {assignment.section.name}</span>
                     </>
                  )}
               </div>
            </div>
         </div>

         {/* Center: Alert Box (Option 3 Style) */}
         {alerts?.hasOverdueFees && (
            <div className="flex gap-2 items-center bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2 mx-3">
               <span className='text-sm'>⛔</span>
               <p className="text-sm font-bold text-destructive">
                  {alerts.message}
               </p>
            </div>
         )}

         {/* Right: Action */}
         <NButton
            onClick={onPayClick}
            disabled={payDisabled}
            title={payDisabled ? 'Nothing to pay' : undefined}
            className="shrink-0 px-8 font-semibold"
            size="lg"
         >
            <CreditCard className="mr-2 h-4 w-4" />
            Pay
         </NButton>
      </div>
   );
};
