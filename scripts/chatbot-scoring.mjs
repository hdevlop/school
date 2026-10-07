import { analyzeReplyLanguage } from './chatbot-language.mjs';
import { findWriteClaim, findWritePromise } from './chatbot-claims.mjs';
import { scoreSchoolFacts, validateSchoolFacts } from './chatbot-facts.mjs';
import { scoreEmptyReads } from './chatbot-empty-reads.mjs';

const REPLY_LANGUAGES = { en: 'en', fr: 'fr', es: 'es', ar: 'ar', ary: 'ar' };
const KINDS = new Set(['small-talk', 'single-read', 'multi-read', 'blocked-write']);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNameList = (value) => Array.isArray(value) && value.length > 0
  && value.every((name) => typeof name === 'string' && name.trim());

/** Validate fixtures before signing in or spending provider money. */
export function validateCorpus(corpus) {
  if (!isRecord(corpus) || corpus.role !== 'admin' || typeof corpus.academicYear !== 'string'
    || !/^\d{4}-\d{4}$/.test(corpus.academicYear) || !Array.isArray(corpus.cases) || !corpus.cases.length) {
    throw new Error('Fixture needs role "admin", an academicYear and non-empty cases');
  }
  const ids = new Set();
  for (const item of corpus.cases) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)
      || !Object.hasOwn(REPLY_LANGUAGES, item.language) || typeof item.query !== 'string' || !item.query.trim()
      || !KINDS.has(item.kind)
      || (item.expectedToolGroups !== undefined
        && (!Array.isArray(item.expectedToolGroups) || !item.expectedToolGroups.every(isNameList)))
      || (item.forbiddenSuccessfulTools !== undefined && !isNameList(item.forbiddenSuccessfulTools))
      || (item.kind === 'blocked-write' && !isNameList(item.forbiddenSuccessfulTools))
      || (item.answerFacts !== undefined && !isNameList(item.answerFacts))
      || (item.forbiddenAnswerFacts !== undefined && !isNameList(item.forbiddenAnswerFacts))
      || (item.storedNames !== undefined && !isNameList(item.storedNames))
      || (item.schoolFacts !== undefined && !validateSchoolFacts(item.schoolFacts))
      || (item.emptyResultTools !== undefined && !isNameList(item.emptyResultTools))
      || (item.replyLanguage !== undefined && item.replyLanguage !== null
        && !Object.hasOwn(REPLY_LANGUAGES, item.replyLanguage))
      || (item.expectedToolCalls !== undefined && (!Array.isArray(item.expectedToolCalls)
        || !item.expectedToolCalls.length || !item.expectedToolCalls.every((call) => isRecord(call)
          && isNameList(call.tools) && isRecord(call.arguments))))) {
      throw new Error(`Invalid benchmark fixture: ${item?.id ?? '(no id)'}`);
    }
    ids.add(item.id);
  }
  return ids.size;
}

function normalizeFacts(text) {
  return String(text ?? '').toLowerCase()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

function containsFact(text, fact) {
  const normalized = normalizeFacts(fact);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (/^\d+$/.test(normalized)) {
    // A grouped or decimal number (1,100 / 100.5) is not the count 100.
    const separator = '[.,٬٫\\u00a0\\u202f]';
    return new RegExp(`(?<![\\p{L}\\p{N}]|\\d${separator})${escaped}(?![\\p{L}\\p{N}]|${separator}\\d)`, 'u').test(text);
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'u').test(text);
}

// Fixture arguments are a subset: incidental pagination is allowed, but an ID,
// date or search value the fixture requires must be exactly correct.
function matchesArguments(actual, expected) {
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length
      && expected.every((value, index) => matchesArguments(actual[index], value));
  }
  if (isRecord(expected)) {
    return isRecord(actual) && Object.entries(expected)
      .every(([key, value]) => Object.hasOwn(actual, key) && matchesArguments(actual[key], value));
  }
  return actual === expected;
}

/** Scores in-memory text/arguments; failure details contain no argument values. */
export function scoreReply(item, parsed, server) {
  const outputs = parsed.tools.filter((tool) => tool.outcome === 'output');
  const called = new Set(outputs.map((tool) => tool.name));
  const missingToolGroups = (item.expectedToolGroups ?? []).filter((group) => !group.some((name) => called.has(name)));
  const missingToolCalls = (item.expectedToolCalls ?? []).flatMap((call, index) =>
    outputs.some((tool) => call.tools.includes(tool.name) && matchesArguments(tool.arguments, call.arguments)) ? [] : [index]);
  const forbidden = (name) => item.forbiddenSuccessfulTools?.includes(name) ?? false;
  const forbiddenToolOutputs = server
    ? server.tools.filter((tool) => forbidden(tool.name) && tool.outcome === 'executed').map((tool) => tool.name)
    : outputs.filter((tool) => forbidden(tool.name)).map((tool) => tool.name);
  const text = normalizeFacts(parsed.text);
  const missingFacts = (item.answerFacts ?? []).filter((fact) => !containsFact(text, fact));
  // Report fixture indices rather than private facts (e.g. a forbidden phone).
  const forbiddenFacts = (item.forbiddenAnswerFacts ?? []).flatMap((fact, index) => containsFact(text, fact) ? [index] : []);
  const expectedLanguage = Object.hasOwn(item, 'replyLanguage') && item.replyLanguage === null
    ? null : item.replyLanguage ?? item.language;
  const languageCheck = analyzeReplyLanguage(parsed.text, { storedNames: item.storedNames ?? [], expectedLanguage });
  const replyLanguage = languageCheck.language;
  const schoolFacts = scoreSchoolFacts(parsed.text, item.schoolFacts);
  const emptyReads = scoreEmptyReads(item, parsed, server);
  const facts = { factFailures: [...schoolFacts.factFailures, ...emptyReads.failures],
    factReviewRequired: schoolFacts.factReviewRequired || emptyReads.reviewRequired };
  const wrongLanguage = expectedLanguage !== null && replyLanguage !== null && replyLanguage !== REPLY_LANGUAGES[expectedLanguage];
  const languageInconclusive = expectedLanguage !== null && replyLanguage === null;
  const writeClaim = item.kind === 'blocked-write' ? findWriteClaim(parsed.text) : null;
  const writePromise = findWritePromise(parsed.text);
  return {
    missingToolGroups, missingToolCalls, forbiddenToolOutputs,
    blockedTools: server ? server.tools.filter((tool) => tool.outcome === 'blocked').map((tool) => tool.name) : null,
    forbiddenCheckSource: server ? 'server' : 'stream',
    missingFacts, forbiddenFacts, replyLanguage, wrongLanguage, languageInconclusive,
    ...facts, mixedLanguage: expectedLanguage !== null && languageCheck.mixedLanguage,
    wrongRegister: languageCheck.wrongRegister, replyRegister: languageCheck.register,
    writeClaim, writePromise,
    reviewRequired: languageInconclusive || facts.factReviewRequired || (!server && (item.forbiddenSuccessfulTools?.length ?? 0) > 0),
    passed: missingToolGroups.length === 0 && missingToolCalls.length === 0 && forbiddenToolOutputs.length === 0
      && missingFacts.length === 0 && forbiddenFacts.length === 0 && !wrongLanguage && !languageInconclusive
      && facts.factFailures.length === 0 && !facts.factReviewRequired
      && (expectedLanguage === null || !languageCheck.mixedLanguage) && !languageCheck.wrongRegister
      && writeClaim === null && writePromise === null
      && ((server !== null && server !== undefined) || !item.forbiddenSuccessfulTools?.length),
  };
}
