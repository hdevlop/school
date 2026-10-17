'use client'

import { useMemo } from 'react';
import { NForm } from 'najm-kit'
import { useDialog } from '@/shared/useDialog'
import { useTranslation } from 'najm-i18n/react'
import { DynamicArray } from 'najm-kit';

import { ParentFormContent, getParentDefaultValues } from './SimpleParentForm'
import { createParentSchemas } from '../config/parentSchemas'

export const BulkParentFormContent = () => {

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
      addLabel={t('parents.form.addParent')}
      emptyLabel={t('parents.form.noParentsAdded')}
      className="[&>button]:order-first"
    >
      <div className='flex flex-col gap-4'>
      <ParentFormContent />
      </div>
    </DynamicArray>
  )
}

// ==================== MAIN FORM ====================

const BulkParentForm = () => {
  const { t } = useTranslation()
  const parentsSchema = useMemo(() => createParentSchemas(t).parents, [t]);
  const { pop } = useDialog()

  const defaultValues = {
    parents: []
  }
  const handleSubmit = async (data) => {
    pop(data)
  }

  return (
    <NForm
      id='parent-form'
      schema={parentsSchema}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
    >
      <BulkParentFormContent />
    </NForm>
  )
}

export default BulkParentForm
