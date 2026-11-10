'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { NForm, NButton, FormInput } from 'najm-kit'
import { Award, BookOpen, GraduationCap, IdCard, Loader2, Mail, MapPin, Phone, Send, User, UserRound } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'najm-i18n/react'
import { buildGenderOptions } from '@/features/Teachers/config/teacherOptions'
import { createTeacherRequestSchema, type TeacherRequestFormValues } from '@/features/Teachers/config/teacherSchemas'
import { createTeacherRequestApi } from '@/services/teacherRequestApi'
import { AuthHeading } from '../AuthHeading'
import { authErrorMessage } from '../authMessages'

/**
 * A teacher's request to join the school. Sending it creates no account: the
 * request waits on the Teachers page, and approving it creates the teacher and
 * the invitation that lets them sign in with Google under this address.
 */
const Register = () => {
  const { t } = useTranslation()
  const schema = useMemo(() => createTeacherRequestSchema(t), [t])
  const genderOptions = useMemo(() => buildGenderOptions(t), [t])
  const [received, setReceived] = useState(false)

  const mutation = useMutation({
    mutationFn: createTeacherRequestApi,
    onSuccess: () => setReceived(true),
    onError: (error) => {
      toast.error(authErrorMessage(error, t, 'teacherRequests.form.failed'))
    },
  })

  if (received) {
    return (
      <div className='flex w-full flex-col'>
        <AuthHeading title={t('teacherRequests.form.receivedTitle')} subtitle={t('teacherRequests.form.receivedBody')} />
        <Link href='/login' className='text-center text-sm font-medium text-tertiary hover:underline'>
          {t('auth.page.signIn')}
        </Link>
      </div>
    )
  }

  return (
    <div className='flex w-full flex-col'>
      <AuthHeading
        title={t('auth.page.registerTitle')}
        subtitle={t('auth.page.registerSubtitle')}
      />

      <div className='flex w-full flex-col gap-2'>
        <NForm
          id='register-form'
          schema={schema}
          defaultValues={{ name: '', email: '', phone: '', cin: '', address: '', specialization: '', yearsOfExperience: '', academicDegrees: '', website: '' }}
          onSubmit={(values: TeacherRequestFormValues) => mutation.mutateAsync(values).catch(() => undefined)}
        >
          <FormInput name='name' type='text' formLabel={t('teachers.form.fullName')} placeholder={t('teachers.form.fullNamePlaceholder')} variant='default' icon={User} required />
          <FormInput name='email' type='text' autoComplete='email' formLabel={t('teacherRequests.form.gmail')} placeholder={t('teacherRequests.form.gmailPlaceholder')} variant='default' icon={Mail} required />
          <FormInput name='phone' type='phone' formLabel={t('teachers.form.phone')} placeholder={t('teachers.form.phonePlaceholder')} variant='default' icon={Phone} defaultCountry='ma' required />
          <FormInput name='cin' type='text' formLabel={t('teachers.form.cin')} placeholder={t('teachers.form.cinPlaceholder')} variant='default' icon={IdCard} required />
          <FormInput name='address' type='textarea' formLabel={t('teachers.form.address')} placeholder={t('teachers.form.addressPlaceholder')} variant='default' icon={MapPin} required />
          <FormInput name='specialization' type='text' formLabel={t('teachers.form.specialization')} placeholder={t('teachers.form.specializationPlaceholder')} variant='default' icon={BookOpen} />
          <div className='grid grid-cols-2 gap-3'>
            <FormInput name='gender' type='select' formLabel={t('teachers.form.gender')} items={genderOptions} variant='default' icon={UserRound} />
            <FormInput name='yearsOfExperience' type='number' formLabel={t('teachers.form.yearsOfExperience')} variant='default' icon={Award} />
          </div>
          <FormInput name='academicDegrees' type='text' formLabel={t('teachers.form.academicDegrees')} variant='default' icon={GraduationCap} />
          {/* Hidden from people: a robot that fills it in is ignored by the server. */}
          <div className='sr-only' aria-hidden='true'>
            <FormInput name='website' type='text' formLabel={t('visitRequests.form.website')} tabIndex={-1} autoComplete='off' />
          </div>
        </NForm>

        <NButton
          type='submit'
          form='register-form'
          className='w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 disabled:bg-primary/45 disabled:text-primary-foreground/80 disabled:opacity-100 disabled:cursor-not-allowed [&_svg]:size-5'
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className='animate-spin' />
              {t('auth.page.registerPending')}
            </>
          ) : (
            <>
              <Send />
              {t('auth.page.registerSubmit')}
            </>
          )}
        </NButton>

        <p className='mt-4 text-center text-sm text-muted-foreground'>
          {t('auth.page.haveAccount')}{' '}
          <Link href='/login' className='font-medium text-tertiary hover:underline'>
            {t('auth.page.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
