import { Label } from 'najm-kit';
import { NAvatar, NButton, useNSidebar } from 'najm-kit';
import { CreditCard, Menu } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';

export const StudentHeader = ({ studentFees, onPayClick, payDisabled = false }) => {

   const { student, alerts, assignment } = studentFees;
   const sidebar = useNSidebar();
   const { t } = useTranslation();

   return (
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground">

         {/* Left: Avatar + Info */}
         <div className="flex basis-full items-center gap-3 min-w-0 xl:basis-auto xl:flex-1">
            {/* This header stands in for NPageHeader on the standalone
                /students/[id]/fees route, so it carries the mobile sidebar
                trigger the page header would otherwise provide. */}
            <NButton
               type="button"
               variant="ghost"
               size="icon"
               className="-ms-1 lg:hidden"
               aria-label="Open sidebar"
               onClick={() => sidebar?.openMobile()}
            >
               <Menu className="h-5 w-5" />
            </NButton>

            <NAvatar
               src={student.image}
               fallback={student.name}
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

               <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">📋 {student.studentCode}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <span>📚 {assignment?.class?.name ?? t('common.notAvailable')}</span>
                  {assignment?.section?.name && (
                     <>
                        <span className="text-muted-foreground/40">•</span>
                        <span>🏛️ {assignment.section.name}</span>
                     </>
                  )}
               </div>
            </div>
         </div>

         {/* Below lg the summary strip and the Pay bar under the fees carry the
             alert and the button, so the header keeps to the student. */}
         {/* Center: Alert Box (Option 3 Style) */}
         {alerts?.hasOverdueFees && (
            <div className="max-lg:hidden flex min-w-0 gap-2 items-center bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
               <span className='text-sm'>⛔</span>
               <p className="text-sm font-bold text-destructive">
                  {alerts.message}
               </p>
            </div>
         )}

         <div className="ms-auto flex shrink-0 items-center gap-1 max-lg:hidden">
            <NButton
               onClick={onPayClick}
               disabled={payDisabled}
               title={payDisabled ? t('fees.studentView.nothingToPay') : undefined}
               className="shrink-0 px-8 font-semibold"
               size="lg"
            >
               <CreditCard className="mr-2 h-4 w-4" />
               {t('fees.studentView.pay')}
            </NButton>
         </div>
      </div>
   );
};
