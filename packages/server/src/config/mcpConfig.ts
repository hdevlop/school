import { mcp } from 'najm-mcp';

import { schoolMcpYearHooks } from '../modules/academicYears/requestYear';
import { yearScopedModules } from './yearScope';

export const mcpConfig = () =>
  mcp({
    name: 'sms-mcp',
    version: '1.0.0',
    auth: { type: 'najm-auth' },
    cors: false,
    // Every year-scoped tool group takes the selected academic year; see yearScope.ts.
    ...schoolMcpYearHooks(Object.keys(yearScopedModules)),
  });
