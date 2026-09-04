'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import React from 'react'
import { Tag, FileText } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { roleValidationSchema } from '../config/rolesValidateSchema'
import { buildFill, isDevFill } from '@/lib/devFill'
import { useTranslation } from 'najm-i18n/react'

const RoleForm = ({ role = null, mode = 'create' }) => {

    const { t } = useTranslation();
    const { pop } = useDialog();
    
    const isUpdateMode = mode === 'update' || role !== null;
    const schema = roleValidationSchema(t);

    const defaultValues = {
        id: role?.id || '',
        name: role?.name || '',
        description: role?.description || '',
    }

    const handleSubmit = async (roleData) => {
        const finalData = {
            ...roleData,
            ...(isUpdateMode && {
                id: role?.id,
            })
        };
        pop(finalData);
    }

    return (
        <div className='flex flex-col justify-center items-center w-full'>

            <div className='flex flex-col h-full w-full gap-4'>
                <NForm
                    id='role-form'
                    schema={schema}
                    defaultValues={defaultValues}
                    onSubmit={handleSubmit}
                    devTools={{ enabled: isDevFill, fill: () => buildFill(schema) }}
                >
                    <FormInput
                        name='name'
                        type='text'
                        formLabel={t('roles.form.name')}
                        placeholder={t('roles.form.namePlaceholder')}
                        variant='default'
                        icon={Tag}
                    />

                    <FormInput
                        name='description'
                        type='textarea'
                        formLabel={t('roles.form.description')}
                        placeholder={t('roles.form.descriptionPlaceholder')}
                        variant='default'
                        icon={FileText}
                    />

                </NForm>

            </div>
        </div>
    )
}

export default RoleForm