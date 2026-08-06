import 'reflect-metadata';

import { Server } from '@server/najm';
import {
  databaseConfig,
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
} from '@server/config';

import * as modulesModule from '@server/modules';

export {
  databaseConfig,
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
};

export const server = new Server()
  .use(corsConfig())
  .use(databaseConfig())
  .use(i18nConfig())
  .use(validationConfig())
  .use(rateLimitConfig())
  .use(eventsConfig())
  .use(emailConfig())
  .use(authConfig())
  .use(mcpConfig())
  .use(storageConfig())
  .use(ragConfig())
  .use(chatbotConfig())
  .use(studioAssistantConfig())
  .use(ragStudioConfig())
  .base('/api')
  .load(modulesModule);

export default server;
