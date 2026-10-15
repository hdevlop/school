import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/najm.server';
import { SCHOOL_HOME_PATH } from '@/najm.config';
import { AuthFrame } from './AuthFrame';

const AuthLayout = async ({ children }: { readonly children: React.ReactNode }) => {
    // Shares the root layout's resolution for this render rather than repeating
    // the cookie verification and recovery round trip.
    const session = await getSession();

    if (session?.user) {
        redirect(SCHOOL_HOME_PATH);
    }

    return <AuthFrame>{children}</AuthFrame>;
};

export default AuthLayout;
