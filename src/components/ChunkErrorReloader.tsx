'use client';

import { useEffect } from 'react';

const RELOAD_FLAG_KEY = 'roleon_chunk_reload_attempted';

function isChunkLoadError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

function handleChunkError(message: string | undefined) {
  if (!isChunkLoadError(message)) return;

  const alreadyTried = sessionStorage.getItem(RELOAD_FLAG_KEY);
  if (alreadyTried) return;

  sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
  window.location.reload();
}

export default function ChunkErrorReloader() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      handleChunkError(event.message);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error ? event.reason.message : String(event.reason);
      handleChunkError(message);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
