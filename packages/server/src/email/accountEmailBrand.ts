import { readFileSync } from 'node:fs';
import { schoolTheme } from '../theme';

export const ACCOUNT_EMAIL_APP_NAME = 'MyScolAI';

/** Shared with Najm's invitation renderer and School's outgoing account-mail layout. */
export const accountEmailTheme = {
  pageBackground: '#f3f6fb', border: '#dbe4f3', headerBackground: '#1e3a5f', headerText: '#ffffff',
  eyebrow: '#ffb3ba', accent: '#cc434d', button: '#cc434d', buttonText: '#ffffff',
  ink: '#14284d', text: '#41506b', muted: '#6b7790', link: '#1e3a5f',
  panelBackground: '#eef3fb', panelTitle: '#1e3a5f', panelText: '#52607a',
  noteBackground: '#fff1f2', noteText: '#7a2f35', logoBackground: '#ffffff', logoHeight: 72,
};

export function accountEmailLogo() {
  const logo = schoolTheme.asset('authLogo');
  return logo ? {
    alt: ACCOUNT_EMAIL_APP_NAME, contentBase64: readFileSync(logo.sourcePath).toString('base64'),
    contentType: logo.mimeType, filename: logo.fileName,
  } : undefined;
}
