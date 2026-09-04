'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'
import { AlertCircle, LocateFixed, MapPin } from 'lucide-react'
import { NButton, useDialog } from 'najm-kit'
import { useTranslation } from 'najm-i18n/react'
import { CASABLANCA_CENTER, type LocationValue } from './types'

const libraries: Libraries = ['places']

type Props = {
  initialValue: LocationValue
  title?: string
}

const toPosition = (value: LocationValue) => (
  value.latitude != null && value.longitude != null
    ? { lat: value.latitude, lng: value.longitude }
    : CASABLANCA_CENTER
)

export default function LocationPickerDialog({ initialValue, title }: Props) {
  const { pop } = useDialog()
  const { t, language } = useTranslation()
  const autocompleteHostRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<LocationValue>(initialValue)
  const [isResolving, setIsResolving] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const center = useMemo(() => toPosition(draft), [draft])
  const searchLabel = t('transport.location.search')

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'student-transport-google-maps',
    googleMapsApiKey: apiKey,
    libraries,
    language,
    region: 'MA',
    version: 'beta',
  })

  const resolvePoint = useCallback(async (position: google.maps.LatLngLiteral) => {
    setDraft((current) => ({ ...current, latitude: position.lat, longitude: position.lng }))
    setIsResolving(true)
    try {
      const geocoder = new google.maps.Geocoder()
      const response = await geocoder.geocode({ location: position })
      const result = response.results[0]
      if (result) {
        setDraft({
          address: result.formatted_address,
          placeId: result.place_id,
          latitude: position.lat,
          longitude: position.lng,
        })
      }
    } finally {
      setIsResolving(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !autocompleteHostRef.current) return
    let element: google.maps.places.PlaceAutocompleteElement | null = null
    let disposed = false

    const setup = async () => {
      const places = await google.maps.importLibrary('places') as google.maps.PlacesLibrary
      if (disposed || !autocompleteHostRef.current) return

      const PlaceAutocompleteElement = (places as any).PlaceAutocompleteElement as typeof google.maps.places.PlaceAutocompleteElement
      element = new PlaceAutocompleteElement({
        componentRestrictions: { country: 'ma' },
        locationBias: CASABLANCA_CENTER,
        requestedLanguage: language,
        requestedRegion: 'ma',
      })
      element.className = 'block w-full'
      element.setAttribute('aria-label', searchLabel)
      autocompleteHostRef.current.replaceChildren(element)

      const handleSelection = async (event: Event) => {
        const customEvent = event as any
        const place = customEvent.place ?? customEvent.placePrediction?.toPlace?.()
        if (!place) return
        await place.fetchFields({ fields: ['id', 'formattedAddress', 'location'] })
        const location = place.location
        if (!location) return
        setDraft({
          address: place.formattedAddress || initialValue.address,
          placeId: place.id || null,
          latitude: location.lat(),
          longitude: location.lng(),
        })
      }

      element.addEventListener('gmp-select', handleSelection)
      element.addEventListener('gmp-placeselect', handleSelection)
    }

    void setup()
    return () => {
      disposed = true
      element?.remove()
    }
  }, [initialValue.address, isLoaded, language, searchLabel])

  if (!apiKey || loadError) {
    return (
      <div className="space-y-4 p-1">
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{t('transport.location.unavailableTitle')}</p>
            <p className="mt-1 text-amber-800">{t('transport.location.unavailableDescription')}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <NButton type="button" variant="outline" onClick={() => pop()}>{t('common.cancel')}</NButton>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <div ref={autocompleteHostRef} className="min-h-12 rounded-xl border border-slate-200 bg-white p-1" />
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <LocateFixed className="h-3.5 w-3.5" />
          {t('transport.location.dragHint')}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner">
        {isLoaded ? (
          <GoogleMap
            mapContainerClassName="h-[360px] w-full"
            center={center}
            zoom={draft.latitude != null ? 16 : 12}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              clickableIcons: false,
            }}
            onClick={(event) => {
              if (event.latLng) void resolvePoint(event.latLng.toJSON())
            }}
          >
            <MarkerF
              position={center}
              draggable
              onDragEnd={(event) => {
                if (event.latLng) void resolvePoint(event.latLng.toJSON())
              }}
            />
          </GoogleMap>
        ) : (
          <div className="flex h-[360px] items-center justify-center text-sm text-muted-foreground">
            {t('transport.location.loadingMap')}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title || t('transport.location.selectedLocation')}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {isResolving ? t('transport.location.resolving') : draft.address || t('transport.location.noLocation')}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <NButton type="button" variant="outline" onClick={() => pop()}>{t('common.cancel')}</NButton>
        <NButton
          type="button"
          disabled={!draft.address || draft.latitude == null || draft.longitude == null || isResolving}
          onClick={() => pop(draft)}
        >
          {t('transport.location.confirm')}
        </NButton>
      </div>
    </div>
  )
}
