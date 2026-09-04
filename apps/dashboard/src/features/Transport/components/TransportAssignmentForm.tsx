'use client'

import { useMemo } from 'react'
import { z } from 'zod'
import { Bus, CalendarDays, NotebookPen } from 'lucide-react'
import { FormInput, NForm, useDialog } from 'najm-kit'
import { LocationField } from '@/components/location/LocationField'
import { useActiveForm } from '@/hooks/useActiveForm'
import { useTranslation } from 'najm-i18n/react'
import { useVehicles } from '@/features/Vehicles/hooks/useVehicles'

const assignmentSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  assignmentDate: z.string().optional().nullable(),
  pickupLocation: z.string().min(1, 'Pickup location is required').max(500),
  pickupPlaceId: z.string().max(255).optional().nullable(),
  pickupLatitude: z.number().min(-90).max(90).optional().nullable(),
  pickupLongitude: z.number().min(-180).max(180).optional().nullable(),
  dropoffLocation: z.string().max(500).optional().nullable(),
  dropoffPlaceId: z.string().max(255).optional().nullable(),
  dropoffLatitude: z.number().min(-90).max(90).optional().nullable(),
  dropoffLongitude: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

type Props = {
  student: any
  assignment?: any
  lockVehicleId?: string
}

function AssignmentFields({ lockVehicleId }: { lockVehicleId?: string }) {
  const form = useActiveForm()
  const { t } = useTranslation()
  const { vehicles = [] } = useVehicles()
  const activeVehicles = useMemo(() => {
    const uniqueVehicles = new Map<string, any>()
    for (const vehicle of vehicles || []) {
      if (vehicle.status === 'active' && !uniqueVehicles.has(vehicle.id)) {
        uniqueVehicles.set(vehicle.id, vehicle)
      }
    }
    return Array.from(uniqueVehicles.values())
  }, [vehicles])
  const options = activeVehicles.map((vehicle: any) => {
    const driverName = vehicle.driver?.name || t('transport.form.unassignedDriver')
    const available = Math.max(Number(vehicle.capacity || 0) - Number(vehicle.activeStudentCount || 0), 0)
    return {
      value: vehicle.id,
      label: `${vehicle.name} · ${vehicle.licensePlate} · ${t('transport.form.driver')}: ${driverName} · ${available} ${t('transport.form.seatsAvailable')}`,
      disabled: !lockVehicleId && Number(vehicle.availableSeats ?? vehicle.capacity) <= 0,
    }
  })

  return (
    <div className="space-y-4">
      <FormInput
        name="vehicleId"
        type="combobox"
        formLabel={t('transport.form.vehicle')}
        placeholder={t('transport.form.vehiclePlaceholder')}
        searchPlaceholder={t('transport.form.searchVehicle')}
        emptyMessage={t('transport.form.noVehicles')}
        items={options}
        icon={Bus}
        disabled={Boolean(lockVehicleId)}
        required
      />
      <div className="grid gap-4 md:grid-cols-2">
        <LocationField
          form={form}
          names={{ address: 'pickupLocation', placeId: 'pickupPlaceId', latitude: 'pickupLatitude', longitude: 'pickupLongitude' }}
          label={t('transport.form.pickupLocation')}
          placeholder={t('transport.form.pickupPlaceholder')}
          required
          compact
        />
        <LocationField
          form={form}
          names={{ address: 'dropoffLocation', placeId: 'dropoffPlaceId', latitude: 'dropoffLatitude', longitude: 'dropoffLongitude' }}
          label={t('transport.form.dropoffLocation')}
          placeholder={t('transport.form.dropoffPlaceholder')}
          compact
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput name="assignmentDate" type="date" formLabel={t('transport.form.startDate')} icon={CalendarDays} />
        <FormInput name="notes" type="textarea" formLabel={t('transport.form.notes')} placeholder={t('transport.form.notesPlaceholder')} icon={NotebookPen} rows={2} />
      </div>
    </div>
  )
}

export function TransportAssignmentForm({ student, assignment, lockVehicleId }: Props) {
  const { pop } = useDialog()
  const defaults = {
    vehicleId: lockVehicleId || assignment?.vehicleId || '',
    assignmentDate: assignment?.assignmentDate || new Date().toISOString().slice(0, 10),
    pickupLocation: assignment?.pickupLocation || student?.address || '',
    pickupPlaceId: assignment?.pickupPlaceId || student?.addressPlaceId || null,
    pickupLatitude: assignment?.pickupLatitude ?? student?.addressLatitude ?? null,
    pickupLongitude: assignment?.pickupLongitude ?? student?.addressLongitude ?? null,
    dropoffLocation: assignment?.dropoffLocation || '',
    dropoffPlaceId: assignment?.dropoffPlaceId || null,
    dropoffLatitude: assignment?.dropoffLatitude ?? null,
    dropoffLongitude: assignment?.dropoffLongitude ?? null,
    notes: assignment?.notes || '',
  }

  return (
    <NForm
      id="student-transport-assignment-form"
      schema={assignmentSchema}
      defaultValues={defaults}
      onSubmit={(data) => pop({ ...data, studentId: student.id })}
    >
      <AssignmentFields lockVehicleId={lockVehicleId} />
    </NForm>
  )
}
