'use client'

import { useMemo } from 'react'
import { z } from 'zod'
import { Bus, CalendarDays, NotebookPen } from 'lucide-react'
import { FormInput, NForm, useDialog } from 'najm-kit'
import { FormLocationInput, normalizeLocationValue } from 'najm-kit/location'
import { locationValueSchema } from '@/lib/validations'
import { useActiveForm } from '@/hooks/useActiveForm'
import { useTranslation } from 'najm-i18n/react'
import { useVehicles } from '@/features/Vehicles/hooks/useVehicles'

const assignmentSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  assignmentDate: z.string().optional().nullable(),
  pickup: locationValueSchema.refine((value) => Boolean(value.address), { path: ['address'], message: 'Pickup location is required' }),
  pickupPlaceId: z.string().max(255).optional().nullable(),
  dropoff: locationValueSchema,
  dropoffPlaceId: z.string().max(255).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})

type Props = {
  student: any
  assignment?: any
  lockVehicleId?: string
}

function AssignmentFields({ lockVehicleId }: { lockVehicleId?: string }) {
  const form = useActiveForm()
  const pickup = form.watch('pickup')
  const dropoff = form.watch('dropoff')
  const pickupPlaceId = form.watch('pickupPlaceId')
  const dropoffPlaceId = form.watch('dropoffPlaceId')
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
        <FormLocationInput
          name="pickup"
          formLabel={t('transport.form.pickupLocation')}
          placeholder={t('transport.form.pickupPlaceholder')}
          required
          providerMeta={pickup && pickupPlaceId
            ? { provider: 'google', placeId: pickupPlaceId, ...pickup }
            : null}
          onProviderMetaChange={(meta) => form.setValue('pickupPlaceId', meta?.placeId ?? null, { shouldDirty: true })}
        />
        <FormLocationInput
          name="dropoff"
          formLabel={t('transport.form.dropoffLocation')}
          placeholder={t('transport.form.dropoffPlaceholder')}
          providerMeta={dropoff && dropoffPlaceId
            ? { provider: 'google', placeId: dropoffPlaceId, ...dropoff }
            : null}
          onProviderMetaChange={(meta) => form.setValue('dropoffPlaceId', meta?.placeId ?? null, { shouldDirty: true })}
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
    pickup: normalizeLocationValue({
      address: assignment?.pickupLocation || student?.address,
      latitude: assignment?.pickupLatitude ?? student?.addressLatitude,
      longitude: assignment?.pickupLongitude ?? student?.addressLongitude,
    }),
    pickupPlaceId: assignment?.pickupPlaceId || student?.addressPlaceId || null,
    dropoff: normalizeLocationValue({
      address: assignment?.dropoffLocation,
      latitude: assignment?.dropoffLatitude,
      longitude: assignment?.dropoffLongitude,
    }),
    dropoffPlaceId: assignment?.dropoffPlaceId || null,
    notes: assignment?.notes || '',
  }

  return (
    <NForm
      id="student-transport-assignment-form"
      schema={assignmentSchema}
      defaultValues={defaults}
      onSubmit={(data) => {
        const { pickup, dropoff, ...fields } = data
        pop({
          ...fields,
          studentId: student.id,
          pickupLocation: pickup.address,
          pickupLatitude: pickup.latitude ?? null,
          pickupLongitude: pickup.longitude ?? null,
          dropoffLocation: dropoff.address,
          dropoffLatitude: dropoff.latitude ?? null,
          dropoffLongitude: dropoff.longitude ?? null,
        })
      }}
    >
      <AssignmentFields lockVehicleId={lockVehicleId} />
    </NForm>
  )
}
