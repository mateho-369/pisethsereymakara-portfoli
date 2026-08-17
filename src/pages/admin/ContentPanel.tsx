import { useCallback, useMemo, useState } from 'react';
import { LoaderCircle, RotateCcw, Save, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { useContent } from '../../contexts/ContentContext';
import { useToast } from '../../components/ui/Toast';
import { TextField } from '../../components/ui/Field';
import LoadingState from '../../components/LoadingState';
import type { SettingField } from '../../types';

/**
 * Every word on the public site, grouped exactly as it appears there.
 * The list is generated from the backend schema, so new copy only has to be
 * declared once (in `App\Support\SiteContent`) to become editable here.
 */
export default function ContentPanel() {
  const { success, error: toastError } = useToast();
  const { refresh } = useContent();

  const load = useCallback(() => api.admin.settings.list(), []);
  const { data: fields, setData, loading, error } = useResource<SettingField[]>(load, []);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [synced, setSynced] = useState<SettingField[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Freshly loaded values replace the draft during render — no effect needed.
  if (synced !== fields) {
    setSynced(fields);
    setDraft(Object.fromEntries(fields.map((field) => [field.key, field.value])));
  }

  const dirtyKeys = useMemo(
    () => fields.filter((field) => (draft[field.key] ?? field.value) !== field.value).map((field) => field.key),
    [fields, draft],
  );

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const visible = term
      ? fields.filter((field) => `${field.group} ${field.label} ${field.key} ${draft[field.key] ?? ''}`.toLowerCase().includes(term))
      : fields;

    return visible.reduce<Record<string, SettingField[]>>((acc, field) => {
      (acc[field.group] ||= []).push(field);
      return acc;
    }, {});
  }, [fields, search, draft]);

  if (loading) return <LoadingState label="Collecting every word…" />;
  if (error) return <div className="admin-card" style={{ color: 'var(--gold-deep)' }}>{error}</div>;

  const save = async () => {
    if (dirtyKeys.length === 0) return;
    setSaving(true);
    try {
      setData(await api.admin.settings.save(Object.fromEntries(dirtyKeys.map((key) => [key, draft[key] ?? '']))));
      await refresh();
      success(`Saved ${dirtyKeys.length} ${dirtyKeys.length === 1 ? 'change' : 'changes'}.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save the text.');
    } finally {
      setSaving(false);
    }
  };

  const resetOne = async (field: SettingField) => {
    try {
      setData(await api.admin.settings.reset(field.key));
      await refresh();
      success(`"${field.label}" is back to the original wording.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not restore this line.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="admin-card flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-3)' }} />
          <input className="input-field !pl-10" placeholder="Search any word or section" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <button onClick={save} disabled={saving || dirtyKeys.length === 0} className="btn-primary disabled:opacity-50">
          {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
          {dirtyKeys.length ? `Save ${dirtyKeys.length}` : 'Saved'}
        </button>
      </div>

      {Object.entries(groups).map(([group, entries]) => (
        <section key={group} className="admin-card">
          <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>{group}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {entries.map((field) => {
              const value = draft[field.key] ?? field.value;
              const changed = value !== field.value;
              const customised = field.value !== field.default;
              return (
                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <TextField
                    label={field.label}
                    hint={field.hint || (changed ? 'Unsaved change' : undefined)}
                    value={value}
                    multiline={field.type === 'textarea'}
                    rows={3}
                    type={field.type === 'url' ? 'url' : 'text'}
                    onChange={(next) => setDraft({ ...draft, [field.key]: next })}
                    action={customised ? (
                      <button onClick={() => resetOne(field)} className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--ink-4)' }}>
                        <RotateCcw size={12} /> original
                      </button>
                    ) : undefined}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {Object.keys(groups).length === 0 && (
        <div className="admin-card text-center" style={{ color: 'var(--ink-3)' }}>Nothing matches "{search}".</div>
      )}
    </div>
  );
}
