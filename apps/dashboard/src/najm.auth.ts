import { defineAuth } from 'najm-auth/client/server';

import { schoolApp } from '@/najm.config';

export const auth = defineAuth(schoolApp.auth);
