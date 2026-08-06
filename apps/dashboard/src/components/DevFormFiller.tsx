'use client'

import { useCallback, useEffect } from 'react'
import { useActiveForm } from '@/hooks/useActiveForm'
import { isDevFill } from '@/lib/devFill'

/**
 * Dev-only form filler. Render as a child of an NForm:
 *   <DevFormFiller fill={() => buildFill(mySchema, { classId: classOptions })} />
 *
 * Adds the F8 fill shortcut for form containers such as WizardForm that do not
 * expose NForm's built-in devTools hook.
 *
 * Controlled by NEXT_PUBLIC_FORM_FILL_ENABLED. Set it to false/0/off/no to
 * disable the filler in any environment.
 */
export const DevFormFiller = ({
  fill,
  arrayFields = [],
  handleF8 = false,
}: {
  fill: () => Record<string, any>
  arrayFields?: string[]
  handleF8?: boolean
}) => {
  const form = useActiveForm()

  const run = useCallback(() => {
    try {
      const values = fill()
      form.reset(values)
      arrayFields.forEach((name) => {
        if (Array.isArray(values[name])) {
          form.setValue(name, values[name], {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: false,
          })
        }
      })
    } catch (err) {
      console.error('[DevFormFiller] fill() threw — form not filled:', err)
    }
  }, [arrayFields, form, fill])

  useEffect(() => {
    if (!isDevFill || !handleF8) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'F8') return
      e.preventDefault()
      run()
    }
    // capture phase so input/dialog handlers can't swallow it first
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [handleF8, run])

  return null
}

export default DevFormFiller
