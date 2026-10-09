import { AsyncLocalStorage } from 'node:async_hooks';
import type { ChatbotContextProvider } from 'najm-chatbot';
import { KnowledgeContextProvider } from 'najm-rag';
import { Service } from '../../../najm';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { schoolClock } from '../../dashboard/teacher/teacherDashboardMetrics';
import { getBusinessDateOverride } from '../../../shared/businessDate';

export const schoolChatRequest = new AsyncLocalStorage<{ academicYear: string; schoolDate: string }>();

/** Date/year metadata only. Identity and access are resolved by the existing tools. */
@Service()
export class SchoolChatRequest implements ChatbotContextProvider {
  @Year() private readonly year!: ResolvedAcademicYear;
  constructor(private knowledge: KnowledgeContextProvider, private settings: SettingsRepository) {}

  async snapshot(now = new Date()) {
    const timeZone = (await this.settings.getPublicSettings())?.timeZone || 'UTC';
    return { academicYear: this.year.label, schoolDate: schoolClock(timeZone, now, getBusinessDateOverride()).date };
  }
  async getContext(userText: string) {
    const frame = schoolChatRequest.getStore();
    const knowledge = await this.knowledge.getContext(userText);
    return [frame ? `The selected academic year is ${frame.academicYear}; today is ${frame.schoolDate} in the school's time zone. Use this academicYear for scoped tools. If another year is requested, ask the user to select it in the dashboard first.` : null,
      knowledge].filter(Boolean).join('\n\n') || null;
  }
  getContextTrace(userText: string) { return this.knowledge.getContextTrace(userText); }
}
