// hooks/useImage.ts

/**
 * Returns true for storage serve paths: /api/{namespace}/files/serve/{filePath}
 * These are managed files uploaded via najm-storage.
 */
function isStorageServePath(path: string): boolean {
  return /^\/api\/[^/]+\/files\/serve\/.+/.test(path);
}

interface UseImageOptions {
  version?: string | number | null;
}

export function useImage(filePath: string | null | undefined, options?: UseImageOptions) {
  if (!filePath) {
    return { url: null, isReady: false };
  }

  // Storage serve path — add ?v= cache-buster if version provided
  if (isStorageServePath(filePath)) {
    const url = options?.version
      ? `${filePath}?v=${options.version}`
      : filePath;
    return { url, isReady: true };
  }

  // Public/static asset — return as-is
  return { url: filePath, isReady: true };
}
