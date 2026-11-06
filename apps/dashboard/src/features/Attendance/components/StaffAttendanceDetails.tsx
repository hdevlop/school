'use client';

import { useMemo } from 'react';
import { Clock3, FileText } from 'lucide-react';
import { FormInput, NButton, NForm, cn, inputBorderClasses } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { z } from 'zod';
import { useDialog } from '@/shared/useDialog';
import type { StaffAttendanceDetails as Details } from '../config/staffAttendanceDetails';

function DetailsForm({ details }: { details: Details }) {
  const { t } = useTranslation();
  const { pop } = useDialog();
  const schema = useMemo(() => z.object({
    arrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, t('validationMessages.arrivalTimeInvalid')).or(z.literal('')),
    notes: z.string().max(500, t('validationMessages.notesTooLong')),
  }), [t]);
  return (
    <NForm id="staff-attendance-details" schema={schema} defaultValues={details} onSubmit={async values => { await pop(values); }}>
      <FormInput name="arrivalTime" type="time" formLabel={t('attendance.roster.arrivalTime')} icon={Clock3} />
      <FormInput name="notes" type="textarea" formLabel={t('attendance.form.notes')} icon={FileText} rows={3} />
      <p className="text-sm text-muted-foreground">{t('attendance.roster.detailsSaveHint')}</p>
    </NForm>
  );
}

export default function StaffAttendanceDetails({ name, details, disabled, onChange, compact = false, iconOnly = false }: {
  name: string; details: Details; disabled?: boolean; onChange: (details: Details) => void; compact?: boolean; iconOnly?: boolean;
}) {
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  const hasDetails = Boolean(details.arrivalTime || details.notes);
  const title = [t('attendance.roster.details'), details.arrivalTime, details.notes].filter(Boolean).join(' · ');
  return (
    <div className={cn('flex min-w-0 items-center', iconOnly ? 'shrink-0' : compact ? 'justify-end gap-2' : 'flex-col gap-1')} onClick={event => event.stopPropagation()}
      title={disabled ? t('attendance.roster.markBeforeDetails') : undefined}>
      <NButton type="button" size="sm" variant="outline" disabled={disabled}
        className={cn(iconOnly ? 'relative size-8 shrink-0 rounded-lg p-0' : compact ? 'order-last h-7 shrink-0 gap-1.5 px-2 text-xs' : undefined,
          inputBorderClasses(), 'text-foreground hover:text-foreground',
          iconOnly && hasDetails && 'bg-primary/10')}
        aria-label={`${t('attendance.roster.details')} — ${name}`}
        title={title}
        onClick={() => openDialog({
          title: `${t('attendance.roster.details')} — ${name}`,
          children: <DetailsForm details={details} />,
          primaryButton: {
            form: 'staff-attendance-details', text: t('attendance.roster.applyDetails'),
            onClick: (values: Details) => { onChange(values); },
          },
        })}>
        {iconOnly ? <FileText aria-hidden="true" className="h-3.5 w-3.5 text-foreground" /> : <><Clock3 className="h-4 w-4" />{t('attendance.roster.details')}</>}
        {iconOnly && hasDetails && <span aria-hidden="true" className="absolute end-1 top-1 size-1.5 rounded-full bg-primary" />}
      </NButton>
      {!iconOnly && (disabled ? (!compact && <span className="text-xs text-muted-foreground">{t('attendance.roster.markBeforeDetails')}</span>) : (
        <>
          {details.arrivalTime && <span className="shrink-0 text-xs font-medium" dir="ltr">{details.arrivalTime}</span>}
          {details.notes && <span className={cn('truncate text-xs text-muted-foreground', compact ? 'min-w-0 flex-1' : 'max-w-48')} title={details.notes}>{details.notes}</span>}
        </>
      ))}
    </div>
  );
}
