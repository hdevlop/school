export interface DeleteSelectionProgress {
  total: number;
  processed: number;
  deleted: number;
  failed: number;
}

/** Keep each entity's normal deletion safeguards and report every refusal. */
export async function deleteSelection(
  ids: string[],
  remove: (id: string) => Promise<unknown>,
  onProgress?: (progress: DeleteSelectionProgress) => void,
) {
  const deleted: string[] = [];
  const failed: { id: string; message: string }[] = [];
  const uniqueIds = [...new Set(ids)];
  const reportProgress = () => onProgress?.({
    total: uniqueIds.length,
    processed: deleted.length + failed.length,
    deleted: deleted.length,
    failed: failed.length,
  });
  reportProgress();
  for (const id of uniqueIds) {
    try {
      await remove(id);
      deleted.push(id);
    } catch (error) {
      failed.push({ id, message: error instanceof Error ? error.message : String(error) });
    }
    reportProgress();
  }
  return { deleted, failed };
}
