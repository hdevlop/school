import { envChoice, envInt, envString } from '../../config/env';
import { chatBenchmarkControlsEnabled } from './ChatBenchmarkState';
import { readSchoolChatControls } from './schoolChatControls';

export type JevMode = 'off' | 'shadow' | 'on';
function finiteEnv(name: string, raw: string | undefined, fallback: number, min: number, max: number) {
  const text = envString(raw);
  const value = text === undefined ? fallback : /^\d+(?:\.\d+)?$/u.test(text) ? Number(text) : NaN;
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return value;
}

export function readJevControls() {
  const controls = {
    mode: envChoice('CHATBOT_JEV_MODE', process.env.CHATBOT_JEV_MODE, ['off', 'shadow', 'on'], 'off'),
    threshold: finiteEnv('CHATBOT_JEV_THRESHOLD', process.env.CHATBOT_JEV_THRESHOLD, 0.8, 0, 1),
    timeoutMs: envInt('CHATBOT_JEV_TIMEOUT_MS', process.env.CHATBOT_JEV_TIMEOUT_MS, { fallback: 800, min: 1, max: 10_000 }),
    maxRequests: envInt('CHATBOT_JEV_MAX_REQUESTS', process.env.CHATBOT_JEV_MAX_REQUESTS, { fallback: 0, max: 1000 }),
    maxCostUsd: finiteEnv('CHATBOT_JEV_MAX_COST_USD', process.env.CHATBOT_JEV_MAX_COST_USD, 0, 0, 10),
    unknownReserveUsd: finiteEnv('CHATBOT_JEV_UNKNOWN_RESERVE_USD', process.env.CHATBOT_JEV_UNKNOWN_RESERVE_USD, 0.00015, 0.000001, 1),
    billingMode: envChoice('CHATBOT_JEV_BILLING_MODE', process.env.CHATBOT_JEV_BILLING_MODE, ['abort', 'observe'], 'abort'),
    billingTimeoutMs: envInt('CHATBOT_JEV_BILLING_TIMEOUT_MS', process.env.CHATBOT_JEV_BILLING_TIMEOUT_MS, { fallback: 5000, min: 1, max: 10000 }),
  };
  if (controls.billingMode === 'observe' && controls.billingTimeoutMs < controls.timeoutMs)
    throw new Error('CHATBOT_JEV_BILLING_TIMEOUT_MS must cover the candidate deadline');
  return controls;
}

let benchmarkMode: JevMode | undefined;
export function isLocalJevFixtureDatabase(): boolean {
  try {
    const url = new URL(process.env.DB_URL || process.env.DATABASE_URL || '');
    return ['postgres:', 'postgresql:'].includes(url.protocol)
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.pathname === '/school_history_test';
  } catch { return false; }
}
/** Benchmark overrides never enable ordinary chats; the qualified release has
 * its own explicit switch and retains CHATBOT_JEV_MODE=off as a rollback. */
export function effectiveJevMode(): JevMode {
  if (chatBenchmarkControlsEnabled() && isLocalJevFixtureDatabase()) return benchmarkMode ?? readJevControls().mode;
  return readSchoolChatControls().enabled ? readJevControls().mode : 'off';
}
export function setBenchmarkJevMode(mode: JevMode) { benchmarkMode = mode; }
