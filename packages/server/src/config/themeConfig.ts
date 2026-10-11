import { theme, type ThemeAuditSink } from 'najm-theme/server';

import {
  schoolTheme,
  SCHOOL_HERO_MAX_BYTES,
  SCHOOL_LOGO_MAX_BYTES,
} from '@sms/server/theme';
import { isAdministrator } from '../auth';
import { db } from '../database/db';
import { auditLogs } from '../database/schema/coreSchema';
import { LANDING_NEWS_FALLBACKS, LANDING_NEWS_SLOTS } from '@sms/contracts';
import { STANDARD_BRANDING_SLOTS, BRANDING_RASTER_MIME_TYPES, type BrandingSlotDefinition } from 'najm-theme/contracts';

export const schoolBrandingSlots: readonly BrandingSlotDefinition[] = [
  ...STANDARD_BRANDING_SLOTS,
  ...['landingHero', 'landingAssistant', 'landingProgram1', 'landingProgram2', 'landingProgram3'].map(key => ({
    key, kind: key === 'landingHero' ? 'hero' as const : 'image' as const,
    labelKey: `theme.branding.slots.${key}`, maxBytes: key === 'landingHero' ? SCHOOL_HERO_MAX_BYTES : SCHOOL_LOGO_MAX_BYTES,
    acceptedMimeTypes: [...BRANDING_RASTER_MIME_TYPES], previewAspect: 'wide' as const,
    fallback: `/images/landing/${key === 'landingHero' ? 'hero' : key === 'landingAssistant' ? 'assistant' : `program-${key.slice(-1)}`}.webp`,
  })),
  ...LANDING_NEWS_SLOTS.map((key, index) => ({
    key, kind: 'image' as const, labelKey: `theme.branding.slots.${key}`, maxBytes: SCHOOL_LOGO_MAX_BYTES,
    acceptedMimeTypes: [...BRANDING_RASTER_MIME_TYPES], previewAspect: 'wide' as const, fallback: LANDING_NEWS_FALLBACKS[index],
  })),
];

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
    brandingSlots: schoolBrandingSlots,
    basePath: '',
    manage: [isAdministrator()],
    features: { mcp: true },
    limits: {
      logoBytes: SCHOOL_LOGO_MAX_BYTES,
      heroBytes: SCHOOL_HERO_MAX_BYTES,
    },
    audit: themeAudit,
  });
