/** Keep each entity's normal deletion safeguards and report every refusal. */
export async function deleteSelection(ids: string[], remove: (id: string) => Promise<unknown>) {
  const deleted: string[] = [];
  const failed: { id: string; message: string }[] = [];
  for (const id of new Set(ids)) {
    try {
      await remove(id);
      deleted.push(id);
    } catch (error) {
      failed.push({ id, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { deleted, failed };
}
