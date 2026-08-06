'use client'

import { useFormContext, type FieldValues, type UseFormReturn } from 'react-hook-form'

export function useActiveForm<T extends FieldValues>(form?: UseFormReturn<T> | null): UseFormReturn<T> {
  const contextForm = useFormContext<T>()
  const activeForm = (form ?? contextForm) as UseFormReturn<T> | null

  if (!activeForm) {
    throw new Error(
      'useActiveForm must be called inside an NForm/WizardForm context or receive a form prop.'
    )
  }

  return activeForm
}
