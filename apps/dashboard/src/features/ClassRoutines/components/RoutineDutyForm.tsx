'use client';

import { BookOpen, ClipboardList, UserRound } from 'lucide-react';
import { FormInput, NButton, NForm } from 'najm-kit';
import { useDialog } from '@/shared/useDialog';
import { z } from 'zod';
import { useTranslation } from 'najm-i18n/react';
import { useRoutineDutyCandidates } from '../hooks/useClassRoutines';
import type { RoutineDutyFormProps } from '../types';
import { routinePeriodLabel } from '../utils/labels';

export default function RoutineDutyForm({
  period,
  duty,
  onDelete,
  onUseForLesson,
  readOnly = false,
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
        <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-4">
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
        </fieldset>
        {onDelete ? (
          <button type="button" className="text-sm font-medium text-destructive" onClick={async () => { await onDelete(); pop(); }}>
            {t('classRoutines.ui.actions.removeSupervision')}
          </button>
        ) : null}
        {onUseForLesson ? (
          <NButton type="button" variant="outline" size="sm" leftIcon={<BookOpen className="h-4 w-4" />} onClick={() => { pop(); onUseForLesson(); }}>
            {t('classRoutines.ui.actions.lessonInBreak')}
          </NButton>
        ) : null}
      </div>
    </NForm>
  );
}
