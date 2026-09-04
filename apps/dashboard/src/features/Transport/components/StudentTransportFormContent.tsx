'use client'

import { useEffect, useMemo, useRef } from 'react'
import { FormInput, NFormSectionHeader, NSkeleton } from 'najm-kit'
import { Bus, CalendarDays, CircleAlert, NotebookPen } from 'lucide-react'
import { useActiveForm } from '@/hooks/useActiveForm'
import { useTranslation } from 'najm-i18n/react'
import { useVehicles } from '@/features/Vehicles/hooks/useVehicles'
import { usePublicSettings } from '@/features/Settings/hooks/useSettings'
import { LocationField } from '@/components/location/LocationField'

type Props = {
  form?: any
  feeTypes?: any[]
}

export function StudentTransportFormContent({ form, feeTypes = [] }: Props) {
  const activeForm = useActiveForm(form)
  const { t } = useTranslation()
  const { vehicles = [], isVehiclesLoading } = useVehicles()
  const { publicSettings, isSettingsLoading } = usePublicSettings()
  const defaultsApplied = useRef(false)

  const enabled = Boolean(activeForm.watch('transportEnabled'))
  const selectedVehicleId = activeForm.watch('transportAssignment.vehicleId')
  const studentAddress = activeForm.watch('address')
  const studentPlaceId = activeForm.watch('addressPlaceId')
  const studentLatitude = activeForm.watch('addressLatitude')
  const studentLongitude = activeForm.watch('addressLongitude')
  const enrollmentDate = activeForm.watch('enrollmentDate')

  const activeVehicles = useMemo(() => {
    const uniqueVehicles = new Map<string, any>()
    for (const vehicle of vehicles || []) {
      if (vehicle.status === 'active' && !uniqueVehicles.has(vehicle.id)) {
        uniqueVehicles.set(vehicle.id, vehicle)
      }
    }
    return Array.from(uniqueVehicles.values())
  }, [vehicles])
  const selectedVehicle = activeVehicles.find((vehicle: any) => vehicle.id === selectedVehicleId)
  const transportFeeType = feeTypes.find((feeType: any) => feeType.category === 'transport' && feeType.status === 'active')

  const vehicleOptions = activeVehicles.map((vehicle: any) => {
    const occupied = Number(vehicle.activeStudentCount || 0)
    const capacity = Number(vehicle.capacity || 0)
    const available = Math.max(capacity - occupied, 0)
    const driverName = vehicle.driver?.name || t('transport.form.unassignedDriver')
    return {
      value: vehicle.id,
      label: `${vehicle.name} · ${vehicle.licensePlate} · ${t('transport.form.driver')}: ${driverName} · ${available} ${t('transport.form.seatsAvailable')}`,
      disabled: available <= 0,
    }
  })

  useEffect(() => {
    if (!enabled) {
      defaultsApplied.current = false
      return
    }
    if (defaultsApplied.current || isSettingsLoading) return

    if (!activeForm.getValues('transportAssignment.pickupLocation') && studentAddress) {
      activeForm.setValue('transportAssignment.pickupLocation', studentAddress)
      activeForm.setValue('transportAssignment.pickupPlaceId', studentPlaceId ?? null)
      activeForm.setValue('transportAssignment.pickupLatitude', studentLatitude ?? null)
      activeForm.setValue('transportAssignment.pickupLongitude', studentLongitude ?? null)
    }

    const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings
    if (!activeForm.getValues('transportAssignment.dropoffLocation') && settings?.schoolAddress) {
      activeForm.setValue('transportAssignment.dropoffLocation', settings.schoolAddress)
      activeForm.setValue('transportAssignment.dropoffPlaceId', settings.schoolAddressPlaceId ?? null)
      activeForm.setValue('transportAssignment.dropoffLatitude', settings.schoolAddressLatitude ?? null)
      activeForm.setValue('transportAssignment.dropoffLongitude', settings.schoolAddressLongitude ?? null)
    }
    if (!activeForm.getValues('transportAssignment.assignmentDate')) {
      activeForm.setValue(
        'transportAssignment.assignmentDate',
        enrollmentDate || settings?.businessDate || new Date().toISOString().slice(0, 10),
      )
    }
    defaultsApplied.current = true
  }, [
    activeForm,
    enabled,
    enrollmentDate,
    isSettingsLoading,
    publicSettings,
    studentAddress,
    studentLatitude,
    studentLongitude,
    studentPlaceId,
  ])

  const useHomeAddress = () => {
    activeForm.setValue('transportAssignment.pickupLocation', studentAddress || '', { shouldDirty: true, shouldValidate: true })
    activeForm.setValue('transportAssignment.pickupPlaceId', studentPlaceId ?? null, { shouldDirty: true })
    activeForm.setValue('transportAssignment.pickupLatitude', studentLatitude ?? null, { shouldDirty: true })
    activeForm.setValue('transportAssignment.pickupLongitude', studentLongitude ?? null, { shouldDirty: true })
  }

  return (
    <div className="space-y-4 pb-2">
      <NFormSectionHeader icon={Bus} title={t('transport.form.title')} />

      {enabled ? (
        <>
          <div>
            <p className="mb-3 text-sm text-muted-foreground">{t('transport.form.chooseVehicleHint')}</p>
            {isVehiclesLoading ? (
              <NSkeleton className="h-10 w-full rounded-md" />
            ) : (
              <FormInput
                name="transportAssignment.vehicleId"
                type="combobox"
                formLabel={t('transport.form.vehicle')}
                placeholder={t('transport.form.vehiclePlaceholder')}
                searchPlaceholder={t('transport.form.searchVehicle')}
                emptyMessage={t('transport.form.noVehicles')}
                items={vehicleOptions}
                icon={Bus}
                required
              />
            )}
            {selectedVehicle ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedVehicle.driver?.name || t('transport.form.unassignedDriver')}
                {' · '}
                {Math.max(Number(selectedVehicle.capacity || 0) - Number(selectedVehicle.activeStudentCount || 0), 0)} {t('transport.form.seatsLeft')}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <LocationField
                form={activeForm}
                names={{
                  address: 'transportAssignment.pickupLocation',
                  placeId: 'transportAssignment.pickupPlaceId',
                  latitude: 'transportAssignment.pickupLatitude',
                  longitude: 'transportAssignment.pickupLongitude',
                }}
                label={t('transport.form.pickupLocation')}
                placeholder={t('transport.form.pickupPlaceholder')}
                required
                compact
              />
              <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={useHomeAddress}>
                {t('transport.form.useHomeAddress')}
              </button>
            </div>
            <LocationField
              form={activeForm}
              names={{
                address: 'transportAssignment.dropoffLocation',
                placeId: 'transportAssignment.dropoffPlaceId',
                latitude: 'transportAssignment.dropoffLatitude',
                longitude: 'transportAssignment.dropoffLongitude',
              }}
              label={t('transport.form.dropoffLocation')}
              placeholder={t('transport.form.dropoffPlaceholder')}
              compact
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FormInput name="transportAssignment.assignmentDate" type="date" formLabel={t('transport.form.startDate')} icon={CalendarDays} />
            <FormInput name="transportAssignment.notes" type="text" formLabel={t('transport.form.notes')} placeholder={t('transport.form.notesPlaceholder')} icon={NotebookPen} />
          </div>

          <div className="border-t pt-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-foreground">
              {transportFeeType ? <Bus className="h-4 w-4 text-primary" /> : <CircleAlert className="h-4 w-4 text-destructive" />}
              {t('transport.form.feePreview')}
              {transportFeeType ? (
                <span className="font-semibold text-primary">{Number(transportFeeType.amount).toLocaleString()} MAD</span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {transportFeeType ? t('transport.form.monthlyBilling') : t('transport.form.missingFeeType')}
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t('transport.form.optionalDescription')}</p>
      )}
    </div>
  )
}
