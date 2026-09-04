// hooks/useEnumOptions.js (or .ts)
import { useMemo } from 'react'
import { useTranslation } from 'najm-i18n/react'
import { ENUMS } from '@/lib/ENUMS'

interface UseEnumOptions {
  customLabels?: Record<string, string>
  filter?: (value: string) => boolean
}

export const useEnum = (enumKey: string, options: UseEnumOptions = {}) => {
  const { t } = useTranslation()
  
  return useMemo(() => {
    const config = ENUMS[enumKey]
    
    if (!config) {
      console.warn(`Enum ${enumKey} not found`)
      return []
    }
    const { values, translationKey, keyMap = {} } = config
    const { customLabels, filter } = options
    
    const enumValues = filter ? values.filter(filter) : values
    
    return enumValues.map(value => ({
      value,
      label: customLabels?.[value] || t(`${translationKey}.${keyMap[value] || value}`)
    }))
  }, [enumKey, t, options])
}