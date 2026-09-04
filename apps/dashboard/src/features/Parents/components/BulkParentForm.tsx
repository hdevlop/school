'use client'

import { NForm, useNForm } from 'najm-kit'
import { useDialog } from 'najm-kit'
import { useTranslation } from 'najm-i18n/react'
import { DynamicArray } from 'najm-kit';

import { ParentFormContent, getParentDefaultValues } from './SimpleParentForm'
import { parentsSchema } from '@/lib/validations'

export const BulkParentFormContent = ({ form = null }: { form?: any } = {}) => {

  const { t } = useTranslation()

  const handleAddParent = (append) => {
    append({
      ...getParentDefaultValues(),
      gender: 'F',
      relationshipType: 'mother',
    })
  }

  return (
    <DynamicArray
      name="parents"
      title={t('parents.form.parent')}
      onAdd={handleAddParent}
      addLabel={t('common.addItem')}
      emptyLabel={t('common.noItemsAdded')}
      className="[&>button]:order-first"
    >
      <div className='flex flex-col gap-4'>
      <ParentFormContent form={form} />
      </div>
    </DynamicArray>
  )
}

// ==================== MAIN FORM ====================

const BulkParentForm = () => {
  const { pop } = useDialog()

  const defaultValues = {
    parents: []
  }
  const form = useNForm({
    schema: parentsSchema,
    defaultValues,
  })

  const handleSubmit = async (data) => {
    pop(data)
  }

  return (
    <NForm
      id='parent-form'
      schema={parentsSchema}
      defaultValues={defaultValues}
      form={form}
      onSubmit={handleSubmit}
    >
      <BulkParentFormContent form={form} />
    </NForm>
  )
}

export default BulkParentForm
