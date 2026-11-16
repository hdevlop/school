import type { NajmPlugin } from 'najm-core';
import { envChoice, envFlag, envInt, envString } from 'najm-core/env';
import { rag, ragStudio } from 'najm-rag';

import { rewriteDarijaForRouting } from '../modules/chat/routing/darijaRouting';
import { schoolRoutingContext } from '../modules/chat/routing/schoolRoutingContext';
import { seedSemantics } from '../modules/chat/routing/seedSemantics';

/**
 * Embeddings for chat tool routing and the knowledge base.
 *
 *   RAG_EMBEDDING_PROVIDER              ollama | openai-compatible (default ollama)
 *   RAG_EMBEDDING_MODEL                 default embeddinggemma
 *   RAG_EMBEDDING_BASE_URL              default per provider, below
 *   RAG_EMBEDDING_API_KEY
 *   RAG_EMBEDDING_DIMENSIONS            default 768
 *   RAG_EMBEDDING_TRUNCATE_DIMENSIONS   true to cut longer vectors to DIMENSIONS
 *   RAG_EMBEDDING_BATCH_SIZE            default 4
 *   RAG_EMBEDDING_TIMEOUT_MS            indexing, default 60000
 *   RAG_EMBEDDING_QUERY_TIMEOUT_MS      one chat question, default 5000
 *   RAG_EMBEDDING_QUERY_COOLDOWN_MS     skip the provider after a failure, default 30000
 *   RAG_EMBEDDING_QUERY_PREFIX          default per model, below;
 *   RAG_EMBEDDING_DOCUMENT_PREFIX       set to an empty value for none
 */

const EMBEDDING_PROVIDERS = ['ollama', 'openai-compatible'] as const;
type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];

interface EmbeddingDefaults {
  queryPrefix: string;
  documentPrefix: string;
  /** Tool routing threshold for this model; unset keeps najm-rag's. */
  similarityThreshold?: number;
}

const PROVIDER_BASE_URLS: Record<EmbeddingProvider, string> = {
  ollama: 'http://127.0.0.1:11434',
  'openai-compatible': 'http://127.0.0.1:18080/v1',
};

// Prompts for models najm-rag has no preset for. EmbeddingGemma is left out on
// purpose: with neither prefix set, najm-rag applies its retrieval prompts and
// the 0.35 threshold measured with them. Setting a prefix, even to '', keeps
// the 0.45 default threshold, which is too strict for prompted scores.
const MODEL_DEFAULTS: Record<string, EmbeddingDefaults> = {
  'qwen3-embedding': {
    queryPrefix:
      'Instruct: Retrieve the school management tool that fulfills the user request.\nQuery: ',
    documentPrefix: '',
    // Qwen scores unrelated tools around 0.6-0.7, so najm-rag's 0.45 default
    // offered tools to every greeting. Measured 2026-11-15 on 787 held-out
    // School messages (fr, ar, Darija, Arabizi): small talk given tools 84 of
    // 84 -> 18 of 84; right tool given 91% -> 92%; requests with no tool 0% -> 2%.
    similarityThreshold: 0.68,
  },
};

