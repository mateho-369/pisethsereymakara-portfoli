import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Eye, EyeOff, Image as ImageIcon, LoaderCircle, Play, Star, Trash2, UploadCloud, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../contexts/ContentContext';
import type { MediaItem } from '../types';
import LoadingState from '../components/LoadingState';
import MediaLightbox, { type LightboxItem } from '../components/MediaLightbox';
import MediaThumbnail from '../components/MediaThumbnail';
import CategoryPicker from '../components/CategoryPicker';
import { api } from '../lib/api';
import { useUpload, sizeLabel } from '../lib/useUpload';

const filters = ['All', 'Photos', 'Videos', 'Favorites'] as const;
const aspectClass: Record<string, string> = { portrait: 'aspect-[4/5]', landscape: 'aspect-[4/3]', square: 'aspect-square' };

export default function GalleryPage() {
  const { isAdmin } = useAuth();
  const { text } = useContent();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<typeof filters[number]>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [manage, setManage] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Field Notes' });
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef('');
  const { uploadMedia, uploading, progress } = useUpload('media');

  // Keep the quick-manage tile's preview in sync with the chosen file.
  const pickFile = (file: File | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
    setPreviewUrl(previewRef.current);
    setPickedFile(file);
  };

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

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

  const lightboxItems = useMemo<LightboxItem[]>(() => filtered.map((item) => ({
    url: item.media_url,
    type: item.media_type === 'video' ? 'video' : 'image',
    alt: item.title,
    title: item.title,
    description: item.description,
    date: item.captured_at,
  })), [filtered]);

  const upload = async () => {
    if (!pickedFile || !form.title.trim()) return setError('Add a title and choose an image or video first.');
    setError('');
    try {
      const uploaded = await uploadMedia(pickedFile);
      await api.media.create({ ...form, category: form.category.trim() || 'Field Notes', media_type: uploaded.isVideo ? 'video' : 'photo', thumbnail_url: uploaded.thumbnailUrl, media_url: uploaded.url, size_label: uploaded.sizeLabel, aspect_ratio: 'landscape', captured_at: new Date().toISOString(), is_favorite: false, is_public: true });
      setForm({ title: '', description: '', category: 'Field Notes' });
      pickFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await fetchMedia();
      if (uploaded.posterMissing) setError('The video was added, but its cover could not be generated. Use Full studio to upload a cover image.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.'); }
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
          <p className="eyebrow"><ImageIcon size={13} /> {text('gallery.eyebrow', 'The visual journal')}</p>
          <h1 className="page-title mt-5" style={{ color: 'var(--ink)' }}>
            {text('gallery.title_line_one', 'A gallery of')}<br />
            <em className="font-normal" style={{ color: 'var(--fjord)' }}>{text('gallery.title_line_two', 'quiet moments.')}</em>
          </h1>
          <p className="mt-5 max-w-xl leading-relaxed" style={{ color: 'var(--ink-2)' }}>{text('gallery.intro', 'Light, weather, overlooked paths, and the small details worth remembering.')}</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setManage((v) => !v)} className={manage ? 'btn-primary' : 'btn-outline'}>
              {manage ? <><Check size={16} /> Viewing manager</> : <><UploadCloud size={16} /> Quick manage</>}
            </button>
            <Link to="/admin/media" className="btn-outline">Full studio</Link>
          </div>
        )}
      </div>
      <div className="horizon my-10" />

      {/* ── Admin upload panel ── */}
      {manage && isAdmin && (
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-14 rounded-[1.5rem] p-5 sm:p-7" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-md)' }}>
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              <button
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
                className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed p-7 text-center transition"
                style={{ borderColor: dragOver ? 'var(--moss)' : 'var(--border)', background: 'var(--bg)', minHeight: pickedFile ? 'auto' : '12rem' }}
              >
                {pickedFile ? (
                  <>
                    <span className="flex items-center gap-3 text-left">
                      {previewUrl ? (
                        <img src={previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                      ) : (
                        <span className="grid h-14 w-14 place-items-center rounded-lg" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}><Video size={22} /></span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>{pickedFile.name}</span>
                        <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--ink-3)' }}>{pickedFile.type || 'file'} · {sizeLabel(pickedFile.size)}</span>
                      </span>
                    </span>
                    <span className="mt-3 text-xs underline decoration-dotted underline-offset-4" style={{ color: 'var(--ink-3)' }}>Click to choose a different file</span>
                  </>
                ) : (
                  <>
                    <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}><UploadCloud size={22} /></span>
                    <strong className="mt-4 font-serif text-xl" style={{ color: 'var(--ink)' }}>Drop a file into the journal</strong>
                    <span className="mt-2 text-sm" style={{ color: 'var(--ink-3)' }}>Drag & drop or click · Images or video · 4 MB max</span>
                  </>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0] ?? null); }} />
            </div>
            <div className="space-y-4">
              <input className="input-field" placeholder="A gentle title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <CategoryPicker value={form.category} onChange={(category) => setForm({ ...form, category })} />
              <input className="input-field" placeholder="A short caption" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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

      {loading ? <LoadingState label={text('gallery.loading', 'Developing the photographs…')} /> : manage && isAdmin ? (
        <div className="overflow-hidden rounded-2xl" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-md)' }}>
          <div className="hidden grid-cols-[2fr_.8fr_.8fr_.7fr_6rem] gap-4 border-b px-6 py-4 font-mono text-[9px] uppercase tracking-[.16em] md:grid" style={{ borderColor: 'var(--border-soft)', color: 'var(--ink-3)' }}>
            <span>Media</span><span>Size</span><span>Uploaded</span><span>Visibility</span><span className="text-right">Actions</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="grid gap-4 border-b p-4 last:border-0 md:grid-cols-[2fr_.8fr_.8fr_.7fr_6rem] md:items-center md:px-6" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="flex items-center gap-4">
                <MediaThumbnail url={item.thumbnail_url} alt="" className="h-14 w-16 rounded-lg object-cover" />
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
          {filtered.map((item, idx) => (
            <motion.button layout key={item.id} onClick={() => setLightboxIndex(idx)} className="gallery-card group mb-4 w-full break-inside-avoid text-left">
              <div className={`relative overflow-hidden ${aspectClass[item.aspect_ratio] || 'aspect-[4/3]'}`}>
                <MediaThumbnail url={item.thumbnail_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" />
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
          <p className="mt-4 font-serif text-2xl" style={{ color: 'var(--ink)' }}>{text('gallery.empty', 'Nothing in this collection yet.')}</p>
        </div>
      )}

      {/* ── Lightbox ── */}
      <MediaLightbox
        items={lightboxItems}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        showDetails
      />
    </div>
  );
}
