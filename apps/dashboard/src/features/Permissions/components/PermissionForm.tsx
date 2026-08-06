'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import React from 'react'
import { Tag, FileText, Boxes, Zap } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { permissionValidationSchema } from '../config/permissionsValidateSchema'
import { buildFill, isDevFill } from '@/lib/devFill'
import { DevFormFiller } from '@/components/DevFormFiller'
import { useTranslation } from '@/hooks/useLanguage'

const PermissionForm = ({ permission = null, mode = 'create' }) => {

    const { t } = useTranslation();
    const { pop } = useDialog();

    const isUpdateMode = mode === 'update' || permission !== null;
    const schema = permissionValidationSchema(t);

    const defaultValues = {
        id: permission?.id || '',
        name: permission?.name || '',
        resource: permission?.resource || '',
        action: permission?.action || '',
        description: permission?.description || '',
    }

    const handleSubmit = async (permissionData) => {
        const finalData = {
            ...permissionData,
            ...(isUpdateMode && {
                id: permission?.id,
            })
        };
        pop(finalData);
    }

    return (
        <div className='flex flex-col justify-center items-center w-full'>
            <div className='flex flex-col h-full w-full gap-4'>
                <NForm
                    id='permission-form'
                    schema={schema}
                    defaultValues={defaultValues}
                    onSubmit={handleSubmit}
                    devTools={{ enabled: isDevFill, fill: () => buildFill(schema) }}
                >
                    <DevFormFiller fill={() => buildFill(schema)} />
                    <FormInput
                        name='name'
                        type='text'
                        formLabel={t('permissions.form.name')}
                        placeholder={t('permissions.form.namePlaceholder')}
                        variant='default'
                        icon={Tag}
                    />

                    <div className='grid grid-cols-2 gap-3'>
                        <FormInput
                            name='resource'
                            type='text'
                            formLabel={t('permissions.form.resource')}
                            placeholder={t('permissions.form.resourcePlaceholder')}
                            variant='default'
                            icon={Boxes}
                        />
                        <FormInput
                            name='action'
                            type='text'
                            formLabel={t('permissions.form.action')}
                            placeholder={t('permissions.form.actionPlaceholder')}
                            variant='default'
                            icon={Zap}
                        />
                    </div>

                    <FormInput
                        name='description'
                        type='textarea'
                        formLabel={t('permissions.form.description')}
                        placeholder={t('permissions.form.descriptionPlaceholder')}
                        variant='default'
                        icon={FileText}
                    />
                </NForm>
            </div>
        </div>
    )
}

export default PermissionForm
