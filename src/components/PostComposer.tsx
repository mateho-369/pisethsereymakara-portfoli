import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, Image as ImageIcon, LoaderCircle, Plus, Sparkles, UploadCloud, X } from 'lucide-react';
import { api } from '../lib/api';
import { useUpload } from '../lib/useUpload';
import { useToast } from './ui/Toast';
import MediaThumbnail from './MediaThumbnail';
import CategoryPicker from './CategoryPicker';

interface PendingFile {
  id: string;
  file: File;
  preview: string;
  title: string;
  description: string;
}

interface PostComposerProps {
  onPublished: () => void;
  /** Categories already used in the gallery — offered as one-click chips. */
  suggestions?: string[];
}

export default function PostComposer({ onPublished, suggestions = [] }: PostComposerProps) {
  const { success, error: toastError } = useToast();
  const { uploadMedia, uploading, progress } = useUpload('media');
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [category, setCategory] = useState('Field Notes');
  const [published, setPublished] = useState(false);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const newPending: PendingFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
      newPending.push({
        id: `${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
        title: file.name.replace(/\.[^.]+$/, ''),
        description: '',
      });
    }
    setPendingFiles((prev) => [...prev, ...newPending]);
  }, []);

  const removeFile = (id: string) => {
    setPendingFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateFile = (id: string, patch: Partial<PendingFile>) => {
    setPendingFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  };

  const publish = async () => {
    if (pendingFiles.length === 0) return toastError('Choose at least one image or video first.');

    setPublished(false);
    try {
      for (const pending of pendingFiles) {
        const uploaded = await uploadMedia(pending.file);
        await api.media.create({
          title: pending.title || 'Untitled',
          description: pending.description,
          category: category.trim() || 'Field Notes',
          media_type: uploaded.isVideo ? 'video' : 'photo',
          thumbnail_url: uploaded.thumbnailUrl,
          media_url: uploaded.url,
          size_label: uploaded.sizeLabel,
          aspect_ratio: 'landscape',
          captured_at: new Date().toISOString(),
          is_favorite: false,
          is_public: true,
        });
      }

      // Cleanup previews
      pendingFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setPendingFiles([]);
      if (fileRef.current) fileRef.current.value = '';

      // Show publish animation
      setPublished(true);
      setTimeout(() => setPublished(false), 2500);

      success(pendingFiles.length === 1 ? 'Added to the gallery.' : `${pendingFiles.length} pieces added to the gallery.`);
      onPublished();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'The upload did not finish.');
    }
  };

  return (
    <section className="admin-card relative overflow-hidden">
      {/* Publish celebration overlay */}
      <AnimatePresence>
        {published && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: 'rgba(248,244,233,.85)' }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 0] }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Sparkles className="mx-auto" size={40} style={{ color: 'var(--gold)' }} />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-3 font-serif text-2xl" style={{ color: 'var(--ink)' }}
              >
                Published!
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}
              >
                Your work is now in the gallery
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload area */}
        <div>
          <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>Add to the journal</h2>

          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
            className="mt-4 flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition hover:border-[var(--moss)]"
            style={{ borderColor: dragOver ? 'var(--moss)' : 'var(--border)', background: 'var(--bg)' }}
          >
            <span className="grid h-11 w-11 place-items-center rounded-full" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
              <UploadCloud size={20} />
            </span>
            <strong className="mt-3 font-serif text-lg" style={{ color: 'var(--ink)' }}>
              Choose or drop images or films
            </strong>
            <span className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
              Multiple files · Drag & drop or click · Up to 4 MB each
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); if (fileRef.current) fileRef.current.value = ''; }}
          />

          {/* Mood / Category — one-click chips or any custom category */}
          <div className="mt-4">
            <CategoryPicker
              label="Mood / Category"
              value={category}
              onChange={setCategory}
              suggestions={suggestions}
              hint="Pick a mood or type any category you like — it applies to every file in this batch."
            />
          </div>
        </div>

        {/* Live preview */}
        <div>
          <span className="field-label">Live preview</span>
          <div className="mt-2 overflow-hidden rounded-2xl" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-soft)' }}>
            {pendingFiles.length > 0 ? (
              <Reorder.Group axis="y" values={pendingFiles} onReorder={setPendingFiles} className="divide-y" style={{ borderColor: 'var(--border-soft)' }}>
                {pendingFiles.map((pending, index) => (
                  <Reorder.Item key={pending.id} value={pending} className="flex items-start gap-3 p-3" style={{ background: 'var(--bg-surface)' }}>
                    <span className="mt-2 cursor-grab text-[var(--ink-4)] active:cursor-grabbing">
                      <GripVertical size={16} />
                    </span>
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                      <MediaThumbnail url={pending.preview} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeFile(pending.id)}
                        className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-white"
                        style={{ background: '#A4523C' }}
                        aria-label="Remove"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <input
                        className="w-full rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus:border-[var(--moss)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                        value={pending.title}
                        placeholder="Title"
                        onChange={(e) => updateFile(pending.id, { title: e.target.value })}
                      />
                      <input
                        className="w-full rounded-md border bg-transparent px-2 py-1 text-xs outline-none focus:border-[var(--moss)]"
                        style={{ borderColor: 'var(--border)', color: 'var(--ink-3)' }}
                        value={pending.description}
                        placeholder="Caption (optional)"
                        onChange={(e) => updateFile(pending.id, { description: e.target.value })}
                      />
                    </div>
                    <span className="mt-2 font-mono text-[9px] uppercase tracking-wider" style={{ color: 'var(--ink-4)' }}>#{index + 1}</span>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ImageIcon size={28} style={{ color: 'var(--ink-4)' }} />
                <p className="mt-2 text-sm" style={{ color: 'var(--ink-4)' }}>Your gallery preview will appear here</p>
              </div>
            )}
          </div>

          {/* How it'll look as a gallery card preview */}
          {pendingFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 overflow-hidden rounded-xl" style={{ boxShadow: 'var(--shadow-md)' }}
            >
              <div className="relative aspect-[4/3]">
                <img src={pendingFiles[0].preview} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1F18]/75 via-transparent to-transparent opacity-70" />
                <div className="absolute inset-x-0 bottom-0 p-4" style={{ color: '#F8F4E9' }}>
                  <span className="rounded-full px-2.5 py-1 font-mono text-[8px] uppercase tracking-[.14em]" style={{ background: 'var(--moss)' }}>{category}</span>
                  <p className="mt-2 font-serif text-xl">{pendingFiles[0].title || 'Untitled'}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Publish button */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs" style={{ color: 'var(--ink-4)' }}>
          {pendingFiles.length > 0 ? `${pendingFiles.length} ${pendingFiles.length === 1 ? 'piece' : 'pieces'} ready` : 'No files chosen yet'}
          {pendingFiles.length > 1 && ' · Drag to reorder'}
        </p>
        <motion.button
          whileHover={pendingFiles.length > 0 ? { scale: 1.02 } : {}}
          whileTap={pendingFiles.length > 0 ? { scale: 0.98 } : {}}
          onClick={publish}
          disabled={uploading || pendingFiles.length === 0}
          className="btn-primary disabled:opacity-50"
        >
          {uploading ? (
            <><LoaderCircle className="animate-spin" size={16} /> Publishing… {progress}%</>
          ) : (
            <><Plus size={16} /> Publish to gallery</>
          )}
        </motion.button>
      </div>
    </section>
  );
}
