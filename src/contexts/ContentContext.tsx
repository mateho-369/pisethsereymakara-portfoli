import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { isParticleIntensity, type ParticleIntensity } from '../lib/particlePresets';
import type { SiteContent } from '../types';

export const SEASONAL_THEMES = ['default', 'christmas', 'halloween', 'khmer-new-year', 'pchum-ben', 'bon-om-touk'] as const;
export type SeasonalTheme = typeof SEASONAL_THEMES[number];

export const SEASONAL_THEME_LABELS: Record<SeasonalTheme, string> = {
  'default': 'Default',
  'christmas': 'Christmas',
  'halloween': 'Halloween',
  'khmer-new-year': 'Khmer New Year',
  'pchum-ben': 'Pchum Ben',
  'bon-om-touk': 'Bon Om Touk',
};

export const SEASONAL_THEME_ICONS: Record<SeasonalTheme, string> = {
  'default': '☀️',
  'christmas': '🎄',
  'halloween': '🎃',
  'khmer-new-year': '🌸',
  'pchum-ben': '🕯️',
  'bon-om-touk': '🚣',
};

interface ContentValue {
  /** Look up a piece of site copy, falling back to the shipped default. */
  text: (key: string, fallback?: string) => string;
  content: SiteContent;
  ready: boolean;
  refresh: () => Promise<void>;
  activeTheme: SeasonalTheme;
  seasonalGreeting: string;
  /** Whether the ambient particle layer should render for the active theme. */
  particlesEnabled: boolean;
  /** How dense that layer is — scales every preset's particle count. */
  particleIntensity: ParticleIntensity;
}

const ContentContext = createContext<ContentValue>({
  text: (_key, fallback = '') => fallback,
  content: {},
  ready: false,
  refresh: async () => undefined,
  activeTheme: 'default',
  seasonalGreeting: '',
  particlesEnabled: true,
  particleIntensity: 'normal',
});

/**
 * Determine the effective seasonal theme, considering scheduled dates.
 */
function resolveTheme(content: SiteContent): SeasonalTheme {
  const raw = content['theme.active'] || 'default';
  const theme = SEASONAL_THEMES.includes(raw as SeasonalTheme) ? raw as SeasonalTheme : 'default';

  if (theme === 'default') return 'default';

  // Check scheduling
  const start = content['theme.start_date'];
  const end = content['theme.end_date'];
  const now = new Date();

  if (start) {
    const startDate = new Date(start);
    if (!isNaN(startDate.getTime()) && now < startDate) return 'default';
  }
  if (end) {
    const endDate = new Date(end);
    if (!isNaN(endDate.getTime()) && now > endDate) return 'default';
  }

  return theme;
}

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

  // Gentle polling: refresh content every 60 seconds so visitors see admin edits
  // without a manual browser refresh. Low frequency to stay kind to the server.
  useEffect(() => {
    let interval: number | undefined;
    const start = () => { if (document.visibilityState !== 'hidden') interval = window.setInterval(refresh, 60_000); };
    const stop = () => { if (interval) window.clearInterval(interval); interval = undefined; };
    const onVisibility = () => { stop(); if (document.visibilityState !== 'hidden') { refresh(); start(); } };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [refresh]);

  const activeTheme = useMemo(() => resolveTheme(content), [content]);
  const seasonalGreeting = content['theme.greeting'] || '';

  // Particles ride alongside the theme settings: same storage, same save button.
  // Opt-out rather than opt-in, so a theme looks complete the moment it's picked.
  const particlesEnabled = (content['theme.particles'] ?? 'on') !== 'off';
  const rawIntensity = content['theme.particle_intensity'] || 'normal';
  const particleIntensity: ParticleIntensity = isParticleIntensity(rawIntensity) ? rawIntensity : 'normal';

  // Apply the seasonal theme class to the root element
  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    for (const t of SEASONAL_THEMES) {
      if (t !== 'default') root.classList.remove(`theme-${t}`);
    }
    // Add the active theme class
    if (activeTheme !== 'default') {
      root.classList.add(`theme-${activeTheme}`);
    }
  }, [activeTheme]);

  const value = useMemo<ContentValue>(() => ({
    content,
    ready,
    refresh,
    activeTheme,
    seasonalGreeting,
    particlesEnabled,
    particleIntensity,
    text: (key: string, fallback = '') => {
      const stored = content[key];
      return stored === undefined || stored === '' ? fallback : stored;
    },
  }), [content, ready, refresh, activeTheme, seasonalGreeting, particlesEnabled, particleIntensity]);

  useEffect(() => {
    const title = content['meta.title'];
    if (title) document.title = title;
    const description = content['meta.description'];
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [content]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
