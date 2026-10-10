import { theme, type ThemeAuditSink } from 'najm-theme/server';

import {
  schoolTheme,
  SCHOOL_HERO_MAX_BYTES,
  SCHOOL_LOGO_MAX_BYTES,
} from '@sms/server/theme';
import { isAdministrator } from '../auth';
import { db } from '../database/db';
import { auditLogs } from '../database/schema/coreSchema';

const themeAudit: ThemeAuditSink = {
  async record(event) {
    await db.insert(auditLogs).values({
      userId: event.actorId,
      userRole: event.actorId ? 'authenticated' : 'system',
      action: event.action,
      resource: 'theme',
      resourceId: event.scopeId,
      status: 'success',
      ipAddress: null,
      metadata: {
        ...event.metadata,
        fromRevision: event.fromRevision,
        toRevision: event.toRevision,
        at: event.at,
      },
    });
  },
};

export const themeConfig = () =>
  theme(schoolTheme, {
    basePath: '',
    manage: [isAdministrator()],
    features: { mcp: true },
    limits: {
      logoBytes: SCHOOL_LOGO_MAX_BYTES,
      heroBytes: SCHOOL_HERO_MAX_BYTES,
    },
    audit: themeAudit,
  });
