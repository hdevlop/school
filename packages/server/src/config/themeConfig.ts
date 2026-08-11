import {
  theme,
  type ThemeAuditSink,
  type ThemeDiagnostic,
} from 'najm-theme/server';

import {
  schoolTheme,
  SCHOOL_HERO_MAX_BYTES,
  SCHOOL_LOGO_MAX_BYTES,
} from '@sms/server/theme';
import { isAdministrator } from '@server/auth';
import { db } from '@server/database/db';
import { auditLogs } from '@server/database/schema/coreSchema';

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

function reportThemeDiagnostic(diagnostic: ThemeDiagnostic): void {
  console.warn(
    `[theme] ${diagnostic.code}${
      diagnostic.scopeId ? ` (scope ${diagnostic.scopeId})` : ''
    }${diagnostic.detail ? `: ${diagnostic.detail}` : ''}`,
    diagnostic.error ?? '',
  );
}

export const themeConfig = () =>
  theme(schoolTheme, {
    basePath: '',
    manage: [isAdministrator()],
    features: { mcp: true },
    limits: {
      logoBytes: SCHOOL_LOGO_MAX_BYTES,
      heroBytes: SCHOOL_HERO_MAX_BYTES,
    },
    storage: { namespace: 'theme-branding' },
    audit: themeAudit,
    diagnostics: reportThemeDiagnostic,
  });
