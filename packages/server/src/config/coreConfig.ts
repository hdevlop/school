import { cors } from 'najm-cors';
import { database } from 'najm-database';
import { events } from 'najm-event';
import { i18n } from 'najm-i18n';
import { validation } from 'najm-validation';

import { LANGUAGE_HEADER, schoolI18n } from '@sms/contracts/locales';
import { db } from '../database/db';
import { envString } from './env';

/**
 * Plugins with no School policy beyond what is written here.
 *
 *   CORS_ORIGIN           the dashboard's origin; falls back to NEXT_PUBLIC_APP_URL
 *   NEXT_PUBLIC_APP_URL   then http://localhost:3000
 */

export const databaseConfig = () => database({ default: db });

export const validationConfig = () => validation();

export const eventsConfig = () => events();

export const corsConfig = () =>
  cors({
    origin: [
      envString(process.env.CORS_ORIGIN) ??
        envString(process.env.NEXT_PUBLIC_APP_URL) ??
        'http://localhost:3000',
      'http://localhost:4100',
      'app://-',
    ],
    credentials: true,
  });

// The dashboard names its interface language in LANGUAGE_HEADER; that comes
// first. najm-i18n's default order read its own `language` cookie first, and
// its cookie cache pinned that cookie to the first language it guessed, so a
// French page got English refusals. Without the header (MCP, scripts) the
// cookie and `?lang=` still apply, and nothing is written back.
export const i18nConfig = () =>
  i18n({
    ...schoolI18n.options,
    order: ['header', 'cookie', 'querystring'],
    lookupFromHeaderKey: LANGUAGE_HEADER,
    caches: [],
  });
