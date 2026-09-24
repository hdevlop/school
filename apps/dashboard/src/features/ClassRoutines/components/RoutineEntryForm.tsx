'use client';

import { useFieldArray, useWatch } from 'react-hook-form';
import { ArrowDown, ArrowUp, BookOpen, DoorOpen, Plus, StickyNote, Trash2 } from 'lucide-react';
import { FormInput, NButton, NForm, useDialog, useNForm } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { z } from 'zod';
import { MAX_ROUTINE_CONTENT_GROUPS, MAX_ROUTINE_CONTENT_LABEL_LENGTH, type RoutineContentGroup } from '@sms/contracts/routines';
import type { RoutineEntryFormProps } from '../types';
import { routineDayLabel, routinePeriodLabel } from '../utils/labels';
import RoutineCell from './RoutineCell';

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
  const label = z.string().trim().min(1, t('classRoutines.ui.validation.contentLabelRequired'))
    .max(MAX_ROUTINE_CONTENT_LABEL_LENGTH, t('classRoutines.ui.validation.contentLabelMax'));
  const group = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('fixed'), label }),
    z.object({ kind: z.literal('alternative'), options: z.tuple([label, label])
      .transform(([first, second]): [string, string] => [first!, second!])
      .refine(([first, second]) => first.toLocaleLowerCase() !== second.toLocaleLowerCase(), t('classRoutines.ui.validation.alternativesDiffer')) }),
  ]).pipe(z.custom<RoutineContentGroup>());
  const schema = z.object({
    teacherAssignmentId: z.string().min(1, t('classRoutines.ui.validation.chooseAssignment')),
    roomNumber: z.string().trim().max(50).optional(),
    notes: z.string().trim().max(500, t('classRoutines.ui.validation.notesMax')).optional(),
    contentGroups: z.array(group).max(MAX_ROUTINE_CONTENT_GROUPS),
  });
  const form = useNForm({
    schema,
    defaultValues: {
      teacherAssignmentId: entry?.teacherAssignmentId || '',
      roomNumber: entry?.roomNumber || '',
      notes: entry?.notes || '',
      contentGroups: entry?.contentGroups || [],
    },
  });
  const { fields, append, replace, move, remove } = useFieldArray({ control: form.control, name: 'contentGroups' });
  const groups = useWatch({ control: form.control, name: 'contentGroups' }) || [];
  const assignmentId = useWatch({ control: form.control, name: 'teacherAssignmentId' });
  const assignment = assignmentOptions.find((item) => item.id === assignmentId);
  const items = assignmentOptions.map((item) => ({
    value: item.id,
    label: `${item.subjectName} · ${item.teacherName}`,
  }));

  const convert = (index: number) => {
    const current = form.getValues('contentGroups');
    const selected = current[index];
    if (!selected) return;
    const next: RoutineContentGroup = selected.kind === 'fixed'
      ? { kind: 'alternative', options: [selected.label, ''] }
      : { kind: 'fixed', label: selected.options[0] };
    replace(current.map((item, itemIndex) => itemIndex === index ? next : item));
  };

  return (
    <NForm
      id="routine-entry-form"
      schema={schema}
      form={form}
      variant="compact"
      onSubmit={(data) => pop({ ...data, expectedVersion: entry?.version })}
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
        <FormInput name="roomNumber" type="text" formLabel={t('classRoutines.ui.fields.room')} placeholder={defaultRoom || undefined} icon={DoorOpen} />
        <FormInput name="notes" type="textarea" formLabel={t('classRoutines.ui.fields.notes')} icon={StickyNote} />

        <section className="space-y-2 rounded-xl border p-3">
          <div>
            <h3 className="text-sm font-semibold">{t('classRoutines.ui.content.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('classRoutines.ui.content.help')}</p>
          </div>
          {fields.map((field, index) => {
            const current = groups[index];
            const alternative = current?.kind === 'alternative';
            return (
              <div key={field.id} className="rounded-lg border bg-muted/25 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{t('classRoutines.ui.content.item', { number: index + 1 })}</span>
                  <div className="flex items-center gap-1">
                    <NButton type="button" variant="ghost" size="sm" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={t('classRoutines.ui.content.moveUp')}><ArrowUp className="h-4 w-4" /></NButton>
                    <NButton type="button" variant="ghost" size="sm" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} aria-label={t('classRoutines.ui.content.moveDown')}><ArrowDown className="h-4 w-4" /></NButton>
                    <NButton type="button" variant="ghost" size="sm" onClick={() => remove(index)} aria-label={t('classRoutines.ui.content.remove')}><Trash2 className="h-4 w-4" /></NButton>
                  </div>
                </div>
                {alternative ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <FormInput name={`contentGroups.${index}.options.0`} type="text" formLabel={t('classRoutines.ui.content.optionA')} required />
                    <FormInput name={`contentGroups.${index}.options.1`} type="text" formLabel={t('classRoutines.ui.content.optionB')} required />
                  </div>
                ) : (
                  <FormInput name={`contentGroups.${index}.label`} type="text" formLabel={t('classRoutines.ui.content.label')} required />
                )}
                <NButton type="button" variant="ghost" size="sm" onClick={() => convert(index)} className="mt-2">
                  {alternative ? t('classRoutines.ui.content.useOne') : t('classRoutines.ui.content.addAlternative')}
                </NButton>
              </div>
            );
          })}
          {fields.length < MAX_ROUTINE_CONTENT_GROUPS ? (
            <NButton type="button" variant="outline" size="sm" onClick={() => append({ kind: 'fixed', label: '' })}>
              <Plus className="h-4 w-4" />{t('classRoutines.ui.content.addSubject')}
            </NButton>
          ) : null}
        </section>

        {assignment ? (
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{t('classRoutines.ui.content.preview')}</p>
            <RoutineCell subjectId={assignment.subjectId} subjectName={assignment.subjectName} contentGroups={groups as RoutineContentGroup[]} />
          </div>
        ) : null}

        {entry && onDelete ? (
          <div className="border-t pt-3">
            <NButton type="button" variant="destructive" onClick={async () => { await onDelete(); pop(null); }}>
              {t('classRoutines.ui.actions.removeLesson')}
            </NButton>
          </div>
        ) : null}
      </div>
    </NForm>
  );
}
