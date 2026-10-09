import { envChoice, envString } from '../../../config/env';
import { readSchoolChatControls } from '../transport/schoolChatControls';

export type JevMode = 'off' | 'on';

export function readJevControls() {
  const raw = envString(process.env.CHATBOT_JEV_THRESHOLD);
  const threshold = raw === undefined ? 0.8 : /^\d+(?:\.\d+)?$/u.test(raw) ? Number(raw) : NaN;
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1)
    throw new Error('CHATBOT_JEV_THRESHOLD must be between 0 and 1');
  return {
    mode: envChoice('CHATBOT_JEV_MODE', process.env.CHATBOT_JEV_MODE, ['off', 'on'], 'off'),
    threshold,
  };
}

/** The release switch enables the qualified scope; Jev off retains router fallback. */
export function effectiveJevMode(): JevMode {
  return readSchoolChatControls().enabled ? readJevControls().mode : 'off';
}
