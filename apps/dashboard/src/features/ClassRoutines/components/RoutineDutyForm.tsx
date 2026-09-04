'use client';

import { ClipboardList, UserRound } from 'lucide-react';
import { FormInput, NForm, useDialog } from 'najm-kit';
import { z } from 'zod';
import { useTranslation } from 'najm-i18n/react';
import { useRoutineDutyCandidates } from '../hooks/useClassRoutines';
import type { RoutineDutyFormProps } from '../types';
import { routinePeriodLabel } from '../utils/labels';

export default function RoutineDutyForm({
  period,
  duty,
  onDelete,
}: RoutineDutyFormProps) {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const schema = z.object({
    staffId: z.string().min(1, t('classRoutines.ui.validation.chooseSupervisor')),
    notes: z.string().max(500, t('classRoutines.ui.validation.notesMax')).optional(),
  });
  const { data: candidates = [] } = useRoutineDutyCandidates();
  const isLunch = routinePeriodLabel(period.name, t) === t('classRoutines.ui.defaultNames.lunchBreak');
  const supervisors = candidates
    .filter((candidate) => isLunch || Boolean(candidate.teacherId))
    .map((candidate) => ({
      value: candidate.staffId,
      label: `${candidate.staffName} · ${candidate.staffRole}`,
    }));
  return (
    <NForm
      id="routine-duty-form"
      schema={schema}
      defaultValues={{ staffId: duty?.staffId || '', notes: duty?.notes || '' }}
      onSubmit={(data) => pop(data)}
    >
      <div className="space-y-4">
        <FormInput
          name="staffId"
          type="select"
          formLabel={isLunch ? t('classRoutines.ui.fields.supervisingStaff') : t('classRoutines.ui.fields.supervisingTeacher')}
          placeholder={isLunch ? t('classRoutines.ui.placeholders.selectStaff') : t('classRoutines.ui.placeholders.selectTeacher')}
          icon={UserRound}
          items={supervisors}
          required
        />
        <FormInput name="notes" type="textarea" formLabel={t('classRoutines.ui.fields.dutyNotes')} icon={ClipboardList} />
        {onDelete ? (
          <button type="button" className="text-sm font-medium text-destructive" onClick={async () => { await onDelete(); pop(); }}>
            {t('classRoutines.ui.actions.removeSupervision')}
          </button>
        ) : null}
      </div>
    </NForm>
  );
}
