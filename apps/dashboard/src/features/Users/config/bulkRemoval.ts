/** A bulk cleanup must keep the login that is carrying out the requests. */
export function removableUserIds(ids: readonly string[], currentUserId: string): string[] {
  return [...new Set(ids)].filter(id => id !== currentUserId);
}
