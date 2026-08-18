import { useCallback, useState } from 'react';
import { ArrowDown, ArrowUp, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { favoriteIcon, favoriteIconNames } from '../../lib/icons';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../components/ui/Toast';
import { TextField } from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import KebabMenu from '../../components/ui/KebabMenu';
import LoadingState from '../../components/LoadingState';
import type { Favorite } from '../../types';

const blank = { title: '', description: '', icon: 'leaf', sort_order: 0 };

export default function FavoritesPanel() {
  const { success, error: toastError } = useToast();
  const load = useCallback(() => api.favorites.list(), []);
  const { data: items, setData, loading, error, reload } = useResource<Favorite[]>(load, []);

  const [editing, setEditing] = useState<Favorite | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Favorite | null>(null);

  if (loading) return <LoadingState label="Gathering small joys…" />;
  if (error) return <div className="admin-card" style={{ color: 'var(--gold-deep)' }}>{error}</div>;

  const openCreate = () => { setForm(blank); setCreating(true); };
  const openEdit = (favorite: Favorite) => { setForm({ ...favorite }); setEditing(favorite); };
  const close = () => { setCreating(false); setEditing(null); };

  const save = async () => {
    if (!form.title.trim() || !form.description.trim()) return toastError('A title and a short description are needed.');
    setSaving(true);
    try {
      if (editing) await api.favorites.update(editing.id, form);
      else await api.favorites.create(form);
      await reload();
      success(editing ? 'Card updated.' : 'Card added.');
      close();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save this card.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (favorite: Favorite) => {
    try { await api.favorites.remove(favorite.id); await reload(); success('Card removed.'); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Could not remove this card.'); }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setData(next);
    try { setData(await api.favorites.reorder(next.map((item) => item.id))); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Could not save the new order.'); await reload(); }
  };

  const editor = (
    <div className="grid gap-4 pb-2">
      <TextField label="Title" value={form.title} onChange={(title) => setForm({ ...form, title })} />
      <TextField label="Description" multiline rows={3} value={form.description} onChange={(description) => setForm({ ...form, description })} />
      <div>
        <span className="field-label">Icon</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {favoriteIconNames.map((name) => {
            const Icon = favoriteIcon(name);
            return (
              <button
                key={name}
                onClick={() => setForm({ ...form, icon: name })}
                className={`icon-choice ${form.icon === name ? 'icon-choice-active' : ''}`}
                aria-label={name}
                title={name}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="admin-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>Things I love</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>The cards in the "Small joys" section, in the order shown here.</p>
        </div>
        <button onClick={openCreate} className="btn-primary !py-2.5"><Plus size={16} /> Add a card</button>
      </div>

      <div className="admin-card">
        {items.map((favorite, index) => {
          const Icon = favoriteIcon(favorite.icon);
          return (
            <div key={favorite.id} className="admin-row md:grid-cols-[auto_1fr_auto] md:items-center">
              <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: 'rgba(110,124,82,.1)', color: 'var(--moss)' }}><Icon size={19} /></span>
              <div className="min-w-0">
                <p className="font-medium" style={{ color: 'var(--ink)' }}>{favorite.title}</p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>{favorite.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(index, -1)} disabled={index === 0} className="icon-button disabled:opacity-30" aria-label="Move up"><ArrowUp size={16} /></button>
                <button onClick={() => move(index, 1)} disabled={index === items.length - 1} className="icon-button disabled:opacity-30" aria-label="Move down"><ArrowDown size={16} /></button>
                <button onClick={() => openEdit(favorite)} className="icon-button" aria-label="Edit"><Pencil size={16} /></button>
                <KebabMenu actions={[
                  { label: 'Remove card', icon: <Trash2 size={15} />, danger: true, onClick: () => setRemoving(favorite) },
                ]} />
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="py-8 text-center text-sm" style={{ color: 'var(--ink-4)' }}>No cards yet.</p>}
      </div>

      <Modal
        open={creating || editing !== null}
        title={editing ? 'Edit this card' : 'A new small joy'}
        description="It appears in the Small joys grid on the home page."
        onClose={close}
        footer={
          <>
            <button onClick={close} className="btn-outline !py-2.5">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary !py-2.5 disabled:opacity-60">
              {saving && <LoaderCircle className="animate-spin" size={15} />} Save
            </button>
          </>
        }
      >
        {editor}
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Remove this card?"
        description={`"${removing?.title}" will disappear from the home page. This cannot be undone.`}
        confirmLabel="Remove"
        tone="destructive"
        onConfirm={async () => { if (removing) await remove(removing); }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
