import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { SiteContent } from '../types';

interface ContentValue {
  /** Look up a piece of site copy, falling back to the shipped default. */
  text: (key: string, fallback?: string) => string;
  content: SiteContent;
  ready: boolean;
  refresh: () => Promise<void>;
}

const ContentContext = createContext<ContentValue>({
  text: (_key, fallback = '') => fallback,
  content: {},
  ready: false,
  refresh: async () => undefined,
});

/**
 * Loads every editable string once and shares it with the whole site.
 * Pages ask for copy by key and always pass the original wording as fallback,
 * so nothing ever renders blank while the request is in flight.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>({});
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setContent(await api.content.get());
    } catch {
      setContent({});
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo<ContentValue>(() => ({
    content,
    ready,
    refresh,
    text: (key: string, fallback = '') => {
      const stored = content[key];
      return stored === undefined || stored === '' ? fallback : stored;
    },
  }), [content, ready, refresh]);

  useEffect(() => {
    const title = content['meta.title'];
    if (title) document.title = title;
    const description = content['meta.description'];
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [content]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
