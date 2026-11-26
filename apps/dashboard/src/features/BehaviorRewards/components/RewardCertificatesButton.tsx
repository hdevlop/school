'use client';

import type { Table } from '@tanstack/react-table';
import { FileBadge, Printer } from 'lucide-react';
import { NButton, useTableStore } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { toast } from 'sonner';
import { useViewingAcademicYear } from '@/features/AcademicYears/hooks/useViewingAcademicYear';
import { useSchoolPrintBranding } from '@/hooks/useSchoolPrintOptions';
import { MobileFeatureActions } from '@/shared/FeatureActions';
import { printSchoolDocument } from '@/shared/schoolPrintDocument';
import {
  buildRewardCertificateDocument,
  certificateRewardsFromTable,
  rewardCertificate,
  rewardCertificates,
  type CertificateReward,
} from '../config/rewardCertificatePrint';

/**
 * Prints straight from the records: each certificate reward already holds its
 * place, and is signed by the teacher who gave it. Nothing is asked at print time.
 */
function useCertificatePrint() {
  const { t } = useTranslation();
  const { viewingYear } = useViewingAcademicYear();
  const { school, isSettingsLoading } = useSchoolPrintBranding('fr');
  return {
    disabled: !viewingYear || isSettingsLoading,
    print: async (rewards: readonly CertificateReward[]) => {
      if (!viewingYear) return;
      const certificates = rewardCertificates(rewards);
      if (!certificates.length) {
        toast.info(t('behaviorRewards.certificates.empty'));
        return;
      }
      try {
        await printSchoolDocument(buildRewardCertificateDocument(certificates, {
          school, academicYear: viewingYear, assetOrigin: window.location.origin,
        }));
      } catch {
        toast.error(t('behaviorRewards.certificates.failed'));
      }
    },
  };
}

/** One print icon: the teacher checks the students in the table, then prints their certificates. */
export function RewardCertificatesButton({ hasRows }: { hasRows: boolean }) {
  const { t } = useTranslation();
  const table: Table<CertificateReward> | null = useTableStore.use.table();
  const selected = Object.values(useTableStore.use.rowSelection()).filter(Boolean).length;
  const { print, disabled } = useCertificatePrint();
  const label = selected
    ? t('behaviorRewards.certificates.printSelected', { count: selected })
    : t('behaviorRewards.certificates.selectToPrint');

  return (
    <MobileFeatureActions>
      <NButton type="button" variant="outline" size="icon" className="relative shrink-0"
        aria-label={label} title={label} disabled={!table || !hasRows || disabled}
        onClick={() => {
          if (!table) return;
          if (!selected) {
            toast.info(t('behaviorRewards.certificates.selectToPrint'));
            return;
          }
          void print(certificateRewardsFromTable(table));
        }}>
        <Printer className="size-4" aria-hidden />
        {selected > 0 && (
          <span aria-hidden className="absolute -end-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums">
            {selected}
          </span>
        )}
      </NButton>
    </MobileFeatureActions>
  );
}

/** Shown only on a certificate reward that records its place. */
export function RewardCertificateButton({ reward }: { reward: CertificateReward }) {
  const { t } = useTranslation();
  const { print, disabled } = useCertificatePrint();
  if (!rewardCertificate(reward)) return null;

  return (
    <NButton type="button" variant="outline" size="sm" className="justify-self-start"
      disabled={disabled} onClick={() => void print([reward])}>
      <FileBadge className="size-4" aria-hidden />
      {t('behaviorRewards.certificates.printOne')}
    </NButton>
  );
}
