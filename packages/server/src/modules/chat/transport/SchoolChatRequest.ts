import { AsyncLocalStorage } from 'node:async_hooks';
import type { ChatbotContextProvider } from 'najm-chatbot';
import { KnowledgeContextProvider } from 'najm-rag';
import { Service } from '../../../najm';
import { Year } from '../../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../academicYears/AcademicYearValidator';
import { SettingsRepository } from '../../settings/SettingsRepository';
import { schoolClock } from '../../dashboard/teacher/teacherDashboardMetrics';
import { getBusinessDateOverride } from '../../../shared/businessDate';
import { answerLanguageInstruction } from '../replies/schoolAnswerLanguage';
import { schoolDateRanges } from './schoolDateRanges';

export const schoolChatRequest = new AsyncLocalStorage<{ academicYear: string; schoolDate: string }>();

/**
 * Date/year metadata and the answer's language only. Identity and access are
 * resolved by the existing tools. Without the language line OSS20B answered
 * French and English questions in Arabic (5 of 30 real questions, 2026-11-16).
 */
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
      frame ? schoolDateRanges(frame.schoolDate) : null,
      answerLanguageInstruction(userText), knowledge].filter(Boolean).join('\n\n') || null;
  }
  getContextTrace(userText: string) { return this.knowledge.getContextTrace(userText); }
}
