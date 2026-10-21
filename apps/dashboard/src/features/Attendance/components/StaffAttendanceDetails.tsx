'use client';

import { useMemo } from 'react';
import { Clock3, FileText } from 'lucide-react';
import { FormInput, NButton, NForm } from 'najm-kit';
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

export default function StaffAttendanceDetails({ name, details, disabled, onChange }: {
  name: string; details: Details; disabled?: boolean; onChange: (details: Details) => void;
}) {
  const { t } = useTranslation();
  const { openDialog } = useDialog();
  return (
    <div className="flex min-w-0 flex-col items-center gap-1" onClick={event => event.stopPropagation()}>
      <NButton type="button" size="sm" variant="outline" disabled={disabled}
        onClick={() => openDialog({
          title: `${t('attendance.roster.details')} — ${name}`,
          children: <DetailsForm details={details} />,
          primaryButton: {
            form: 'staff-attendance-details', text: t('attendance.roster.applyDetails'),
            onClick: (values: Details) => { onChange(values); },
          },
        })}>
        <Clock3 className="h-4 w-4" />{t('attendance.roster.details')}
      </NButton>
      {disabled ? <span className="text-xs text-muted-foreground">{t('attendance.roster.markBeforeDetails')}</span> : (
        <>
          {details.arrivalTime && <span className="text-xs font-medium" dir="ltr">{details.arrivalTime}</span>}
          {details.notes && <span className="max-w-48 truncate text-xs text-muted-foreground" title={details.notes}>{details.notes}</span>}
        </>
      )}
    </div>
  );
}
