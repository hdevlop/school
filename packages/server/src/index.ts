import 'reflect-metadata';

import { schoolServer } from './config/server';
import * as modulesModule from './modules';
import { registerYearPropertyInjector, registerYearRequestScope } from './modules/academicYears/requestYear';
import { yearRequestControllers } from './config/yearScope';
import { registerSchoolChatRequest } from './modules/chat/transport/registerSchoolChatRequest';
import { bindJevToolReranker } from './modules/chat/jev/JevToolReranker';
import { assertServerEnv } from './env';

export { loadActiveAcademicYearLabel, loadOwnSidebarOrder, loadSchoolUiSettings, type SchoolUiSettings } from './uiSettings';
export { loadSchoolLandingProfile, loadLandingCycles, loadSchoolLandingContent } from './landing';

// Every malformed environment variable, listed at once, before any plugin reads one.
assertServerEnv();

export const server = schoolServer().load(modulesModule);

registerYearPropertyInjector(server.container);
registerYearRequestScope(server.container, yearRequestControllers);
registerSchoolChatRequest(server.container);
bindJevToolReranker(server.container);

export default server;
