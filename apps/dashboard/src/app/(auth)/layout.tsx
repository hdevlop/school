import React from 'react';
import { redirect } from 'next/navigation';
import { NThemeImage } from 'najm-theme/react';
import { serverAuth } from '@/lib/session';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { ReliableThemeImage } from './ReliableThemeImage';

const AuthLayout = async ({ children }) => {
    // Shares the root layout's resolution for this render rather than repeating
    // the cookie verification and recovery round trip.
    const session = await serverAuth.getSession();

    if (session?.user) {
        redirect('/');
    }

    return (
         <div className='relative flex h-full w-full overflow-hidden'>
            <div className='relative z-10 flex h-full flex-1 flex-col items-center justify-center'>
                <NThemeImage slot="authLogo" className="h-[120px] w-[120px] object-contain" alt="MyScolAI" />
                {children}
                <ForgotPasswordDialog />
                <span className='mt-24 text-muted-foreground'>@2025 all rights reserved</span>
            </div>
            <div className='relative hidden h-full w-1/2 lg:flex'>
                <ReliableThemeImage slot="authHeroImage" alt="" fill className="object-cover" />
            </div>
        </div>
    )
}

export default AuthLayout
