import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, EyeOff, Image as ImageIcon, LoaderCircle, Play, Star, Trash2, UploadCloud, Video, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { MediaItem } from '../types';
import LoadingState from '../components/LoadingState';
import { api } from '../lib/api';

const filters = ['All', 'Photos', 'Videos', 'Favorites'] as const;
const aspectClass: Record<string, string> = { portrait: 'aspect-[4/5]', landscape: 'aspect-[4/3]', square: 'aspect-square' };

export default function GalleryPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<typeof filters[number]>('All');
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [manage, setManage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({ title: '', description: '', category: 'Field Notes' });
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    setError('');
    try {
      setItems(await api.media.list(isAdmin && manage));
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load the gallery.'); }
    finally { setLoading(false); }
  }, [isAdmin, manage]);

  useEffect(() => { setLoading(true); fetchMedia(); }, [fetchMedia]);

  const filtered = useMemo(() => items.filter((item) => {
    if (filter === 'Photos') return item.media_type === 'photo';
    if (filter === 'Videos') return item.media_type === 'video';
    if (filter === 'Favorites') return item.is_favorite;
    return true;
  }), [filter, items]);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !form.title.trim()) return setError('Add a title and choose an image or video first.');
    if (file.size > 4 * 1024 * 1024) return setError('Please choose a file smaller than 4 MB.');
    setUploading(true); setProgress(18); setError('');
    try {
      setProgress(36);
      const uploaded = await api.uploads.file(file, 'media');
      setProgress(76);
      const sizeLabel = file.size > 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.ceil(file.size / 1024)} KB`;
      await api.media.create({ ...form, media_type: file.type.startsWith('video/') ? 'video' : 'photo', thumbnail_url: uploaded.url, media_url: uploaded.url, size_label: sizeLabel, aspect_ratio: 'landscape', captured_at: new Date().toISOString(), is_favorite: false, is_public: true });
      setProgress(100); setForm({ title: '', description: '', category: 'Field Notes' });
      if (fileRef.current) fileRef.current.value = '';
      await fetchMedia();
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.'); }
    finally { setTimeout(() => { setUploading(false); setProgress(0); }, 450); }
  };

  const updateMedia = async (id: number, patch: Partial<MediaItem>) => {
    setError('');
    try { await api.media.update(id, patch); await fetchMedia(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update this item.'); }
  };

  const deleteMedia = async (id: number) => {
    if (!window.confirm('Remove this piece from the gallery?')) return;
    try { await api.media.remove(id); await fetchMedia(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not remove this item.'); }
  };

  return (
    <div className="page-shell py-14 md:py-20">
      <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow"><ImageIcon size={13} /> The visual journal</p>
          <h1 className="page-title mt-5" style={{ color: 'var(--ink)' }}>A gallery of<br /><em className="font-normal" style={{ color: 'var(--fjord)' }}>quiet moments.</em></h1>
          <p className="mt-5 max-w-xl leading-relaxed" style={{ color: 'var(--ink-2)' }}>Light, weather, overlooked paths, and the small details worth remembering.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setManage((v) => !v)} className={manage ? 'btn-primary' : 'btn-outline'}>
            {manage ? <><Check size={16} /> Viewing manager</> : <><UploadCloud size={16} /> Manage media</>}
          </button>
        )}
      </div>
      <div className="horizon my-10" />

      {/* ── Admin upload panel ── */}
      {manage && isAdmin && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-14 rounded-[1.5rem] p-5 sm:p-7" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-md)' }}>
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <button onClick={() => fileRef.current?.click()} className="group flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed p-7 text-center transition" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}><UploadCloud size={22} /></span>
              <strong className="mt-4 font-serif text-xl" style={{ color: 'var(--ink)' }}>Drop a file into the journal</strong>
              <span className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>Click to choose · Images or video · 4 MB max</span>
            </button>
            <div className="space-y-4">
              <input ref={fileRef} type="file" accept="image/*,video/*" className="input-field file:mr-4 file:rounded-full file:border-0 file:px-4 file:py-2 file:text-sm" style={{ '--file-bg': 'rgba(110,124,82,.1)', '--file-color': 'var(--moss)' } as React.CSSProperties} />
              <input className="input-field" placeholder="A gentle title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <input className="input-field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <input className="input-field" placeholder="A short caption" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <button onClick={upload} disabled={uploading} className="btn-primary w-full justify-center disabled:cursor-wait disabled:opacity-60">
                {uploading ? <><LoaderCircle className="animate-spin" size={17} /> Curating… {progress}%</> : <><UploadCloud size={17} /> Add to gallery</>}
              </button>
              {uploading && (
                <div className="h-1 overflow-hidden rounded-full" style={{ background: 'var(--gold-pale)' }}>
                  <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: 'var(--gold)' }} />
                </div>
              )}
            </div>
          </div>
        </motion.section>
      )}

      {error && <div className="mb-7 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(217,164,65,.25)', background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>{error}</div>}

      {!manage && (
        <div className="mb-9 flex flex-wrap gap-2">
          {filters.map((name) => (
            <button key={name} onClick={() => setFilter(name)} className={`filter-pill ${filter === name ? 'filter-pill-active' : ''}`}>
              {name}{name === 'Videos' && <Video size={13} />}
            </button>
          ))}
        </div>
      )}

      {loading ? <LoadingState label="Developing the photographs…" /> : manage && isAdmin ? (
        <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-md)' }}>
          <div className="hidden grid-cols-[2fr_.8fr_.8fr_.7fr_6rem] gap-4 border-b px-6 py-4 font-mono text-[9px] uppercase tracking-[.16em] md:grid" style={{ borderColor: 'var(--border-soft)', color: 'var(--ink-3)' }}>
            <span>Media</span><span>Size</span><span>Uploaded</span><span>Visibility</span><span className="text-right">Actions</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="grid gap-4 border-b p-4 last:border-0 md:grid-cols-[2fr_.8fr_.8fr_.7fr_6rem] md:items-center md:px-6" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="flex items-center gap-4">
                <img src={item.thumbnail_url} alt="" className="h-14 w-16 rounded-lg object-cover" />
                <div>
                  <p className="font-medium" style={{ color: 'var(--ink)' }}>{item.title}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>{item.category} · {item.media_type}</p>
                </div>
              </div>
              <span className="font-mono text-[10px]" style={{ color: 'var(--ink-3)' }}>{item.size_label}</span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--ink-3)' }}>{new Date(item.captured_at).toLocaleDateString()}</span>
              <button onClick={() => updateMedia(item.id, { is_public: !item.is_public })} className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
                {item.is_public ? <Eye size={16} /> : <EyeOff size={16} />}{item.is_public ? 'Public' : 'Private'}
              </button>
              <div className="flex justify-end gap-1">
                <button onClick={() => updateMedia(item.id, { is_favorite: !item.is_favorite })} className="icon-button" style={item.is_favorite ? { color: 'var(--gold-deep)' } : {}} aria-label="Toggle favorite">
                  <Star size={16} fill={item.is_favorite ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => deleteMedia(item.id)} className="icon-button" aria-label="Delete"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length ? (
        <motion.div layout className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {filtered.map((item) => (
            <motion.button layout key={item.id} onClick={() => setSelected(item)} className="gallery-card group mb-4 w-full break-inside-avoid text-left">
              <div className={`relative overflow-hidden ${aspectClass[item.aspect_ratio] || 'aspect-[4/3]'}`}>
                <img src={item.thumbnail_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1F18]/75 via-transparent to-transparent opacity-40 transition group-hover:opacity-80" />
                {item.media_type === 'video' && (
                  <span className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full backdrop-blur" style={{ background: 'rgba(248,244,233,.9)', color: 'var(--ink)' }}>
                    <Play size={16} fill="currentColor" />
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 translate-y-2 p-5 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100" style={{ color: '#F8F4E9' }}>
                  <span className="rounded-full px-2.5 py-1 font-mono text-[8px] uppercase tracking-[.14em]" style={{ background: 'var(--moss)' }}>{item.category}</span>
                  <p className="mt-3 font-serif text-2xl">{item.title}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <div className="rounded-2xl py-20 text-center" style={{ background: 'var(--bg-surface)' }}>
          <ImageIcon className="mx-auto" style={{ color: 'var(--moss)' }} />
          <p className="mt-4 font-serif text-2xl" style={{ color: 'var(--ink)' }}>Nothing in this collection yet.</p>
        </div>
      )}

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {selected && (
          <motion.div className="fixed inset-0 z-[80] grid place-items-center p-4 backdrop-blur-md" style={{ background: 'rgba(26,31,24,.85)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: .97, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97 }} onClick={(e) => e.stopPropagation()} className="relative max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl shadow-2xl" style={{ background: 'var(--bg-surface)' }}>
              <button onClick={() => setSelected(null)} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full shadow backdrop-blur" style={{ background: 'var(--bg-surface)', color: 'var(--ink)' }} aria-label="Close"><X size={19} /></button>
              {selected.media_type === 'video'
                ? <video src={selected.media_url} controls autoPlay className="max-h-[70vh] w-full object-contain" style={{ background: 'var(--bg-muted)' }} />
                : <img src={selected.media_url} alt={selected.title} className="max-h-[70vh] w-full object-contain" style={{ background: 'var(--bg-muted)' }} />}
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-serif text-3xl" style={{ color: 'var(--ink)' }}>{selected.title}</h2>
                  <span className="font-mono text-[9px] uppercase tracking-[.16em]" style={{ color: 'var(--ink-3)' }}>{new Date(selected.captured_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <p className="mt-3 max-w-2xl leading-relaxed" style={{ color: 'var(--ink-2)' }}>{selected.description}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
