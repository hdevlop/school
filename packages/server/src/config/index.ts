import { cors } from 'najm-cors';
import { i18n } from 'najm-i18n';
import { events } from 'najm-event';
import { validation } from 'najm-validation';
import { rateLimit } from 'najm-rate';
import { database } from 'najm-database';
import { storage } from 'najm-storage';
import { FileCategory } from 'najm-storage';
import { mcp } from 'najm-mcp';
import { email } from 'najm-email';
import { chatbot } from 'najm-chatbot';
import { studioAssistant } from 'najm-chatbot/studio-assistant';
import { rag, ragStudio } from 'najm-rag';
import type { NajmPlugin } from 'najm-core';

import translations from '@server/locales';
import { db } from '@server/database/db';
import { auth, isAuth } from '@server/auth';

const defaultChatbotSystemPrompt = `You are a helpful AI assistant for a School Management System dashboard.
You have access to tools to manage students, classes, sections, subjects, teachers, parents, fees, fee types, payments, allocations, attendance, grades, assessments, exams, and more.
Today's date is ${new Date().toISOString().slice(0, 10)}.

# CRITICAL RULE: NEVER INVENT IDS
IDs are random short strings (nanoid). You cannot guess them. Before calling any *_create or *_update tool that references another entity, you MUST first call the matching *_list or *_get_* tool and pick a real ID from the response. Never reuse an ID from earlier in the conversation without re-verifying it still exists. If the user gives a name instead of an ID, resolve the name to an ID via a list tool first.

# REQUIRED LOOKUPS BEFORE EACH CREATE
- students_create: classes_get_classes to pick classId, then classes_get_class_sections with that classId to pick sectionId. If linking parents, call parents_get_parents first.
- teachers_create: classes_get_classes for classId, classes_get_class_sections for sectionIds, and subjects_get_subjects for subjectIds.
- parents_create: parents do not require other entities to exist. To link a student after creation, call students_get_students first, then the parent-link tool with the real studentId.
- sections_create: classes_get_classes for classId.
- attendance, grades, assessments, and exams: resolve studentId, classId, sectionId, subjectId, and teacherId via matching list tools first.
- allocations_create and payments_create: students_get_students plus fee_types_get_fee_types or fees_get_fees first.
- fees_create: fee_types_get_fee_types first.

# GENERAL RULES
- If a list tool returns an empty array, tell the user the prerequisite is missing instead of guessing.
- If a create tool returns a not-found error, do not retry with a different guess. Re-list that entity, show the user what is available, and ask which one to use.
- Summarize results in plain language. Show names, not raw IDs, unless the user asks for IDs.
- Ask the user for any required field you cannot resolve, such as emails, names, codes, amounts, or dates. Do not fabricate them.`;

export const emailConfig = () =>
  email({
    provider: { provider: (process.env.EMAIL_PROVIDER as any) || 'console' },
    defaultFrom: process.env.EMAIL_DEFAULT_FROM || 'noreply@sms.local',
  });

export const databaseConfig = () =>
  database({
    default: db,
  });

export const authConfig = () =>
  auth({
    dialect: 'pg',
    encryptionKey: process.env.NAJM_ENCRYPTION_KEY,
  });

export const validationConfig = () => validation();
export const rateLimitConfig = () => rateLimit();
export const eventsConfig = () => events();

export const corsConfig = () =>
  cors({
    origin: [
      process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'http://localhost:4100',
      'app://-',
    ],
    credentials: true,
  });

export const i18nConfig = () =>
  i18n({
    translations,
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'fr', 'ar', 'es'],
  });

export const mcpConfig = () =>
  mcp({
    name: 'sms-mcp',
    version: '1.0.0',
    path: '/mcp',
    cors: true,
  });

export const ragConfig = (): NajmPlugin =>
  rag({
    dialect: 'pg',
    embedding: {
      provider: 'ollama',
      baseUrl: process.env.RAG_EMBEDDING_BASE_URL || 'http://127.0.0.1:11434',
      model: process.env.RAG_EMBEDDING_MODEL || 'embeddinggemma',
      dimensions: Number(process.env.RAG_EMBEDDING_DIMENSIONS || 768),
      timeoutMs: Number(process.env.RAG_EMBEDDING_TIMEOUT_MS || 60_000),
    },
    toolRouting: { enabled: true },
    knowledge: true,
    allowedLangs: ['en', 'fr', 'ar', 'es'],
  }) as unknown as NajmPlugin;

export const chatbotConfig = () =>
  chatbot({
    dialect: 'pg',
    defaultSystemPrompt: defaultChatbotSystemPrompt,
    maxSteps: 10,
    conversationStore: 'db',
  });

export const studioAssistantConfig = () => studioAssistant();

export const ragStudioConfig = () => ragStudio({ auth: 'standalone' });

export const storageConfig = () =>
  storage({
    provider: 'local',
    basePath: 'storage',
    servePrefix: '/api',
    maxFileSize: 10 * 1024 * 1024,
    allowedCategories: [FileCategory.IMAGE, FileCategory.PDF, FileCategory.DOCUMENT],
    enableCascadeDelete: true,
    mcp: true,
    guards: [isAuth()],
  });
