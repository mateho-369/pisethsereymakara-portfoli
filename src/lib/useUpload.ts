import { useCallback, useState } from 'react';
import { api } from './api';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const sizeLabel = (bytes: number) =>
  bytes > 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

/**
 * Shared browser → MinIO upload flow (presign, PUT, progress feedback).
 * Both the gallery manager and the chat composer use this, so the size limit,
 * error copy and progress behaviour can never drift apart.
 */
export function useUpload(kind: 'media' | 'chat') {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('Please choose a file smaller than 4 MB.');
    }

    setUploading(true);
    setProgress(20);
    try {
      setProgress(45);
      const uploaded = await api.uploads.file(file, kind);
      setProgress(100);
      return { ...uploaded, sizeLabel: sizeLabel(file.size), isVideo: file.type.startsWith('video/') };
    } finally {
      window.setTimeout(() => { setUploading(false); setProgress(0); }, 400);
    }
  }, [kind]);

  return { upload, uploading, progress };
}
