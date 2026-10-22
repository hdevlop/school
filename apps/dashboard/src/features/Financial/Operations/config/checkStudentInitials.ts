/** NAvatar's fallback is literal text, so keep it to two initials. */
export function checkStudentInitials(name?: string | null): string {
  return name?.trim().split(/\s+/).slice(0, 2)
    .map(part => Array.from(part)[0]).join('').toLocaleUpperCase() || '?';
}
