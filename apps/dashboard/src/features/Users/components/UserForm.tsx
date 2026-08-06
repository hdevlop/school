'use client'

import { NForm } from 'najm-kit'
import { FormInput } from 'najm-kit';
import React from 'react'
import { Mail, Lock, User, Shield } from 'lucide-react'
import { useDialog } from 'najm-kit'
import { usersValidationSchema, updateUsersValidationSchema } from '../config/usersValidateSchema'
import { buildFill, isDevFill } from '@/lib/devFill'
import { DevFormFiller } from '@/components/DevFormFiller'
import { useRoles } from '@/features/Roles/hooks/useRoles'
import { useTranslation } from '@/hooks/useLanguage'

const UserForm = ({ user = null, mode = 'create' }) => {

   const { t } = useTranslation();
   const { pop } = useDialog();
   const { roles } = useRoles();

   const isUpdateMode = mode === 'update' || user !== null;
   const schema = isUpdateMode ? updateUsersValidationSchema(t) : usersValidationSchema(t);

   const defaultValues = {
      id: user?.id || null,
      name: user?.name || '',
      email: user?.email || '',
      password: null,
      confirmPassword: null,
      image: user?.image || null,
      roleId: user?.roleId || '',
   }

   const roleOptions = roles?.map(role => ({
      value: role.id,
      label: role.name
   })) || []

   const handleSubmit = async (userData) => {
      pop(userData);
   }

   return (
      <div className='flex flex-col  justify-center items-center w-full mt-4'>

         <div className='flex flex-col h-full w-full gap-4'>
            <NForm
               id='user-form'
               schema={schema}
               defaultValues={defaultValues}
               onSubmit={handleSubmit}
               devTools={{ enabled: isDevFill, fill: () => buildFill(schema, { roleId: roleOptions }) }}
            >
               <DevFormFiller fill={() => buildFill(schema, { roleId: roleOptions })} />
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
                  <FormInput
                     name='image'
                     type='file'
                     formLabel={t('users.form.image')}
                     variant='default'
                     icon={User}
                  />
               )}

               {/* Password is only set by the admin when editing. On create the
                   user receives an invite link and chooses their own. */}
               {isUpdateMode && (
                  <>
                     <FormInput
                        name='password'
                        type='password'
                        formLabel={t('users.form.newPassword')}
                        placeholder={t('users.form.passwordPlaceholder')}
                        variant='default'
                        icon={Lock}
                     />

                     <FormInput
                        name='confirmPassword'
                        type='password'
                        formLabel={t('users.form.confirmPassword')}
                        placeholder={t('users.form.confirmPasswordPlaceholder')}
                        variant='default'
                        icon={Lock}
                     />
                  </>
               )}

               <FormInput
                  name='roleId'
                  type='select'
                  formLabel={t('users.form.userRole')}
                  variant='default'
                  icon={Shield}
                  items={roleOptions}
               />

               {!isUpdateMode && (
                  <p className='text-sm text-muted-foreground'>
                     An invitation email will be sent so this user can set their own password.
                  </p>
               )}

            </NForm>

         </div>
      </div>
   )
}

export default UserForm