'use client';

import { BookOpen, DoorOpen, StickyNote } from 'lucide-react';
import { FormInput, NButton, NForm, useDialog } from 'najm-kit';
import { z } from 'zod';
import { useTranslation } from 'najm-i18n/react';
import type { RoutineEntryFormProps } from '../types';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';

export default function RoutineEntryForm({
  assignmentOptions,
  day,
  period,
  entry,
  defaultRoom,
  onDelete,
}: RoutineEntryFormProps) {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const schema = z.object({
    teacherAssignmentId: z.string().min(1, t('classRoutines.ui.validation.chooseAssignment')),
    roomNumber: z.string().optional(),
    notes: z.string().max(500, t('classRoutines.ui.validation.notesMax')).optional(),
  });
  const items = assignmentOptions.map((assignment) => ({
    value: assignment.id,
    label: `${assignment.subjectName} · ${assignment.teacherName}`,
  }));

  return (
    <NForm
      id="routine-entry-form"
      schema={schema}
      defaultValues={{
        teacherAssignmentId: entry?.teacherAssignmentId || '',
        roomNumber: entry?.roomNumber || defaultRoom || '',
        notes: entry?.notes || '',
      }}
      onSubmit={(data) => pop(data)}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{routineDayLabel(day, t)}</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {routinePeriodLabel(period.name, t)} · {period.startTime.slice(0, 5)}–{period.endTime.slice(0, 5)}
          </p>
        </div>
        <FormInput
          name="teacherAssignmentId"
          type="combobox"
          items={items}
          formLabel={t('classRoutines.ui.fields.subjectTeacher')}
          placeholder={t('classRoutines.ui.placeholders.chooseTeacher')}
          searchPlaceholder={t('classRoutines.ui.placeholders.searchAssignments')}
          emptyMessage={t('classRoutines.ui.empty.noAssignments')}
          icon={BookOpen}
          required
        />
        <FormInput name="roomNumber" type="text" formLabel={t('classRoutines.ui.fields.room')} icon={DoorOpen} />
        <FormInput name="notes" type="textarea" formLabel={t('classRoutines.ui.fields.notes')} icon={StickyNote} />
        {entry && onDelete ? (
          <div className="border-t pt-3">
            <NButton
              type="button"
              variant="destructive"
              onClick={async () => {
                await onDelete();
                pop(null);
              }}
            >
              {t('classRoutines.ui.actions.removeLesson')}
            </NButton>
          </div>
        ) : null}
      </div>
    </NForm>
  );
}
