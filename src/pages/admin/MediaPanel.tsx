import { useCallback, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, LoaderCircle, Pencil, Plus, Star, Trash2, UploadCloud } from 'lucide-react';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { useUpload } from '../../lib/useUpload';
import { useToast } from '../../components/ui/Toast';
import { SelectField, Switch, TextField } from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingState from '../../components/LoadingState';
import MediaThumbnail from '../../components/MediaThumbnail';
import type { MediaItem } from '../../types';

const aspectOptions = [
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'square', label: 'Square' },
];

const dateInput = (value: string) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export default function MediaPanel() {
  const { success, error: toastError } = useToast();
  const load = useCallback(() => api.media.list(true), []);
  const { data: items, setData, loading, error, reload } = useResource<MediaItem[]>(load, []);

  const { upload, uploadMedia, uploading, progress } = useUpload('media');
  const newFileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [addForm, setAddForm] = useState({ title: '', category: 'Field Notes', description: '' });
  const [chosenFile, setChosenFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<MediaItem | null>(null);

  if (loading) return <LoadingState label="Developing the photographs…" />;
  if (error) return <div className="admin-card" style={{ color: 'var(--gold-deep)' }}>{error}</div>;

  const addPiece = async () => {
    const file = chosenFile;
    if (!file || !addForm.title.trim()) return toastError('Add a title and choose an image or video first.');
    try {
      const uploaded = await uploadMedia(file);
      await api.media.create({
        ...addForm,
        media_type: uploaded.isVideo ? 'video' : 'photo',
        thumbnail_url: uploaded.thumbnailUrl,
        media_url: uploaded.url,
        size_label: uploaded.sizeLabel,
        aspect_ratio: 'landscape',
        captured_at: new Date().toISOString(),
        is_favorite: false,
        is_public: true,
      });
      setAddForm({ title: '', category: addForm.category, description: '' });
      setChosenFile(null);
      if (newFileRef.current) newFileRef.current.value = '';
      await reload();
      success(uploaded.posterMissing
        ? 'Added to the gallery, but the browser could not make a video cover. Open Edit to upload a cover image.'
        : 'Added to the gallery.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'The upload did not finish.');
    }
  };

  const patch = async (item: MediaItem, changes: Partial<MediaItem>) => {
    try { await api.media.update(item.id, changes); await reload(); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Could not update this piece.'); }
  };

  const replaceFile = async (file?: File) => {
    if (!file || !editing) return;
    try {
      const uploaded = await uploadMedia(file);
      setEditing({
        ...editing,
        media_url: uploaded.url,
        thumbnail_url: uploaded.thumbnailUrl,
        size_label: uploaded.sizeLabel,
        media_type: uploaded.isVideo ? 'video' : 'photo',
      });
      success(uploaded.posterMissing
        ? 'New video ready, but its cover could not be generated. Upload a cover image, then save your changes.'
        : 'New file ready — save to publish it.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'The replacement did not upload.');
    } finally {
      if (replaceRef.current) replaceRef.current.value = '';
    }
  };

  const replaceCover = async (file?: File) => {
    if (!file || !editing) return;
    if (!file.type.startsWith('image/')) {
      toastError('Please choose an image for the video cover.');
      return;
    }
    try {
      const uploaded = await upload(file);
      setEditing({ ...editing, thumbnail_url: uploaded.url });
      success('Cover image ready — save to publish it.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'The cover image did not upload.');
    } finally {
      if (coverRef.current) coverRef.current.value = '';
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.media.update(editing.id, {
        title: editing.title,
        description: editing.description || '',
        category: editing.category,
        media_type: editing.media_type,
        media_url: editing.media_url,
        thumbnail_url: editing.thumbnail_url,
        size_label: editing.size_label,
        aspect_ratio: editing.aspect_ratio,
        captured_at: editing.captured_at,
        is_favorite: editing.is_favorite,
        is_public: editing.is_public,
      });
      await reload();
      success('Saved.');
      setEditing(null);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save this piece.');
    } finally {
      setSaving(false);
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setData(next);
    try { setData(await api.media.reorder(next.map((item) => item.id))); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Could not save the new order.'); await reload(); }
  };

  const remove = async (item: MediaItem) => {
    try { await api.media.remove(item.id); await reload(); success('Removed from the gallery.'); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Could not remove this piece.'); }
  };

  return (
    <div className="space-y-5">
      <section className="admin-card">
        <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>Add to the journal</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <button onClick={() => newFileRef.current?.click()} className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}><UploadCloud size={20} /></span>
            <strong className="mt-3 font-serif text-lg" style={{ color: 'var(--ink)' }}>Choose an image or film</strong>
            <span className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>{chosenFile?.name || 'Up to 4 MB'}</span>
          </button>
          <div className="space-y-3">
            <input ref={newFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => setChosenFile(event.target.files?.[0] || null)} />
            <TextField label="Title" value={addForm.title} onChange={(title) => setAddForm({ ...addForm, title })} />
            <TextField label="Category" value={addForm.category} onChange={(category) => setAddForm({ ...addForm, category })} />
            <TextField label="Caption" value={addForm.description} onChange={(description) => setAddForm({ ...addForm, description })} />
            <button onClick={addPiece} disabled={uploading} className="btn-primary w-full justify-center disabled:opacity-60">
              {uploading ? <><LoaderCircle className="animate-spin" size={16} /> Curating… {progress}%</> : <><Plus size={16} /> Add to gallery</>}
            </button>
          </div>
        </div>
      </section>

      <section className="admin-card">
        {items.map((item, index) => (
          <div key={item.id} className="admin-row md:grid-cols-[auto_1fr_auto] md:items-center">
            <MediaThumbnail url={item.thumbnail_url} alt="" className="h-16 w-20 rounded-lg object-cover" />
            <div className="min-w-0">
              <p className="font-medium" style={{ color: 'var(--ink)' }}>{item.title}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-3)' }}>
                {item.category} · {item.media_type} · {item.size_label} · {new Date(item.captured_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button onClick={() => move(index, -1)} disabled={index === 0} className="icon-button disabled:opacity-30" aria-label="Move up"><ArrowUp size={16} /></button>
              <button onClick={() => move(index, 1)} disabled={index === items.length - 1} className="icon-button disabled:opacity-30" aria-label="Move down"><ArrowDown size={16} /></button>
              <button onClick={() => patch(item, { is_favorite: !item.is_favorite })} className="icon-button" style={item.is_favorite ? { color: 'var(--gold-deep)' } : {}} aria-label="Toggle favorite">
                <Star size={16} fill={item.is_favorite ? 'currentColor' : 'none'} />
              </button>
              <button onClick={() => patch(item, { is_public: !item.is_public })} className="icon-button" aria-label="Toggle visibility">
                {item.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button onClick={() => setEditing(item)} className="icon-button" aria-label="Edit"><Pencil size={16} /></button>
              <button onClick={() => setRemoving(item)} className="icon-button" aria-label="Delete"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="py-8 text-center text-sm" style={{ color: 'var(--ink-4)' }}>The gallery is empty.</p>}
      </section>

      <Modal
        open={editing !== null}
        title="Edit this piece"
        description="Change any detail, or swap in a completely new file."
        onClose={() => setEditing(null)}
        width="40rem"
        footer={
          <>
            <button onClick={() => setEditing(null)} className="btn-outline !py-2.5">Cancel</button>
            <button onClick={saveEdit} disabled={saving} className="btn-primary !py-2.5 disabled:opacity-60">
              {saving && <LoaderCircle className="animate-spin" size={15} />} Save changes
            </button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 pb-3 sm:grid-cols-2">
            <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
              <MediaThumbnail url={editing.thumbnail_url} alt="" className="h-24 w-32 rounded-xl object-cover" />
              <input ref={replaceRef} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => replaceFile(event.target.files?.[0])} />
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(event) => replaceCover(event.target.files?.[0])} />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => replaceRef.current?.click()} disabled={uploading} className="btn-outline !py-2.5">
                  {uploading ? <LoaderCircle className="animate-spin" size={15} /> : <UploadCloud size={15} />} Replace file
                </button>
                {editing.media_type === 'video' && (
                  <button onClick={() => coverRef.current?.click()} disabled={uploading} className="btn-outline !py-2.5">
                    <UploadCloud size={15} /> Cover image
                  </button>
                )}
              </div>
            </div>
            <TextField label="Title" value={editing.title} onChange={(title) => setEditing({ ...editing, title })} />
            <TextField label="Category" value={editing.category} onChange={(category) => setEditing({ ...editing, category })} />
            <div className="sm:col-span-2">
              <TextField label="Caption" multiline rows={3} value={editing.description || ''} onChange={(description) => setEditing({ ...editing, description })} />
            </div>
            <SelectField label="Shape" value={editing.aspect_ratio} options={aspectOptions} onChange={(value) => setEditing({ ...editing, aspect_ratio: value as MediaItem['aspect_ratio'] })} />
            <TextField label="Captured on" type="date" value={dateInput(editing.captured_at)} onChange={(value) => setEditing({ ...editing, captured_at: value })} />
            <Switch label="Visible to visitors" checked={editing.is_public} onChange={(is_public) => setEditing({ ...editing, is_public })} />
            <Switch label="Marked as a favorite" checked={editing.is_favorite} onChange={(is_favorite) => setEditing({ ...editing, is_favorite })} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Remove this piece?"
        description={`"${removing?.title}" and its stored file will be deleted for good.`}
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={async () => { if (removing) await remove(removing); }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
