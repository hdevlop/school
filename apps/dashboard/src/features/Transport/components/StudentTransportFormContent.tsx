'use client'

import { useEffect, useMemo, useRef } from 'react'
import { FormInput, NFormSectionHeader, NSkeleton } from 'najm-kit'
import { FormLocationInput, normalizeLocationValue } from 'najm-kit/location'
import { Bus, CalendarDays, CircleAlert, NotebookPen } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'najm-i18n/react'
import { useVehicles } from '@/features/Vehicles/hooks/useVehicles'
import { usePublicSettings } from '@/features/Settings/hooks/useSettings'
import { useSchoolFormat } from '@/hooks/useSchoolFormat'

type Props = {
  feeTypes?: any[]
}

export function StudentTransportFormContent({ feeTypes = [] }: Props) {
  const form = useFormContext()
  const { t } = useTranslation()
  const { majorMoney } = useSchoolFormat()
  const { vehicles = [], isVehiclesLoading } = useVehicles()
  const { publicSettings, isSettingsLoading } = usePublicSettings()
  const defaultsApplied = useRef(false)

  const enabled = Boolean(useWatch({ name: 'transportEnabled' }))
  const selectedVehicleId = useWatch({ name: 'transportAssignment.vehicleId' })
  const studentAddressLocation = useWatch({ name: 'addressLocation' })
  const studentPlaceId = useWatch({ name: 'addressPlaceId' })
  const pickup = useWatch({ name: 'transportAssignment.pickup' })
  const dropoff = useWatch({ name: 'transportAssignment.dropoff' })
  const pickupPlaceId = useWatch({ name: 'transportAssignment.pickupPlaceId' })
  const dropoffPlaceId = useWatch({ name: 'transportAssignment.dropoffPlaceId' })
  const enrollmentDate = useWatch({ name: 'enrollmentDate' })

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

    if (!form.getValues('transportAssignment.pickup')?.address && studentAddressLocation?.address) {
      form.setValue('transportAssignment.pickup', studentAddressLocation)
      form.setValue('transportAssignment.pickupPlaceId', studentPlaceId ?? null)
    }

    const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings
    if (!form.getValues('transportAssignment.dropoff')?.address && settings?.schoolAddress) {
      form.setValue('transportAssignment.dropoff', normalizeLocationValue({
        address: settings.schoolAddress,
        latitude: settings.schoolAddressLatitude,
        longitude: settings.schoolAddressLongitude,
      }))
      form.setValue('transportAssignment.dropoffPlaceId', settings.schoolAddressPlaceId ?? null)
    }
    if (!form.getValues('transportAssignment.assignmentDate')) {
      form.setValue(
        'transportAssignment.assignmentDate',
        enrollmentDate || settings?.businessDate || new Date().toISOString().slice(0, 10),
      )
    }
    defaultsApplied.current = true
  }, [
    form,
    enabled,
    enrollmentDate,
    isSettingsLoading,
    publicSettings,
    studentAddressLocation,
    studentPlaceId,
  ])

  const useHomeAddress = () => {
    form.setValue('transportAssignment.pickup', studentAddressLocation ?? normalizeLocationValue(), { shouldDirty: true, shouldValidate: true })
    form.setValue('transportAssignment.pickupPlaceId', studentPlaceId ?? null, { shouldDirty: true })
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
              <FormLocationInput
                name="transportAssignment.pickup"
                formLabel={t('transport.form.pickupLocation')}
                placeholder={t('transport.form.pickupPlaceholder')}
                required
                providerMeta={pickup && pickupPlaceId
                  ? { provider: 'google', placeId: pickupPlaceId, ...pickup }
                  : null}
                onProviderMetaChange={(meta) => form.setValue('transportAssignment.pickupPlaceId', meta?.placeId ?? null, { shouldDirty: true })}
              />
              <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={useHomeAddress}>
                {t('transport.form.useHomeAddress')}
              </button>
            </div>
            <FormLocationInput
              name="transportAssignment.dropoff"
              formLabel={t('transport.form.dropoffLocation')}
              placeholder={t('transport.form.dropoffPlaceholder')}
              providerMeta={dropoff && dropoffPlaceId
                ? { provider: 'google', placeId: dropoffPlaceId, ...dropoff }
                : null}
              onProviderMetaChange={(meta) => form.setValue('transportAssignment.dropoffPlaceId', meta?.placeId ?? null, { shouldDirty: true })}
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
                <span className="font-semibold text-primary">{majorMoney(transportFeeType.amount)}</span>
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
