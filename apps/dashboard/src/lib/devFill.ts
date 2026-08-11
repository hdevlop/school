export { buildFormFill as buildFill, pick } from '@/fakers/formFill';

const disabledValues = new Set(['0', 'false', 'off', 'no']);
const enabledValues = new Set(['1', 'true', 'on', 'yes']);

const flag = process.env.NEXT_PUBLIC_FORM_FILL_ENABLED?.trim().toLowerCase();

/**
 * Whether schema-driven form filling (F8) is available.
 *
 * Off in production unless a deployment opts in explicitly. The shortcut writes
 * generated values straight into a real form against a real database, so
 * defaulting it on for every production user was the wrong way round —
 * `NEXT_PUBLIC_FORM_FILL_ENABLED` is inlined into the client bundle at build
 * time, which means a build that does not set it ships no filler at all.
 */
export const isDevFill = flag
  ? enabledValues.has(flag) && !disabledValues.has(flag)
  : process.env.NODE_ENV !== 'production';
