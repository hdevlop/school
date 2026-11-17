'use client';

import { useState } from 'react';
import type { CompetencyAssignment } from '@sms/contracts';
import { NButton, NSheet, SelectInput } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { useCompetencyCatalogActions } from '../hooks/useCompetencies';

/**
 * The list of one class, copied to another class of the same subject the
 * teacher teaches, without any pupil's level. The server refuses a class that
 * already has a list.
 */
export function CopyCatalogSheet({ open, onClose, from, assignments, onCopied }: {
  open: boolean;
  onClose: () => void;
  from: CompetencyAssignment;
  assignments: CompetencyAssignment[];
  onCopied: (toAssignmentId: string) => void;
}) {
  const { t } = useTranslation();
  const { copyCatalog } = useCompetencyCatalogActions();
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const targets = assignments.filter((item) => item.subjectId === from.subjectId && item.teacherAssignmentId !== from.teacherAssignmentId);

  const copy = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await copyCatalog(from.teacherAssignmentId, target);
      onCopied(target);
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
      title={t('competencies.catalog.copyTitle')}
      description={t('competencies.catalog.copyDescription')}
      width={440}
      classNames={{ content: 'max-w-full bg-background', body: 'p-4' }}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <NButton type="button" variant="outline" onClick={onClose} disabled={busy}>{t('competencies.catalog.cancel')}</NButton>
          <NButton type="button" onClick={copy} disabled={busy || !target}>{t('competencies.catalog.copyAction')}</NButton>
        </div>
      )}
    >
      {targets.length ? (
        <SelectInput
          value={target}
          onChange={setTarget}
          items={targets.map((item) => ({ value: item.teacherAssignmentId, label: `${item.className} ${item.sectionName}` }))}
          placeholder={t('competencies.catalog.copyTarget')}
          ariaLabel={t('competencies.catalog.copyTarget')}
          showIcon={false}
          className="w-full"
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('competencies.catalog.copyNone')}</p>
      )}
    </NSheet>
  );
}
