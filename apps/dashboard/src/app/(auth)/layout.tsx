import React from 'react';
import { redirect } from 'next/navigation';
import { serverAuth } from '@/lib/session';
import { AuthFrame } from './AuthFrame';

const AuthLayout = async ({ children }: { readonly children: React.ReactNode }) => {
    // Shares the root layout's resolution for this render rather than repeating
    // the cookie verification and recovery round trip.
    const session = await serverAuth.getSession();

    if (session?.user) {
        redirect('/');
    }

    return <AuthFrame>{children}</AuthFrame>;
};

export default AuthLayout;
