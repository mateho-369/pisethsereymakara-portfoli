import { useCallback, useRef, useState } from 'react';
import { LoaderCircle, Plus, QrCode, Save, Trash2, UploadCloud, X } from 'lucide-react';
import { api } from '../../lib/api';
import { socialIcon, socialIconNames } from '../../lib/icons';
import { useResource } from '../../lib/useResource';
import { useUpload } from '../../lib/useUpload';
import { useToast } from '../../components/ui/Toast';
import { SelectField, TextField } from '../../components/ui/Field';
import LoadingState from '../../components/LoadingState';
import type { Profile } from '../../types';

type LinkRow = { icon: string; url: string };

export default function ProfilePanel() {
  const { success, error: toastError } = useToast();
  const { upload, uploading } = useUpload('media');
  const fileRef = useRef<HTMLInputElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => api.profile.get(), []);
  const { data, loading, error, reload } = useResource<Profile | null>(load, null);

  const [form, setForm] = useState<Profile | null>(null);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [synced, setSynced] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  // Adopt server data during render so the form never flashes empty.
  if (data && synced !== data) {
    setSynced(data);
    setForm(data);
    setLinks(Object.entries(data.social_links || {}).map(([icon, url]) => ({ icon, url })));
  }

  if (loading) return <LoadingState label="Fetching your profile…" />;
  if (error || !form) return <div className="admin-card" style={{ color: 'var(--gold-deep)' }}>{error || 'Profile not found.'}</div>;

  const set = (patch: Partial<Profile>) => setForm({ ...form, ...patch });

  const pickAvatar = async (file?: File) => {
    if (!file) return;
    try {
      const uploaded = await upload(file);
      set({ avatar_url: uploaded.url });
      success('Portrait uploaded. Remember to save.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'The portrait could not be uploaded.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const pickQr = async (file?: File) => {
    if (!file) return;
    setUploadingQr(true);
    try {
      const uploaded = await upload(file);
      set({ support_qr_url: uploaded.url });
      success('KHQR image uploaded. Remember to save.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'The KHQR image could not be uploaded.');
    } finally {
      setUploadingQr(false);
      if (qrFileRef.current) qrFileRef.current.value = '';
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const social_links = links.reduce<Record<string, string>>((acc, { icon, url }) => {
        if (icon.trim() && url.trim()) acc[icon.trim()] = url.trim();
        return acc;
      }, {});
      await api.profile.update({
        ...form,
        social_links,
        support_qr_url: form.support_qr_url?.trim() || null,
        support_caption: form.support_caption?.trim() || null,
      });
      await reload();
      success('Your profile is updated.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="admin-card">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="shrink-0 text-center">
            <img src={form.avatar_url} alt="" className="mx-auto h-32 w-28 rounded-2xl object-cover" style={{ boxShadow: 'var(--shadow-md)' }} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => pickAvatar(event.target.files?.[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-outline mt-3 !px-4 !py-2 text-xs">
              {uploading ? <LoaderCircle className="animate-spin" size={14} /> : <UploadCloud size={14} />} Replace
            </button>
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <TextField label="Display name" value={form.display_name} onChange={(v) => set({ display_name: v })} />
            <TextField label="Role title" value={form.role_title} onChange={(v) => set({ role_title: v })} hint="The line under your name on the home page." />
            <TextField label="Location" value={form.location} onChange={(v) => set({ location: v })} />
            <TextField label="Contact email" type="email" value={form.email} onChange={(v) => set({ email: v })} />
            <div className="sm:col-span-2">
              <TextField label="Portrait URL" type="url" value={form.avatar_url} onChange={(v) => set({ avatar_url: v })} hint="Uploading above fills this in for you." />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card grid gap-4">
        <TextField label="Biography" multiline rows={6} value={form.bio} onChange={(v) => set({ bio: v })} />
        <TextField label="Quote" multiline rows={3} value={form.quote} onChange={(v) => set({ quote: v })} hint="Shown beside your portrait, in quotation marks." />
      </div>

      {/* Support / KHQR Section */}
      <div className="admin-card">
        <div>
          <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>Support & KHQR</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
            Upload your personal KHQR code from your Bakong or banking app. Displayed on the <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--bg-muted)' }}>/support</code> page alongside your links.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row">
          <div className="shrink-0 text-center">
            {form.support_qr_url ? (
              <div className="relative inline-block">
                <img
                  src={form.support_qr_url}
                  alt="KHQR Code preview"
                  className="mx-auto h-40 w-40 rounded-2xl border object-contain p-2"
                  style={{ borderColor: 'var(--border-soft)', background: '#FFFFFF', boxShadow: 'var(--shadow-md)' }}
                />
                <button
                  onClick={() => set({ support_qr_url: null })}
                  className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full text-white shadow-sm transition-transform hover:scale-110"
                  style={{ background: '#A64B3B' }}
                  title="Remove KHQR image"
                  aria-label="Remove KHQR image"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                className="grid h-40 w-40 place-items-center rounded-2xl border border-dashed"
                style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-muted)', color: 'var(--ink-4)' }}
              >
                <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                  <QrCode size={32} strokeWidth={1.5} />
                  <span className="text-xs">No KHQR image</span>
                </div>
              </div>
            )}

            <input
              ref={qrFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => pickQr(event.target.files?.[0])}
            />
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => qrFileRef.current?.click()}
                disabled={uploadingQr}
                className="btn-outline !px-4 !py-2 text-xs"
              >
                {uploadingQr ? <LoaderCircle className="animate-spin" size={14} /> : <UploadCloud size={14} />}
                {form.support_qr_url ? 'Replace QR' : 'Upload KHQR'}
              </button>
            </div>
          </div>

          <div className="grid flex-1 gap-4">
            <TextField
              label="Support caption / note"
              multiline
              rows={3}
              value={form.support_caption || ''}
              placeholder="If this helped you or you enjoy my work, buying me a coffee or sending support means a lot 🙏"
              onChange={(v) => set({ support_caption: v })}
              hint="Shown directly below your KHQR code on the /support page."
            />
            <TextField
              label="KHQR Image URL"
              type="url"
              value={form.support_qr_url || ''}
              placeholder="https://"
              onChange={(v) => set({ support_qr_url: v })}
              hint="Uploading above fills this in automatically, or you can paste a direct image URL."
            />
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>Links</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-3)' }}>
              Shown in the footer and on your <code className="rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--bg-muted)' }}>/support</code> page. Use https://, mailto: or tel:.
            </p>
          </div>
          <button onClick={() => setLinks([...links, { icon: 'website', url: '' }])} className="btn-outline !px-4 !py-2 text-xs"><Plus size={14} /> Add</button>
        </div>

        <div className="mt-4 space-y-3">
          {links.map((row, index) => {
            const Icon = socialIcon(row.icon);
            return (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--bg-muted)', color: 'var(--moss)' }}><Icon size={17} /></span>
                <div className="w-40">
                  <SelectField
                    label="Kind"
                    value={socialIconNames.includes(row.icon) ? row.icon : 'website'}
                    options={socialIconNames.map((name) => ({ value: name, label: name }))}
                    onChange={(value) => setLinks(links.map((item, i) => i === index ? { ...item, icon: value } : item))}
                  />
                </div>
                <div className="min-w-[12rem] flex-1">
                  <TextField label="Address" type="url" value={row.url} placeholder="https://" onChange={(value) => setLinks(links.map((item, i) => i === index ? { ...item, url: value } : item))} />
                </div>
                <button onClick={() => setLinks(links.filter((_, i) => i !== index))} className="icon-button mb-1" aria-label="Remove link"><Trash2 size={16} /></button>
              </div>
            );
          })}
          {links.length === 0 && <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No links yet.</p>}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />} Save profile
        </button>
      </div>
    </div>
  );
}
