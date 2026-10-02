import { canUseOtherAcademicYears } from '@sms/contracts/academic-years';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { ChatbotContextProvider } from 'najm-chatbot';
import { KnowledgeContextProvider } from 'najm-rag';
import { Service } from '../../najm';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

// Only prompt text is stored here; the shared year boundary remains its source.
export const schoolChatYearContext = new AsyncLocalStorage<string>();

/** Adds validated School context while preserving the existing knowledge provider. */
@Service()
export class SchoolChatContextProvider implements ChatbotContextProvider {
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(private knowledge: KnowledgeContextProvider) {}

  describeYear(role?: string) {
    return [
      `The dashboard's selected academic year is ${this.year.label}.`,
      'Year-scoped tools return records for this selected year. Describe their results as belonging to this year only.',
      'A student admission/enrollmentDate or shared identity is not proof of membership in another academic year.',
      'For the total number of students, use students_get_student_count and report its exact count. Do not estimate totals by counting a long list yourself.',
      canUseOtherAcademicYears(role)
        ? 'If the user asks for another year, ask them to select that year in the dashboard before continuing.'
        : 'This account can access only the active academic year. If the user asks for another year, explain the access restriction and do not query historical records. Never describe this restriction as an empty historical result.',
    ].join('\n');
  }

  async getContext(userText: string) {
    const knowledge = await this.knowledge.getContext(userText);
    return [schoolChatYearContext.getStore(), knowledge].filter(Boolean).join('\n\n') || null;
  }

  getContextTrace(userText: string) {
    return this.knowledge.getContextTrace(userText);
  }
}
