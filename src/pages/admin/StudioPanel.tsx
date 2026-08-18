import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { LoaderCircle, Save, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { useContent, SEASONAL_THEMES, SEASONAL_THEME_LABELS, SEASONAL_THEME_ICONS, type SeasonalTheme } from '../../contexts/ContentContext';
import { useToast } from '../../components/ui/Toast';
import { TextField } from '../../components/ui/Field';
import LoadingState from '../../components/LoadingState';
import type { SettingField } from '../../types';

/**
 * The "Studio" panel for seasonal site theming.
 * Lets the admin pick a theme, set a greeting, and optionally schedule dates.
 */
export default function StudioPanel() {
  const { success, error: toastError } = useToast();
  const { refresh: refreshContent, activeTheme: currentActive } = useContent();

  const load = useCallback(() => api.admin.settings.list(), []);
  const { data: fields, setData, loading, error } = useResource<SettingField[]>(load, []);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [synced, setSynced] = useState<SettingField[]>([]);
  const [saving, setSaving] = useState(false);

  if (synced !== fields) {
    setSynced(fields);
    setDraft(Object.fromEntries(fields.map((f) => [f.key, f.value])));
  }

  if (loading) return <LoadingState label="Opening the studio…" />;
  if (error) return <div className="admin-card" style={{ color: 'var(--gold-deep)' }}>{error}</div>;

  const themeKeys = ['theme.active', 'theme.greeting', 'theme.start_date', 'theme.end_date'];
  const themeValue = (key: string) => draft[key] ?? '';
  const setThemeValue = (key: string, value: string) => setDraft({ ...draft, [key]: value });

  const selectedTheme = (themeValue('theme.active') || 'default') as SeasonalTheme;
  const isDirty = themeKeys.some((key) => {
    const field = fields.find((f) => f.key === key);
    return field && (draft[key] ?? '') !== field.value;
  });

  const save = async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      const changes = Object.fromEntries(
        themeKeys
          .filter((key) => {
            const field = fields.find((f) => f.key === key);
            return field && (draft[key] ?? '') !== field.value;
          })
          .map((key) => [key, draft[key] ?? ''])
      );
      setData(await api.admin.settings.save(changes));
      await refreshContent();
      success('Theme settings saved.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save theme settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="admin-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>Seasonal studio</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
            Change the site's mood for special occasions. The theme adjusts accent colours and adds a greeting.
          </p>
        </div>
        <button onClick={save} disabled={saving || !isDirty} className="btn-primary disabled:opacity-50">
          {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
          {isDirty ? 'Save theme' : 'Saved'}
        </button>
      </div>

      {/* Theme picker */}
      <section className="admin-card">
        <h3 className="font-serif text-lg" style={{ color: 'var(--ink)' }}>Choose a theme</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SEASONAL_THEMES.map((theme) => {
            const isActive = selectedTheme === theme;
            const isLive = theme === currentActive;
            return (
              <motion.button
                key={theme}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setThemeValue('theme.active', theme)}
                className="relative flex flex-col items-center gap-2 rounded-2xl border p-5 text-center transition"
                style={{
                  borderColor: isActive ? 'var(--gold)' : 'var(--border-soft)',
                  background: isActive ? 'var(--gold-pale)' : 'var(--bg)',
                  boxShadow: isActive ? '0 0 0 2px var(--gold)' : 'none',
                }}
              >
                <span className="text-3xl">{SEASONAL_THEME_ICONS[theme]}</span>
                <span className="font-serif text-lg" style={{ color: 'var(--ink)' }}>{SEASONAL_THEME_LABELS[theme]}</span>
                {isLive && theme !== 'default' && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider" style={{ background: 'var(--moss)', color: '#F8F4E9' }}>
                    <Sparkles size={10} /> Live
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Greeting & scheduling */}
      <section className="admin-card grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <TextField
            label="Seasonal greeting"
            value={themeValue('theme.greeting')}
            onChange={(v) => setThemeValue('theme.greeting', v)}
            placeholder="e.g. Merry Christmas! · សួស្ដីឆ្នាំថ្មី · Happy Halloween!"
            hint="Shown as a small banner in the header when a non-default theme is active."
          />
        </div>
        <TextField
          label="Start date (optional)"
          type="date"
          value={themeValue('theme.start_date')}
          onChange={(v) => setThemeValue('theme.start_date', v)}
          hint="Theme auto-activates on this date."
        />
        <TextField
          label="End date (optional)"
          type="date"
          value={themeValue('theme.end_date')}
          onChange={(v) => setThemeValue('theme.end_date', v)}
          hint="Theme auto-deactivates after this date."
        />
      </section>

      {/* Preview info */}
      <section className="admin-card">
        <h3 className="font-serif text-lg" style={{ color: 'var(--ink)' }}>Preview as visitor</h3>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Changes take effect on the public site as soon as you save. Visit the home page in an incognito window to see exactly what visitors see. The theme adjusts accent colours, the hero glow, and adds your greeting — it does not replace the entire layout.
        </p>
      </section>
    </div>
  );
}