// A named student is found with search. The full student list is not a
// dependency: when search found nothing, the model read all of it (112k
// characters, about 50k tokens) looking for the name. Class-wide work still
// reaches section and class student tools through routing.
const TOOL_DEPENDENCIES: Record<string, string[]> = {
  'student-profile_get_academic': ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children', 'student-profile_get_overview', 'student-profile_get_attendance_summary'],
  'student-profile_get_overview': ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children', 'student-profile_get_academic', 'student-profile_get_attendance_summary'],
  'student-profile_get_attendance_summary': ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children', 'student-profile_get_academic'],
  'parents_get_my_identity': ['parents_get_children'],
  'parents_get_children': ['parents_get_my_identity', 'student-profile_get_academic'],
  // Family reads take the signed-in parent's or a child's ID, so the model
  // needs the identity reads that return it.
  'parent-profile_get_all_fees_due': ['parents_get_my_identity'],
  'parent-profile_get_unread_alerts': ['parents_get_my_identity'],
  'parent-profile_get_all_upcoming_events': ['parents_get_my_identity'],
  homework_get_by_student: ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children'],
  'student-profile_get_financial': ['students_get_my_identity', 'parents_get_my_identity', 'parents_get_children'],
  'students_get_my_identity': ['student-profile_get_overview', 'student-profile_get_academic', 'student-profile_get_attendance_summary'],
  'teachers_get_my_identity': ['teacher-profile_get_my_classes', 'teacher-profile_get_my_students', 'teacher-profile_get_pending_grading'],
  'teacher-profile_get_pending_grading': ['teachers_get_my_identity'],
  'teacher-profile_get_schedule_today': ['teachers_get_my_identity', 'teacher-profile_get_pending_grading'],
  'teacher-profile_get_my_students': ['teachers_get_my_identity', 'teacher-profile_get_my_classes', 'teacher-profile_get_pending_grading'],
  'teacher-profile_get_my_classes': ['teachers_get_my_identity', 'teacher-profile_get_my_students', 'teacher-profile_get_pending_grading'],

  // Subject-filtered teacher replies join scoped assignment IDs to the catalog.
  teachers_get_teachers: ['subjects_get_subjects'],
  attendance_mark: ['search_search_students'],
  grades_get_student_report: ['search_search_students'],
  grades_get_by_student: ['search_search_students', 'student-profile_get_academic', 'student-profile_get_attendance_summary'],
  grades_create: ['search_search_students', 'assessments_get_all'],
  attendance_get_by_student: ['search_search_students'],
  // "Yesterday" or "last Monday" routes like "today"; the date tool answers it.
  attendance_get_today_students: ['attendance_get_by_date'],
  attendance_get_today_all: ['attendance_get_by_date'],
  attendance_get_by_date: ['attendance_get_all'],
  // Class lists include section names; section discovery must offer that read.
  sections_get_sections: ['classes_get_classes'],
  sections_get_students: ['classes_get_classes', 'sections_get_sections', 'students_get_students'],
  classes_get_class_students: ['classes_get_classes', 'sections_get_sections', 'students_get_students'],
  classes_get_class_student_count: ['classes_get_classes'],
  grades_get_by_section: ['classes_get_classes', 'sections_get_sections', 'subjects_get_subjects', 'grades_get_all'],
  grades_get_by_subject: ['classes_get_classes', 'subjects_get_subjects', 'grades_get_all'],
  grades_get_all: ['classes_get_classes', 'sections_get_sections', 'subjects_get_subjects'],
  exams_get_upcoming_exams: ['exams_get_all'],
  // "This month" may retrieve today's exam tool; the list is needed to
  // apply a different date window without guessing teacher/class IDs.
  exams_get_today_exams: ['exams_get_all', 'exams_get_upcoming_exams'],
  fees_get_student_fees: ['search_search_students'],
  payments_get_by_student: ['search_search_students'],
  students_get_student_parents: ['search_search_students'],
  'student-routes_get_by_student': ['search_search_students'],
  'student-profile_get_transport': ['search_search_students', 'students_get_my_identity', 'parents_get_my_identity', 'parents_get_children'],
  // Personal records share vocabulary ("my record", "this year"). A grade
  // question can retrieve the attendance profile first; keep the academic
  // read available so the model can answer the requested part of the record.
  // Teaching assignments can retrieve a section or personal dashboard read.
  // The profile read takes the signed-in teacherId and checks ownership.
  sections_get_teachers: ['teacher-profile_get_my_classes'],
  'teacher-dashboard_get_overview': ['teacher-profile_get_my_classes', 'teacher-profile_get_pending_grading'],
};

