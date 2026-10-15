export function landingOrigin() {
  // Read at request time so the tested image can serve either installation.
  const raw = process.env.FRONTEND_URL?.trim();
  if (!raw) return undefined;
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid FRONTEND_URL');
  return new URL(url.origin);
}
