'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFieldArray, useWatch } from 'react-hook-form';
import { BookOpen, Coffee, GripVertical, Plus, Trash2 } from 'lucide-react';
import { FormInput, NButton, NForm, useDialog, useNForm } from 'najm-kit';
import { z } from 'zod';
import { useTranslation } from '@/hooks/useLanguage';
import type { RoutineScheduleFormProps, TimelineItem } from '../types';
import { routinePeriodLabel } from '../utils/labels';

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const duration = (item: TimelineItem) => Math.max(5, toMinutes(item.endTime) - toMinutes(item.startTime));
const reflow = (items: TimelineItem[]) => {
  let cursor = toMinutes(items[0]?.startTime || '08:00');
  return items.map((item) => {
    const next = { ...item, startTime: toTime(cursor), endTime: toTime(cursor + duration(item)) };
    cursor += duration(item);
    return next;
  });
};

function SortableTimelineRow({
  id,
  index,
  isBreak,
  name,
  onRemove,
}: {
  id: string;
  index: number;
  isBreak: boolean;
  name?: string;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        gridTemplateColumns: '1.75rem 11rem minmax(12rem, 1fr) 8rem 8rem 2rem',
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`relative grid min-w-[46rem] items-end gap-2 rounded-lg border p-2 shadow-xs transition-[box-shadow,background-color,border-color] ${isBreak ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/15' : 'bg-card'} ${isDragging ? 'z-10 shadow-lg ring-2 ring-primary/25' : ''}`}
    >
      <button
        type="button"
        aria-label={t('classRoutines.ui.periodForm.dragRow', { number: index + 1 })}
        className="mb-1 flex touch-none cursor-grab flex-col items-center gap-0.5 text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
        <span className="text-[9px] tabular-nums">{index + 1}</span>
      </button>
      <FormInput
        name={`periods.${index}.type`}
        type="select"
        formLabel={t('classRoutines.ui.fields.type')}
        items={[
          { value: 'lesson', label: t('classRoutines.ui.periodForm.teachingPeriod') },
          { value: 'break', label: t('classRoutines.ui.periodForm.breakRecess') },
        ]}
        icon={isBreak ? Coffee : BookOpen}
        className="h-8 [&>div:first-child]:h-8"
        required
      />
      <FormInput name={`periods.${index}.name`} type="text" formLabel={t('classRoutines.ui.fields.nameLabel')} required />
      <FormInput name={`periods.${index}.startTime`} type="time" formLabel={t('classRoutines.ui.fields.startTime')} required />
      <FormInput name={`periods.${index}.endTime`} type="time" formLabel={t('classRoutines.ui.fields.endTime')} required />
      <NButton
        type="button"
        variant="ghost"
        size="sm"
        aria-label={t('classRoutines.ui.periodForm.removeRow', { name: name || String(index + 1) })}
        onClick={onRemove}
        className="mb-0.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </NButton>
    </div>
  );
}

export default function RoutineScheduleForm({
  periods,
}: RoutineScheduleFormProps) {
  const { pop } = useDialog();
  const { t } = useTranslation();
  const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, t('classRoutines.ui.validation.timeFormat'));
  const timelineItemSchema = z.object({
    type: z.enum(['lesson', 'break']),
    name: z.string().trim().min(1, t('classRoutines.ui.validation.nameRequired')).max(80),
    startTime: time,
    endTime: time,
  });
  const schema = z.object({
    periods: z.array(timelineItemSchema).min(1).max(30),
  }).superRefine((value, context) => {
    if (!value.periods.some((period) => period.type === 'lesson')) {
      context.addIssue({ code: 'custom', path: ['periods'], message: t('classRoutines.ui.validation.teachingPeriodRequired') });
    }
    value.periods.forEach((period, index) => {
      if (period.startTime >= period.endTime) {
        context.addIssue({ code: 'custom', path: ['periods', index, 'endTime'], message: t('classRoutines.ui.validation.endAfterStart') });
      }
      const previous = value.periods[index - 1];
      if (previous && period.startTime < previous.endTime) {
        context.addIssue({ code: 'custom', path: ['periods', index, 'startTime'], message: t('classRoutines.ui.validation.noOverlap') });
      }
    });
  });
  const form = useNForm({
    schema,
    defaultValues: {
      periods: periods.map((period) => ({
        type: period.isBreak ? 'break' as const : 'lesson' as const,
        name: routinePeriodLabel(period.name, t),
        startTime: period.startTime.slice(0, 5),
        endTime: period.endTime.slice(0, 5),
      })),
    },
  });
  const { fields, append, replace } = useFieldArray({ control: form.control, name: 'periods' });
  const rows = useWatch({ control: form.control, name: 'periods' }) || [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addRow = (type: 'lesson' | 'break') => {
    const current = form.getValues('periods');
    const lastEnd = current.at(-1)?.endTime || '08:00';
    const lessonNumber = current.filter((item) => item.type === 'lesson').length + 1;
    const breakNumber = current.filter((item) => item.type === 'break').length;
    const breakNames = [
      t('classRoutines.ui.defaultNames.morningBreak'),
      t('classRoutines.ui.defaultNames.lunchBreak'),
      t('classRoutines.ui.defaultNames.afternoonBreak'),
    ];
    const minutes = type === 'lesson' ? 60 : (breakNumber === 1 ? 60 : 15);
    append({
      type,
      name: type === 'lesson'
        ? t('classRoutines.ui.defaultNames.period', { number: lessonNumber })
        : (breakNames[breakNumber] || t('classRoutines.ui.defaultNames.break', { number: breakNumber + 1 })),
      startTime: lastEnd,
      endTime: toTime(toMinutes(lastEnd) + minutes),
    });
  };

  const removeRow = (index: number) => {
    const current = form.getValues('periods').filter((_, itemIndex) => itemIndex !== index);
    replace(current.length ? reflow(current) : []);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.id === active.id);
    const to = fields.findIndex((field) => field.id === over.id);
    if (from < 0 || to < 0) return;
    replace(reflow(arrayMove(form.getValues('periods'), from, to)));
  };

  return (
    <NForm
      id="routine-schedule-form"
      schema={schema}
      form={form}
      variant="compact"
      onSubmit={(data) => pop(data)}
      className="min-h-0 gap-3"
    >
      <div className="space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((field) => field.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <SortableTimelineRow
                  key={field.id}
                  id={field.id}
                  index={index}
                  isBreak={rows[index]?.type === 'break'}
                  name={rows[index]?.name}
                  onRemove={() => removeRow(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex flex-wrap justify-center gap-2 pt-3">
        <NButton type="button" variant="outline" size="sm" onClick={() => addRow('lesson')}>
          <Plus className="h-4 w-4" /> {t('classRoutines.ui.actions.addTeachingPeriod')}
        </NButton>
        <NButton type="button" variant="outline" size="sm" onClick={() => addRow('break')} className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300">
          <Plus className="h-4 w-4" /> {t('classRoutines.ui.actions.addBreak')}
        </NButton>
      </div>
    </NForm>
  );
}
