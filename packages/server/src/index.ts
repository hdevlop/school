import 'reflect-metadata';

import { Server } from './najm';
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
  guardConfig,
  mcpConfig,
  ragConfig,
  emailConfig,
  chatbotConfig,
  chatYearContextConfig,
  studioAssistantConfig,
  ragStudioConfig,
  themeConfig,
} from './config';

import * as modulesModule from './modules';
import { registerYearPropertyInjector, registerYearRequestScope } from './modules/academicYears/requestYear';
import { yearRequestControllers } from './config/yearScope';
import { registerChatYearContext } from './modules/chat/context/chatYearContext';

export { loadActiveAcademicYearLabel, loadSchoolUiSettings, type SchoolUiSettings } from './uiSettings';

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
  guardConfig,
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
  .use(guardConfig())
  .use(authConfig())
  .use(mcpConfig())
  .use(storageConfig())
  .use(themeConfig())
  .use(ragConfig())
  .use(chatbotConfig())
  .use(chatYearContextConfig())
  .use(studioAssistantConfig())
  .use(ragStudioConfig())
  .base('/api')
  .load(modulesModule);

registerYearPropertyInjector(server.container);
registerYearRequestScope(server.container, yearRequestControllers);
registerChatYearContext(server.container);

export default server;
