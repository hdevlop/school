export function landingOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return undefined;
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid NEXT_PUBLIC_APP_URL');
  return new URL(url.origin);
}
