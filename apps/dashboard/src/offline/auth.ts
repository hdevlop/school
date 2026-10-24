// Neutral entry only: no fabricated user, JWT or authenticated session.
import { createAuthClient } from 'najm-auth/client';
import { schoolApp } from '@/najm.config';
const client = createAuthClient({ baseURL: schoolApp.auth.apiBaseURL, authPrefix: schoolApp.auth.authPrefix, tabSync: false });
export const auth = { client, api: client.api };
