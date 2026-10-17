'use client'

import { useMemo } from 'react'
import { CalendarX } from 'lucide-react'
import { FormInput, NForm } from 'najm-kit'
import { useTranslation } from 'najm-i18n/react'
import { useDialog } from '@/shared/useDialog'
import { useSchoolFormat, useSchoolToday } from '@/hooks/useSchoolFormat'
import { useViewingYearDate } from '@/features/AcademicYears/hooks/useViewingAcademicYear'
import { createEndDriverAssignmentSchema } from '../config/vehicleSchemas'

/** Ends the vehicle's current driver assignment; its history is kept. */
const EndDriverAssignmentForm = ({ vehicle }) => {
  const { t } = useTranslation()
  const { pop } = useDialog()
  const { displayDateOnly } = useSchoolFormat()
  const [defaultDate] = useViewingYearDate(useSchoolToday())
  const assignmentDate: string = vehicle.activeAssignment.assignmentDate
  const schema = useMemo(() => createEndDriverAssignmentSchema(t, assignmentDate), [t, assignmentDate])

  return (
    <NForm
      id="end-driver-assignment-form"
      schema={schema}
      defaultValues={{ unassignmentDate: defaultDate }}
      onSubmit={({ unassignmentDate }) => pop({ id: vehicle.activeAssignment.id, unassignmentDate })}
    >
      <p className="text-sm text-muted-foreground">
        {t('vehicles.form.drivingSince', { driver: vehicle.driver?.name ?? '', date: displayDateOnly(assignmentDate) })}
      </p>
      <FormInput name="unassignmentDate" type="date" formLabel={t('vehicles.form.endDate')} icon={CalendarX} required />
    </NForm>
  )
}

export default EndDriverAssignmentForm
