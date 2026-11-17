import { cors } from 'najm-cors';
import { database } from 'najm-database';
import { events } from 'najm-event';
import { i18n } from 'najm-i18n';
import { validation } from 'najm-validation';

import { LANGUAGE_HEADER, schoolI18n } from '@sms/contracts/locales';
import { db } from '../database/db';
import { env } from '../env';
import { createValidationErrorFormatter } from './validationMessages';

/** Plugins with no School policy beyond what is written here. */

export const databaseConfig = () => database({ default: db });

// A refused request answers in the request's language; see validationMessages.ts.
export const validationConfig = () => validation({ errorFormatter: createValidationErrorFormatter() });

export const eventsConfig = () => events();

export const corsConfig = () =>
  cors({
    origin: [
      env.app.corsOrigin,
      'http://localhost:4100',
      'app://-',
    ],
    credentials: true,
  });

// The dashboard names its interface language in LANGUAGE_HEADER, and the
// server preset reads it first: header, then cookie, then `?lang=`, with no
// cookie written back. najm-i18n's default order read its own `language`
// cookie first and cached the first language it guessed, so a French page got
// English refusals.
export const i18nConfig = () =>
  i18n({
    ...schoolI18n.options,
    server: { languageHeader: LANGUAGE_HEADER },
  });
