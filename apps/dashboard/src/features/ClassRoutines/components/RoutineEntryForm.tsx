'use client';

import { useFieldArray, useWatch } from 'react-hook-form';
import { ArrowDown, ArrowUp, BookOpen, DoorOpen, Layers, Plus, Trash2, UserRound } from 'lucide-react';
import { FormInput, NButton, NForm, useNForm } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { z } from 'zod';
import { MAX_ROUTINE_CONTENT_GROUPS, MAX_ROUTINE_CONTENT_LABEL_LENGTH, type RoutineContentGroup } from '@sms/contracts/routines';
import type { RoutineEntryFormProps } from '../types';
import { subjectColors } from '../utils/subjectColors';
import RoutineCell from './RoutineCell';

const iconButton = 'h-8 w-8 p-0';
// A select item cannot carry an empty value, so "no teacher" has its own.
const NO_TEACHER = 'none';

export default function RoutineEntryForm({
  subjectOptions,
  assignmentOptions,
  otherSubjects = [],
  entry,
  defaultRoom,
  onSubmit,
  readOnly = false,
}: RoutineEntryFormProps) {
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
    subjectId: z.string().min(1, t('classRoutines.ui.validation.chooseSubject')),
    teacherAssignmentId: z.string(),
    roomNumber: z.string().trim().max(50).optional(),
    contentGroups: z.array(group).max(MAX_ROUTINE_CONTENT_GROUPS),
  });
  const form = useNForm({
    schema,
    defaultValues: {
      subjectId: entry?.subjectId || '',
      teacherAssignmentId: entry?.teacherAssignmentId || NO_TEACHER,
      roomNumber: entry?.roomNumber || '',
      contentGroups: entry?.contentGroups || [],
    },
  });
  const { fields, append, replace, move, remove } = useFieldArray({ control: form.control, name: 'contentGroups' });
  const groups = useWatch({ control: form.control, name: 'contentGroups' }) || [];
  const subjectId = useWatch({ control: form.control, name: 'subjectId' });
  const assignmentId = useWatch({ control: form.control, name: 'teacherAssignmentId' });
  const subject = subjectOptions.find((item) => item.id === subjectId);
  const subjectTeachers = assignmentOptions.filter((item) => item.subjectId === subjectId);
  const teacher = subjectTeachers.find((item) => item.id === assignmentId);
  const subjectItems = subjectOptions.map((item) => ({ value: item.id, label: item.name }));
  const teacherItems = [
    { value: NO_TEACHER, label: t('classRoutines.ui.placeholders.noTeacher') },
    ...subjectTeachers.map((item) => ({ value: item.id, label: item.teacherName })),
  ];

  // A teacher stays on the lesson only while they teach its subject here.
  const changeSubject = (next: string) => {
    const kept = assignmentOptions.some((item) => item.id === form.getValues('teacherAssignmentId') && item.subjectId === next);
    if (!kept) form.setValue('teacherAssignmentId', NO_TEACHER);
  };

  const submit = (values: z.output<typeof schema>) => onSubmit({
    ...values,
    teacherAssignmentId: values.teacherAssignmentId === NO_TEACHER ? null : values.teacherAssignmentId,
  });

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
      onSubmit={submit}
    >
      {/* Not `contents`: the fields would then sit outside the gap and touch. */}
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-4">
        {/* Phones put the subject on its own row, teacher and room beside each other. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7.5rem]">
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <FormInput
              name="subjectId"
              type="combobox"
              items={subjectItems}
              formLabel={t('classRoutines.ui.fields.subject')}
              placeholder={t('classRoutines.ui.placeholders.chooseSubject')}
              searchPlaceholder={t('classRoutines.ui.placeholders.searchSubjects')}
              emptyMessage={t('classRoutines.ui.empty.noSubjects')}
              icon={BookOpen}
              onChange={changeSubject}
              required
            />
          </div>
          <FormInput
            name="teacherAssignmentId"
            type="select"
            items={teacherItems}
            formLabel={t('classRoutines.ui.fields.teacher')}
            icon={UserRound}
          />
          <FormInput
            name="roomNumber"
            type="text"
            formLabel={t('classRoutines.ui.fields.room')}
            placeholder={defaultRoom ? t('classRoutines.ui.placeholders.sectionRoom', { room: defaultRoom }) : undefined}
            icon={DoorOpen}
          />
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Layers className="h-4 w-4" aria-hidden="true" />
            {t('classRoutines.ui.content.title')}
          </h3>
          {fields.map((field, index) => {
            const current = groups[index];
            const alternative = current?.kind === 'alternative';
            const name = t('classRoutines.ui.content.item', { number: index + 1 });
            return (
              <div key={field.id} className="rounded-lg border border-border bg-background/40 px-2 pb-1 pt-2">
                {/* One row: its number, its label or its pair, and its moves. */}
                <div className="flex items-start gap-2">
                  <span className="mt-2.5 w-4 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground" aria-hidden="true">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    {alternative ? (
                      <div className="grid grid-cols-1 items-start gap-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-2">
                        <FormInput name={`contentGroups.${index}.options.0`} type="text" placeholder={t('classRoutines.ui.content.optionA')} aria-label={`${name} · ${t('classRoutines.ui.content.optionA')}`} />
                        <span className="text-center text-xs font-semibold text-muted-foreground sm:mt-2.5">{t('classRoutines.ui.content.or')}</span>
                        <FormInput name={`contentGroups.${index}.options.1`} type="text" placeholder={t('classRoutines.ui.content.optionB')} aria-label={`${name} · ${t('classRoutines.ui.content.optionB')}`} />
                      </div>
                    ) : (
                      <FormInput name={`contentGroups.${index}.label`} type="text" placeholder={t('classRoutines.ui.content.label')} aria-label={name} />
                    )}
                  </div>
                  <div className="mt-1 flex shrink-0 items-center">
                    <NButton type="button" variant="ghost" size="sm" className={iconButton} onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={t('classRoutines.ui.content.moveUp')}><ArrowUp className="h-4 w-4" /></NButton>
                    <NButton type="button" variant="ghost" size="sm" className={iconButton} onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} aria-label={t('classRoutines.ui.content.moveDown')}><ArrowDown className="h-4 w-4" /></NButton>
                    <NButton type="button" variant="ghost" size="sm" className={`${iconButton} text-destructive hover:bg-destructive/10 hover:text-destructive`} onClick={() => remove(index)} aria-label={`${t('classRoutines.ui.content.remove')} ${index + 1}`}><Trash2 className="h-4 w-4" /></NButton>
                  </div>
                </div>
                <NButton type="button" variant="link" size="sm" onClick={() => convert(index)} className="ms-6 h-auto px-0 py-1 text-xs">
                  {alternative ? t('classRoutines.ui.content.useOne') : t('classRoutines.ui.content.addAlternative')}
                </NButton>
              </div>
            );
          })}
          {fields.length < MAX_ROUTINE_CONTENT_GROUPS ? (
            <NButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ kind: 'fixed', label: '' })}
              leftIcon={<Plus className="h-4 w-4" />}
              className="w-full justify-center border-dashed text-muted-foreground hover:border-primary/60 hover:bg-primary/5 hover:text-foreground"
            >
              {t('classRoutines.ui.content.addSubject')}
            </NButton>
          ) : null}
        </section>

        {subject ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-muted-foreground">{t('classRoutines.ui.content.preview')}</p>
            {/* As wide as a lesson column in the grid. */}
            <div className="w-48 max-w-full overflow-hidden rounded-lg border border-border">
              <RoutineCell
                subjectId={subject.id}
                subjectName={subject.name}
                teacherName={teacher?.teacherName}
                contentGroups={groups as RoutineContentGroup[]}
                color={subjectColors([...otherSubjects, subject])(subject.id)}
              />
            </div>
          </div>
        ) : null}
      </fieldset>
    </NForm>
  );
}
