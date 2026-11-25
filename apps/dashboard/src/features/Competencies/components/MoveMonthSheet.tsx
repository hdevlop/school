'use client';

import { useState } from 'react';
import type { CompetencyAssignment } from '@sms/contracts';
import { NButton, NSheet, SelectInput } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useCompetencyCatalogActions } from '../hooks/useCompetencies';

/**
 * A teacher who entered a month's levels under the wrong month moves them,
 * with the remarks, to the right one for this class and subject. The server
 * refuses a month that already has levels or remarks, so nothing is
 * overwritten; the page then shows the month they moved to.
 */
export function MoveMonthSheet({ open, onClose, assignment, month, months, onMoved }: {
  open: boolean;
  onClose: () => void;
  assignment: CompetencyAssignment;
  month: string;
  months: Array<{ value: string; label: string }>;
  onMoved: (toMonth: string) => void;
}) {
  const { t } = useTranslation();
  const { moveMonth } = useCompetencyCatalogActions();
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const targets = months.filter((item) => item.value !== month);
  const monthName = months.find((item) => item.value === month)?.label ?? month;

  const move = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await moveMonth({ teacherAssignmentId: assignment.teacherAssignmentId, fromMonth: month, toMonth: target });
      onMoved(target);
      setTarget('');
      onClose();
    } catch {
      // The toast said why.
    } finally {
      setBusy(false);
    }
  };

  return (
    <NSheet
      open={open}
      onOpenChange={(next) => { if (!next && !busy) onClose(); }}
      icon={FEATURE_ICONS.competencies}
      title={t('competencies.catalog.moveTitle')}
      description={t('competencies.catalog.moveDescription', {
        month: monthName,
        class: `${assignment.className} ${assignment.sectionName} · ${assignment.subjectName}`,
      })}
      width={440}
      classNames={{ content: 'max-w-full bg-background', body: 'p-4' }}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <NButton type="button" variant="outline" onClick={onClose} disabled={busy}>{t('competencies.catalog.cancel')}</NButton>
          <NButton type="button" onClick={move} loading={busy} disabled={busy || !target}>{t('competencies.catalog.moveAction')}</NButton>
        </div>
      )}
    >
      <SelectInput
        value={target}
        onChange={setTarget}
        items={targets}
        placeholder={t('competencies.catalog.moveTarget')}
        ariaLabel={t('competencies.catalog.moveTarget')}
        showIcon={false}
        className="w-full"
      />
    </NSheet>
  );
}
