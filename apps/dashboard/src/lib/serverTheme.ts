import 'server-only';

import { schoolTheme } from '@sms/server/theme';

const serverTheme = schoolTheme.react({
  getServer: async () => (await import('@sms/server')).server,
  basePath: '/api',
});

export const loadServerTheme = serverTheme.load;
export const loadServerAppearance = serverTheme.loadAppearance;
export const loadServerBranding = serverTheme.loadBranding;