function resolveEmbeddingConfig() {
  const provider = envChoice(
    'RAG_EMBEDDING_PROVIDER',
    process.env.RAG_EMBEDDING_PROVIDER,
    EMBEDDING_PROVIDERS,
    'ollama',
  );
  const model = envString(process.env.RAG_EMBEDDING_MODEL) ?? 'embeddinggemma';
  const defaults: Partial<EmbeddingDefaults> = MODEL_DEFAULTS[model] ?? {};

  return {
    provider,
    model,
    baseUrl: envString(process.env.RAG_EMBEDDING_BASE_URL) ?? PROVIDER_BASE_URLS[provider],
    apiKey: process.env.RAG_EMBEDDING_API_KEY,
    dimensions: envInt('RAG_EMBEDDING_DIMENSIONS', process.env.RAG_EMBEDDING_DIMENSIONS, {
      fallback: 768,
      min: 1,
    }),
    truncateDimensions: envFlag(process.env.RAG_EMBEDDING_TRUNCATE_DIMENSIONS),
    batchSize: envInt('RAG_EMBEDDING_BATCH_SIZE', process.env.RAG_EMBEDDING_BATCH_SIZE, {
      fallback: 4,
      min: 1,
    }),
    // Indexing batches take up to ~15 s on a CPU model; a chat question takes
    // 0.1-2 s. Questions get their own bound, and after a timeout or refused
    // connection skip the provider for a while instead of each waiting again.
    timeoutMs: envInt('RAG_EMBEDDING_TIMEOUT_MS', process.env.RAG_EMBEDDING_TIMEOUT_MS, {
      fallback: 60_000,
      min: 1,
    }),
    queryTimeoutMs: envInt(
      'RAG_EMBEDDING_QUERY_TIMEOUT_MS',
      process.env.RAG_EMBEDDING_QUERY_TIMEOUT_MS,
      { fallback: 5_000, min: 1 },
    ),
    queryFailureCooldownMs: envInt(
      'RAG_EMBEDDING_QUERY_COOLDOWN_MS',
      process.env.RAG_EMBEDDING_QUERY_COOLDOWN_MS,
      { fallback: 30_000 },
    ),
    // Read raw: an empty prefix is a deliberate setting, not "unset".
    queryPrefix: process.env.RAG_EMBEDDING_QUERY_PREFIX ?? defaults.queryPrefix,
    documentPrefix: process.env.RAG_EMBEDDING_DOCUMENT_PREFIX ?? defaults.documentPrefix,
  };
}

export const ragConfig = (): NajmPlugin => {
  const embedding = resolveEmbeddingConfig();
  return rag({
    dialect: 'pg',
    embedding,
    toolRouting: {
      enabled: true,
      similarityThreshold: MODEL_DEFAULTS[embedding.model]?.similarityThreshold,
      // When routing fails, answer without tools and say the data is
      // unreachable (najm-chatbot's notice) rather than send all ~430 tools,
      // about 51k tokens on every step.
      fallbackOnRouterError: 'none',
      dependencies: TOOL_DEPENDENCIES,
    },
    // Darija words become MSA before tool routing embeds a message; the model
    // still reads the user's own words.
    // Stored phrases go through this same rewrite, hint lines included (no
    // rewriteRoutingPhrase). Embedding phrases with the Darija rewrite alone
    // was measured 2026-11-16 on 120 fixture questions: the right tool ranked
    // first fell from 45 to 37 of 82, none improved. Phrase and message must
    // carry the same hints to stay comparable.
    rewriteRoutingQuery: query => schoolRoutingContext(query, rewriteDarijaForRouting(query)),
    // School's routing phrases (semantics.json and the per-feature files in
    // routing/semantics/): those not stored yet are added after boot tool
    // indexing; studio edits stay. Edit the files to change one for good.
    seedSemantics,
    knowledge: true,
    allowedLangs: ['en', 'fr', 'ar', 'es'],
  }) as unknown as NajmPlugin;
};

// najm-rag 2.1.2 makes the Studio Assistant opt-in; School registers studioAssistant().
// The dashboard's /rag-studio page sends the signed-in admin's own token.
export const ragStudioConfig = () => ragStudio({ auth: 'session', assistant: true });
