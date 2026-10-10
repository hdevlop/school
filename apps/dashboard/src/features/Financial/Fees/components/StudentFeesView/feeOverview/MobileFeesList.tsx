"use client"

import { useMemo, useState } from 'react';
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  NBadge,
  NButton,
  Progress,
  useDialog,
} from 'najm-kit';
import { CalendarClock, CheckCircle2, ChevronDown, CreditCard, MoreVertical } from 'lucide-react';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import FeeCategoryIcon from '../../FeeCategoryIcon';
import InstallmentDetails from '@/features/Financial/Installment/components/InstallmentDetails';
import { UPCOMING_STATUS_COLOR, displayInstallmentStatus } from '@/features/Financial/Installment/config/installmentStatus';
import { isInstallmentPayable } from '@/features/Financial/Payment/store/paymentStore';

type MenuItem = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
};

interface Props {
  fees: any[];
  initialOpenFeeId?: string | null;
  feeMenu: (fee: any) => MenuItem[];
  onPayInstallment: (installment: any) => void;
}

const feeBalance = (fee: any) => Number(fee?.balance) || 0;
const overdueCount = (fee: any) => fee.installments?.filter((item: any) => item.status === 'overdue').length || 0;

/**
 * The fees at phone width: one compact row per fee that opens onto its
 * installments in place. On a phone the desktop layout put the installments
 * below every fee card, a couple of screens away from the fee that chose them.
 */
export function MobileFeesList({ fees, initialOpenFeeId = null, feeMenu, onPayInstallment }: Props) {
  const { t } = useTranslation();

  // Fees still owed first, overdue ones at the top; fully paid fees fold away.
  const { owed, paid } = useMemo(() => {
    const owedFees = fees.filter((fee) => feeBalance(fee) > 0);
    return {
      owed: [...owedFees].sort((a, b) => Number(overdueCount(b) > 0) - Number(overdueCount(a) > 0)),
      paid: fees.filter((fee) => feeBalance(fee) <= 0),
    };
  }, [fees]);

  const [openIds, setOpenIds] = useState<Set<string>>(() => {
    const first = initialOpenFeeId ?? owed[0]?.id;
    return new Set(first ? [first] : []);
  });
  const [showPaid, setShowPaid] = useState(false);

  const toggle = (id: string) => setOpenIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const renderFee = (fee: any) => (
    <FeeRow
      key={fee.id}
      fee={fee}
      open={openIds.has(fee.id)}
      onToggle={() => toggle(fee.id)}
      menu={feeMenu(fee)}
      onPayInstallment={onPayInstallment}
    />
  );

  return (
    <div className="flex flex-col gap-2 p-1.5">
      {owed.map(renderFee)}

      {paid.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowPaid((value) => !value)}
            aria-expanded={showPaid}
            className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t('fees.studentView.paidGroup', { count: paid.length })}
            </span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', showPaid && 'rotate-180')} />
          </button>
          {showPaid && paid.map(renderFee)}
        </div>
      )}
    </div>
  );
}

function FeeRow({ fee, open, onToggle, menu, onPayInstallment }: {
  fee: any;
  open: boolean;
  onToggle: () => void;
  menu: MenuItem[];
  onPayInstallment: (installment: any) => void;
}) {
  const { t } = useTranslation();
  const { majorMoney, displayDateOnly } = useSchoolFormat();
  const { openDialog } = useDialog();

  const installments = fee.installments ?? [];
  const paidCount = installments.filter((item: any) => item.status === 'paid').length;
  const overdue = overdueCount(fee);
  const balance = feeBalance(fee);
  const isPaid = balance <= 0;
  const progress = fee.netAmount > 0 ? (Number(fee.paidAmount) / Number(fee.netAmount)) * 100 : 0;

  const openInstallment = (installment: any) => {
    const installmentTitle = t('fees.studentView.installmentNumber', { number: installment.number });
    openDialog({
      title: `${fee.name} · ${installmentTitle}`,
      children: <InstallmentDetails installment={installment} />,
      width: 'md',
      showButtons: false,
    });
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-card',
        overdue > 0 ? 'border-red-200' : isPaid ? 'border-emerald-200' : 'border-border',
      )}
    >
      <div className="flex items-start gap-1 p-3 pe-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 flex-col gap-2 text-start"
        >
          <span className="flex w-full items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xl">
              <FeeCategoryIcon
                category={fee.type ?? fee.feeTypeCategory ?? fee.category ?? fee.feeType?.category}
                fallback={fee.icon}
              />
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{fee.name}</span>
            <span className={cn('shrink-0 font-bold tabular-nums', isPaid ? 'text-emerald-700' : 'text-red-600')}>
              {majorMoney(isPaid ? fee.paidAmount : balance)}
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </span>
          <Progress
            value={progress}
            color={isPaid ? 'success' : 'primary'}
            className="h-1.5 w-full overflow-hidden rounded-full"
          />
          <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{t('fees.studentView.paidOfTotal', { paid: paidCount, total: installments.length })}</span>
            {overdue > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="font-medium text-red-600">{t('fees.studentView.overdueShort', { count: overdue })}</span>
              </>
            )}
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <NButton type="button" variant="ghost" size="icon" className="size-8 shrink-0" aria-label={fee.name}>
              <MoreVertical className="h-4 w-4" />
            </NButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menu.map(({ label, icon: Icon, danger, separatorBefore, onSelect }) => (
              <div key={label}>
                {separatorBefore && <DropdownMenuSeparator />}
                <DropdownMenuItem onSelect={onSelect} className={cn(danger && 'text-destructive focus:text-destructive')}>
                  {Icon && <Icon className="h-4 w-4" />}
                  {label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {open && (
        <ul className="divide-y border-t">
          {installments.map((installment: any) => {
            const payable = isInstallmentPayable(installment);
            const status = displayInstallmentStatus(installment.status);
            return (
              <li
                key={installment.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2',
                  installment.status === 'overdue' && 'border-s-4 border-s-red-500 bg-red-50/50',
                  installment.status === 'paid' && 'text-muted-foreground',
                )}
              >
                <button
                  type="button"
                  onClick={() => openInstallment(installment)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-start text-sm"
                >
                  <span className="w-7 shrink-0 font-semibold">#{installment.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium tabular-nums">{majorMoney(installment.amount || 0)}</span>
                    <span className="block text-xs text-muted-foreground">{displayDateOnly(installment.dueDate)}</span>
                    {!payable && installment.status !== 'paid' && Number(installment.reservedAmount || 0) > 0 && (
                      <span className="block text-xs text-amber-700">{t('fees.studentView.paymentInProgress')}</span>
                    )}
                  </span>
                  <NBadge
                    status={status}
                    statusMap={UPCOMING_STATUS_COLOR}
                    icon={installment.status === 'pending' ? CalendarClock : undefined}
                    showIcon
                    className="shrink-0"
                  />
                </button>
                {payable && (
                  <NButton
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 gap-1 px-2.5 text-xs"
                    onClick={() => onPayInstallment(installment)}
                    aria-label={t('fees.studentView.payInstallment')}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {t('fees.studentView.pay')}
                  </NButton>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
