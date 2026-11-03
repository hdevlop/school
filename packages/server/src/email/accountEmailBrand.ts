import { readFileSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { schoolTheme } from '../theme';

export const ACCOUNT_EMAIL_APP_NAME = 'École';

/** Shared with Najm's invitation renderer and School's outgoing account-mail layout. */
export const accountEmailTheme = {
  pageBackground: '#f3f6fb', border: '#dbe4f3', headerBackground: '#1e3a5f', headerText: '#ffffff',
  eyebrow: '#ffb3ba', accent: '#cc434d', button: '#cc434d', buttonText: '#ffffff',
  ink: '#14284d', text: '#41506b', muted: '#6b7790', link: '#1e3a5f',
  panelBackground: '#eef3fb', panelTitle: '#1e3a5f', panelText: '#52607a',
  noteBackground: '#fff1f2', noteText: '#7a2f35', logoBackground: '#ffffff', logoHeight: 40,
};

export function accountEmailLogo() {
  const logo = schoolTheme.asset('authLogo');
  return logo ? {
    alt: ACCOUNT_EMAIL_APP_NAME, contentBase64: readFileSync(logo.sourcePath).toString('base64'),
    contentType: logo.mimeType, filename: logo.fileName,
  } : undefined;
}

type AccountEmailLogo = NonNullable<ReturnType<typeof accountEmailLogo>>;
let deliveryLogo: { key: string; value: Promise<AccountEmailLogo> } | undefined;

/** Keep the full-resolution branding asset for print; attach only an email thumbnail. */
export async function accountEmailDeliveryLogo(): Promise<AccountEmailLogo | undefined> {
  const logo = schoolTheme.asset('authLogo');
  if (!logo) return undefined;
  const file = statSync(logo.sourcePath);
  const key = `${logo.sourcePath}:${file.mtimeMs}:${file.size}`;
  if (deliveryLogo?.key === key) return deliveryLogo.value;

  const value = sharp(logo.sourcePath)
    .rotate()
    .resize({ width: 160, height: 160, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, colours: 128 })
    .toBuffer()
    .then(buffer => ({ alt: ACCOUNT_EMAIL_APP_NAME, contentBase64: buffer.toString('base64'),
      contentType: 'image/png', filename: 'school-email-logo.png' }))
    .catch(error => {
      if (deliveryLogo?.key === key) deliveryLogo = undefined;
      throw error;
    });
  deliveryLogo = { key, value };
  return value;
}
