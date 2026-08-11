import { api } from '@/services/http';

export interface CredentialSetupPending {
  nextStep: 'credential_setup';
  setupRequired: true;
  purpose: string;
  expiresAt: string;
}

/**
 * Najm owns the credential-setup flow, its one-time session cookie, and its
 * password policy. School only calls the standard endpoints — no local token or
 * policy is recreated here.
 */
export const credentialSetupApi = {
  getStatus: () => api.get('/auth/credential-setup/setup'),
  changePassword: (data: { newPassword: string }) =>
    api.post('/auth/credential-setup/change', data),
  cancel: () => api.post('/auth/credential-setup/cancel'),
};
