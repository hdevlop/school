'use client'
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHomeworkAttachmentBlobApi } from '@/services/homeworkApi';

/**
 * One stored file of a homework as a local URL the page can show or open.
 * The file is private, so it is fetched with the session rather than linked;
 * the URL lives as long as the component that asked for it.
 */
export function useHomeworkAttachment(homeworkId: string, attachmentId: string, enabled = true) {
  const { data: blob, isLoading, isError } = useQuery({
    queryKey: ['homework-attachment', homeworkId, attachmentId],
    queryFn: () => getHomeworkAttachmentBlobApi(homeworkId, attachmentId),
    enabled,
    // A stored file never changes: its name is the hash of its bytes.
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;
    const created = URL.createObjectURL(blob);
    setUrl(created);
    return () => {
      URL.revokeObjectURL(created);
      setUrl(null);
    };
  }, [blob]);

  return { url, isLoading: enabled && (isLoading || (!!blob && !url)), isError };
}
