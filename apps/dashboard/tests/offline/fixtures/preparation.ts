// The install suite's page imports School's preparation as the app runs it.
import { prepareShell, registerShell } from 'najm-offline/pwa';
import { OFFLINE_NAMESPACE } from '@sms/contracts/offline';

export const prepareSchoolShell = (version: string, operation: () => Promise<void>, signal: AbortSignal) =>
  prepareShell(OFFLINE_NAMESPACE, version, operation, signal);
export const registerSchoolShell = registerShell;
