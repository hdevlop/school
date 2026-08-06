'use client'

import dynamic from 'next/dynamic'
import { MapPinned, Navigation } from 'lucide-react'
import { FormInput, NButton, useDialog } from 'najm-kit'
import { useTranslation } from '@/hooks/useLanguage'
import { useActiveForm } from '@/hooks/useActiveForm'
import type { LocationValue } from './types'

const LocationPickerDialog = dynamic(() => import('./LocationPickerDialog'), { ssr: false })

type LocationFieldNames = {
  address: string
  placeId: string
  latitude: string
  longitude: string
}

type Props = {
  form?: any
  names: LocationFieldNames
  label: string
  placeholder?: string
  required?: boolean
  rows?: number
  compact?: boolean
}

export function LocationField({ form, names, label, placeholder, required, rows = 3, compact = false }: Props) {
  const activeForm = useActiveForm(form)
  const { openDialog } = useDialog()
  const { t } = useTranslation()
  const address = activeForm.watch(names.address) || ''
  const placeId = activeForm.watch(names.placeId) || null
  const latitude = activeForm.watch(names.latitude)
  const longitude = activeForm.watch(names.longitude)
  const visibleRows = compact ? 2 : Math.max(rows, 2)
  const multilineInputHeight = `${visibleRows * 1.5 + 1}rem`

  const chooseOnMap = async () => {
    const result = await openDialog({
      title: t('transport.location.chooseTitle'),
      children: (
        <LocationPickerDialog
          initialValue={{ address, placeId, latitude, longitude }}
          title={label}
        />
      ),
      width: '3xl',
      showButtons: false,
    }) as LocationValue | undefined

    if (!result) return
    activeForm.setValue(names.address, result.address, { shouldDirty: true, shouldValidate: true })
    activeForm.setValue(names.placeId, result.placeId ?? null, { shouldDirty: true })
    activeForm.setValue(names.latitude, result.latitude ?? null, { shouldDirty: true })
    activeForm.setValue(names.longitude, result.longitude ?? null, { shouldDirty: true })
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2 rounded-2xl border border-slate-200 bg-white p-4'}>
      <div className="flex flex-nowrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <FormInput
            name={names.address}
            type={compact ? 'text' : 'textarea'}
            formLabel={label}
            placeholder={placeholder}
            icon={Navigation}
            {...(!compact ? { rows: visibleRows } : {})}
            required={required}
            onChange={() => {
              activeForm.setValue(names.placeId, null, { shouldDirty: true })
              activeForm.setValue(names.latitude, null, { shouldDirty: true })
              activeForm.setValue(names.longitude, null, { shouldDirty: true })
            }}
          />
        </div>
        <NButton
          type="button"
          variant="outline"
          size={compact ? "lg" : undefined}
          className={compact
            ? "!w-10 min-w-10 flex-none p-0"
            : "!w-auto min-w-20 flex-none gap-2 px-3"}
          style={!compact ? { height: multilineInputHeight } : undefined}
          aria-label={t('transport.location.chooseOnMap')}
          title={t('transport.location.chooseOnMap')}
          onClick={chooseOnMap}
        >
          <MapPinned className="h-4 w-4" />
          {!compact ? t('transport.location.map') : null}
        </NButton>
      </div>
      {!compact ? (
        <span className="block text-xs text-muted-foreground">
          {latitude != null && longitude != null
            ? t('transport.location.pinSaved')
            : t('transport.location.manualAllowed')}
        </span>
      ) : null}
    </div>
  )
}
