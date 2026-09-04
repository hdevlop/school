import 'reflect-metadata';

import { Server } from '@server/najm';
import {
  databaseConfig,
  cacheConfig,
  authConfig,
  corsConfig,
  i18nConfig,
  eventsConfig,
  validationConfig,
  rateLimitConfig,
  storageConfig,
  mcpConfig,
  ragConfig,
  emailConfig,
  chatbotConfig,
  studioAssistantConfig,
  ragStudioConfig,
  themeConfig,
} from '@server/config';

import * as modulesModule from '@server/modules';

export { loadSchoolUiSettings, type SchoolUiSettings } from '@server/uiSettings';

export {
  databaseConfig,
  cacheConfig,
  authConfig,
  corsConfig,
  i18nConfig,
  eventsConfig,
  validationConfig,
  rateLimitConfig,
  storageConfig,
  mcpConfig,
  ragConfig,
  emailConfig,
  chatbotConfig,
  studioAssistantConfig,
  ragStudioConfig,
  themeConfig,
};

export const server = new Server()
  .use(corsConfig())
  .use(databaseConfig())
  .use(cacheConfig())
  .use(i18nConfig())
  .use(validationConfig())
  .use(rateLimitConfig())
  .use(eventsConfig())
  .use(emailConfig())
  .use(authConfig())
  .use(mcpConfig())
  .use(storageConfig())
  .use(themeConfig())
  .use(ragConfig())
  .use(chatbotConfig())
  .use(studioAssistantConfig())
  .use(ragStudioConfig())
  .base('/api')
  .load(modulesModule);

export default server;
