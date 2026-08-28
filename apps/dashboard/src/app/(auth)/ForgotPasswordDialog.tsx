'use client'

import { Dialog, DialogContent, DialogTitle } from 'najm-kit';import { Label } from 'najm-kit';import { Mail } from 'lucide-react'
import { z } from 'zod'
import { NForm, NButton } from 'najm-kit';
import { FormInput } from 'najm-kit';
import Link from 'next/link'
import { useForgotPasswordStore } from '@/stores/ForgotPasswordStore'
import { auth } from '@/lib/auth'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useLanguage';

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
})

export function ForgotPasswordDialog() {
    const { t } = useTranslation();
    const { isOpen, openDialog, closeDialog } = useForgotPasswordStore()

    const mutation = useMutation({
        mutationFn: (data: { email: string }) => auth.client.forgotPassword(data),
        onSuccess: () => {
            toast.success(t('auth.success.resetLinkSent'))
            closeDialog()
        },
        onError: () => {
            toast.error(t('auth.errors.resetEmailFailed'))
        }
    })

    const handleForgotPassword = async ({ email }: { email: string }) => {
        await mutation.mutateAsync({ email })
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => open ? openDialog() : closeDialog()}>
            <DialogContent className="sm:w-[400px] bg-[url(/images/bgintro.png)] bg-center">
                <DialogTitle className='text-center mb-4'>
                    <span className='text-2xl pb-4 pt-4 text-black [text-shadow:_-1px_-1px_0_white,_1px_-1px_0_white,_-1px_1px_0_white,_1px_1px_0_white] '>Password recovery</span>
                </DialogTitle>
                <NForm
                    id="forgot-password-form"
                    schema={forgotPasswordSchema}
                    onSubmit={handleForgotPassword}
                    defaultValues={{ email: '' }}
                >
                    <FormInput
                        name="email"
                        type="text"
                        formLabel={t('auth.form.email')}
                        placeholder={t('auth.form.emailPlaceholder')}
                        variant="default"
                        icon={Mail}
                        iconColor="black"
                        className="bg-white hover:border-black mb-2 text-black"
                    />
                </NForm>

                <NButton 
                    form='forgot-password-form'
                    type="submit" 
                    className="w-full bg-black hover:bg-secondary text-white cursor-pointer mb-2" 
                    disabled={mutation.isPending} 
                    onClick={(e) => e.stopPropagation()}
                    >{mutation.isPending ? 'Sending...' : 'Send Reset Link'}
                </NButton>

                <Label className='flex w-full text-center text-black'>
                    You don't have an account? <Link href="/register" className='text-white hover:underline ml-1'>Sign Up</Link>
                </Label>
            </DialogContent>
        </Dialog>
    )
}
