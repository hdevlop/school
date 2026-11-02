'use client'

import { AvatarFormInput, NForm } from 'najm-kit'
import { formatStatusLabel } from 'najm-kit/format'
import { FormInput } from 'najm-kit';
import React from 'react'
import { Mail, User, Shield } from 'lucide-react'
import { useDialog } from '@/shared/useDialog'
import { usersValidationSchema, updateUsersValidationSchema } from '../config/usersValidateSchema'
import { useRoles } from '@/features/Roles/hooks/useRoles'
import { useTranslation } from 'najm-i18n/react'

const UserForm = ({ user = null, mode = 'create' }) => {

   const { t, language } = useTranslation();
   const { pop } = useDialog();
   const { roles } = useRoles();

   const isUpdateMode = mode === 'update' || user !== null;
   const schema = isUpdateMode ? updateUsersValidationSchema(t) : usersValidationSchema(t);

   const defaultValues = {
      id: user?.id || null,
      name: user?.name || '',
      email: user?.email || '',
      image: user?.image || null,
      roleId: user?.roleId || '',
      ...(isUpdateMode && { status: user?.status ?? 'active' }),
   }

   const roleOptions = roles?.map(role => ({
      value: role.id,
      label: role.name
   })) || []

   // The photo is saved by its own request, so it is sent only when it changed.
   const handleSubmit = async (values: Record<string, unknown>) => {
      const { image, ...userData } = values;
      pop(isUpdateMode && image !== defaultValues.image ? { ...userData, image } : userData);
   }

   return (
      <div className='flex flex-col  justify-center items-center w-full mt-4'>

         <div className='flex flex-col h-full w-full gap-4'>
            <NForm
               id='user-form'
               schema={schema}
               defaultValues={defaultValues}
               onSubmit={handleSubmit}
            >
               <FormInput
                  name='name'
                  type='text'
                  formLabel={t('users.form.fullName')}
                  placeholder={t('users.form.fullNamePlaceholder')}
                  variant='default'
                  icon={User}
                  required={true}
               />

               <FormInput
                  name='email'
                  type='text'
                  formLabel={t('users.form.email')}
                  placeholder={t('users.form.emailPlaceholder')}
                  variant='default'
                  icon={Mail}
                  required={true}
               />

               {isUpdateMode && (
                  <AvatarFormInput
                     name='image'
                     formLabel={t('users.form.image')}
                     radius='xl'
                     allowClear
                  />
               )}

               {/* No password field, on create or on edit. An admin typing a
                   password here would be a second recovery path with no audit,
                   no forced replacement and no session revocation — exactly what
                   the Reset access action in the row menu exists to provide. */}

               <FormInput
                  name='roleId'
                  type='select'
                  formLabel={t('users.form.userRole')}
                  variant='default'
                  icon={Shield}
                  items={roleOptions}
               />

               {isUpdateMode && (
                  <FormInput
                     name='status'
                     type='select'
                     formLabel={t('users.table.status')}
                     items={['active', 'inactive', 'pending'].map(value => ({
                        value,
                        label: formatStatusLabel(value, { t, language }),
                     }))}
                     required
                  />
               )}

            </NForm>

         </div>
      </div>
   )
}

export default UserForm
