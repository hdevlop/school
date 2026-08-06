export { buildFormFill as buildFill, pick } from '@/fakers/formFill';

const disabledValues = new Set(['0', 'false', 'off', 'no']);

export const isDevFill =
  !disabledValues.has(String(process.env.NEXT_PUBLIC_FORM_FILL_ENABLED ?? 'true').toLowerCase());
