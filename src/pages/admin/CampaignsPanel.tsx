import { useCallback, useMemo, useState } from 'react';
import {
  ArrowLeft, Ban, Camera, Check, Copy, Image as ImageIcon, Link2, MessageSquareQuote,
  Plus, Trash2, Vote, X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useResource } from '../../lib/useResource';
import { useToast } from '../../components/ui/Toast';
import { Field, SelectField, Switch, TextField } from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import KebabMenu from '../../components/ui/KebabMenu';
import LoadingState from '../../components/LoadingState';
import type {
  AdminCampaign, AdminCampaignResponse, AdminCampaignResponses, CampaignInput,
  CampaignStatus, CampaignType, PollResultsVisibility,
} from '../../types';

const TYPE_META: Record<CampaignType, { label: string; Icon: typeof Vote; blurb: string }> = {
  poll: { label: 'Poll', Icon: Vote, blurb: 'A question with options. One vote per person.' },
  question: { label: 'Question', Icon: MessageSquareQuote, blurb: 'A short written reply, private to you.' },
  photo: { label: 'Photo request', Icon: Camera, blurb: 'Ask people to send a picture, privately.' },
};

const STATE_TONE: Record<string, { bg: string; color: string }> = {
  open: { bg: 'rgba(110,124,82,.14)', color: 'var(--moss)' },
  draft: { bg: 'var(--border-soft)', color: 'var(--ink-3)' },
  scheduled: { bg: 'rgba(92,122,137,.14)', color: 'var(--fjord)' },
  ended: { bg: 'var(--gold-pale)', color: 'var(--gold-deep)' },
  closed: { bg: 'var(--gold-pale)', color: 'var(--gold-deep)' },
};

const emptyDraft: CampaignInput & { options: string[] } = {
  type: 'poll',
  title: '',
  prompt: '',
  status: 'draft',
  slug: '',
  start_date: '',
  end_date: '',
  poll_results_visibility: 'after_vote',
  allow_updates: false,
  ask_referral: true,
  options: ['', ''],
};

/**
 * Campaigns: shareable /ask/{slug} links for polls, questions and photo requests.
 *
 * Everything people send is private by default. Photos are never copied into the
 * public gallery by anything other than the deliberate "Add to gallery" action here.
 */
export default function CampaignsPanel() {
  const { success, error: toastError } = useToast();
  const load = useCallback(() => api.admin.campaigns.list(), []);
  const { data: campaigns, loading, error, reload } = useResource<AdminCampaign[]>(load, []);

  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState<AdminCampaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [removing, setRemoving] = useState<AdminCampaign | null>(null);
  const [busy, setBusy] = useState(false);

  if (openId !== null) {
    return <ResponsesView campaignId={openId} onBack={() => { setOpenId(null); reload(); }} />;
  }

  if (loading) return <LoadingState label="Gathering your campaigns…" />;
  if (error) return <div className="admin-card" style={{ color: 'var(--gold-deep)' }}>{error}</div>;

  const startCreate = () => { setDraft(emptyDraft); setCreating(true); };

  const startEdit = (campaign: AdminCampaign) => {
    setDraft({
      type: campaign.type,
      title: campaign.title,
      prompt: campaign.prompt || '',
      status: campaign.status,
      slug: campaign.slug,
      start_date: campaign.start_date ? campaign.start_date.slice(0, 10) : '',
      end_date: campaign.end_date ? campaign.end_date.slice(0, 10) : '',
      poll_results_visibility: campaign.poll_results_visibility,
      allow_updates: campaign.allow_updates,
      ask_referral: campaign.ask_referral,
      options: campaign.options.length ? campaign.options.map((option) => option.label) : ['', ''],
    });
    setEditing(campaign);
  };

  const save = async () => {
    const labels = draft.options.map((label) => label.trim()).filter(Boolean);
    if (!draft.title.trim()) { toastError('Please give the campaign a title.'); return; }
    if (draft.type === 'poll' && labels.length < 2) { toastError('A poll needs at least two options.'); return; }

    setBusy(true);
    try {
      const payload = {
        title: draft.title.trim(),
        prompt: draft.prompt?.trim() || null,
        status: draft.status,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
        poll_results_visibility: draft.poll_results_visibility,
        allow_updates: draft.allow_updates,
        ask_referral: draft.ask_referral,
      };

      if (editing) {
        await api.admin.campaigns.update(editing.id, {
          ...payload,
          slug: draft.slug?.trim() || undefined,
          ...(editing.type === 'poll' ? { options: labels.map((label) => ({ label })) } : {}),
        });
        success('Campaign updated.');
      } else {
        await api.admin.campaigns.create({
          ...payload,
          type: draft.type,
          slug: draft.slug?.trim() || undefined,
          ...(draft.type === 'poll' ? { options: labels } : {}),
        });
        success('Campaign created.');
      }
      await reload();
      setCreating(false); setEditing(null);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'That could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (campaign: AdminCampaign, status: CampaignStatus) => {
    try {
      await api.admin.campaigns.setStatus(campaign.id, status);
      await reload();
      success(status === 'active' ? 'Campaign is open.' : status === 'closed' ? 'Campaign closed.' : 'Moved back to draft.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not change the status.');
    }
  };

  const copyLink = async (campaign: AdminCampaign) => {
    const url = `${window.location.origin}/ask/${campaign.slug}`;
    try { await navigator.clipboard.writeText(url); success('Link copied — paste it into your story.'); }
    catch { toastError(url); }
  };

  const remove = async () => {
    if (!removing) return;
    try {
      await api.admin.campaigns.remove(removing.id);
      await reload();
      success('Campaign and its responses were removed.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not remove this campaign.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl" style={{ color: 'var(--ink)' }}>Campaigns</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            Share a link in your story and collect votes, replies or photos. Everything people send stays private
            to you — nothing reaches the public gallery unless you put it there.
          </p>
        </div>
        <button onClick={startCreate} className="btn-primary !py-2.5"><Plus size={16} /> New campaign</button>
      </div>

      {campaigns.length === 0 ? (
        <div className="admin-card text-center">
          <p className="font-serif text-xl" style={{ color: 'var(--ink)' }}>No campaigns yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            Create one, copy the link, and put it in your story. People sign in, answer once, and you see who said what.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {campaigns.map((campaign) => {
            const { Icon, label } = TYPE_META[campaign.type];
            const tone = STATE_TONE[campaign.state] || STATE_TONE.draft;
            const actions = [
              { label: 'View responses', icon: <ImageIcon size={15} />, onClick: () => setOpenId(campaign.id) },
              { label: 'Copy link', icon: <Copy size={15} />, onClick: () => void copyLink(campaign) },
              { label: 'Edit', icon: <Check size={15} />, onClick: () => startEdit(campaign) },
              campaign.status === 'active'
                ? { label: 'Close now', icon: <X size={15} />, onClick: () => void setStatus(campaign, 'closed') }
                : { label: 'Open it', icon: <Check size={15} />, onClick: () => void setStatus(campaign, 'active') },
              { label: 'Delete', icon: <Trash2 size={15} />, danger: true, onClick: () => setRemoving(campaign) },
            ];

            return (
              <div key={campaign.id} className="admin-card flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
                    <Icon size={17} />
                  </span>
                  <span className="admin-chip" style={{ background: tone.bg, color: tone.color }}>{campaign.state}</span>
                  <KebabMenu actions={actions} />
                </div>

                <h3 className="mt-4 font-serif text-lg leading-snug" style={{ color: 'var(--ink)' }}>{campaign.title}</h3>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>
                  {label} · {campaign.response_count} {campaign.response_count === 1 ? 'response' : 'responses'}
                  {campaign.pending_photo_count > 0 && ` · ${campaign.pending_photo_count} awaiting review`}
                </p>

                <button
                  onClick={() => void copyLink(campaign)}
                  className="mt-4 flex items-center gap-2 truncate rounded-lg px-3 py-2 text-left font-mono text-xs transition"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border-soft)', color: 'var(--ink-3)' }}
                >
                  <Link2 size={13} className="shrink-0" /> /ask/{campaign.slug}
                </button>

                <div className="mt-4 flex gap-2 pt-1">
                  <button onClick={() => setOpenId(campaign.id)} className="btn-outline flex-1 justify-center !py-2 !text-xs">Responses</button>
                  {campaign.status === 'active' ? (
                    <button onClick={() => void setStatus(campaign, 'closed')} className="btn-outline !py-2 !text-xs">Close</button>
                  ) : (
                    <button onClick={() => void setStatus(campaign, 'active')} className="btn-primary !py-2 !text-xs">Open</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BlocksCard campaigns={campaigns} />

      <Modal
        open={creating || editing !== null}
        title={editing ? 'Edit campaign' : 'New campaign'}
        description={editing ? 'The link stays the same unless you change the slug.' : TYPE_META[draft.type].blurb}
        onClose={() => { setCreating(false); setEditing(null); }}
        width="38rem"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="btn-outline !py-2.5">Cancel</button>
            <button onClick={save} disabled={busy} className="btn-primary !py-2.5 disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
          </div>
        }
      >
        <div className="space-y-4">
          {!editing && (
            <Field label="What kind of campaign?">
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_META) as CampaignType[]).map((type) => {
                  const { Icon, label } = TYPE_META[type];
                  const selected = draft.type === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setDraft({ ...draft, type })}
                      className="flex flex-col items-center gap-2 rounded-xl px-2 py-4 text-xs transition"
                      style={{
                        border: `1px solid ${selected ? 'var(--moss)' : 'var(--border)'}`,
                        background: selected ? 'rgba(110,124,82,.1)' : 'var(--bg)',
                        color: selected ? 'var(--moss)' : 'var(--ink-2)',
                      }}
                    >
                      <Icon size={18} /> {label}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          <TextField label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} placeholder="Which cover should I print?" />
          <TextField label="A little more (optional)" value={draft.prompt || ''} onChange={(prompt) => setDraft({ ...draft, prompt })} multiline rows={3} placeholder="Say why you're asking." />

          {draft.type === 'poll' && (
            <Field label="Options" hint="Each person may pick exactly one.">
              <div className="space-y-2">
                {draft.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className="input-field"
                      value={option}
                      placeholder={`Option ${index + 1}`}
                      onChange={(event) => {
                        const options = [...draft.options];
                        options[index] = event.target.value;
                        setDraft({ ...draft, options });
                      }}
                    />
                    {draft.options.length > 2 && (
                      <button
                        onClick={() => setDraft({ ...draft, options: draft.options.filter((_, i) => i !== index) })}
                        className="icon-button"
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                {draft.options.length < 8 && (
                  <button onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })} className="text-link text-xs">
                    <Plus size={13} /> Add option
                  </button>
                )}
              </div>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Opens on (optional)" type="date" value={draft.start_date || ''} onChange={(start_date) => setDraft({ ...draft, start_date })} />
            <TextField label="Closes after (optional)" type="date" value={draft.end_date || ''} onChange={(end_date) => setDraft({ ...draft, end_date })} />
          </div>

          <TextField
            label="Link"
            value={draft.slug || ''}
            onChange={(slug) => setDraft({ ...draft, slug })}
            placeholder="print-cover"
            hint={`Leave blank and one is made from the title. The page lives at /ask/${draft.slug || '…'}`}
          />

          {draft.type === 'poll' && (
            <SelectField
              label="Who sees the results"
              value={draft.poll_results_visibility || 'after_vote'}
              onChange={(value) => setDraft({ ...draft, poll_results_visibility: value as PollResultsVisibility })}
              options={[
                { value: 'after_vote', label: 'After a person votes' },
                { value: 'always', label: 'Always — anyone visiting' },
                { value: 'after_close', label: 'Only once the campaign closes' },
              ]}
              hint="Percentages only. Names are never shown to visitors."
            />
          )}

          <SelectField
            label="Status"
            value={draft.status || 'draft'}
            onChange={(value) => setDraft({ ...draft, status: value as CampaignStatus })}
            options={[
              { value: 'draft', label: 'Draft — the link shows “not open yet”' },
              { value: 'active', label: 'Open — accepting responses' },
              { value: 'closed', label: 'Closed — thanks, but no more' },
            ]}
          />

          <Switch
            checked={draft.allow_updates ?? false}
            onChange={(allow_updates) => setDraft({ ...draft, allow_updates })}
            label="Let people change their answer"
            hint="Off means one final answer each, which is usual for a poll."
          />
          <Switch
            checked={draft.ask_referral ?? true}
            onChange={(ask_referral) => setDraft({ ...draft, ask_referral })}
            label="Ask where they found the link"
            hint="A plain optional question with a skip. Nothing is detected or tracked."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Delete this campaign?"
        description={`“${removing?.title}” and every response sent to it will be removed. This cannot be undone.`}
        confirmLabel="Delete it"
        tone="destructive"
        onConfirm={remove}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ResponsesView({ campaignId, onBack }: { campaignId: number; onBack: () => void }) {
  const { success, error: toastError } = useToast();
  const load = useCallback(() => api.admin.campaigns.responses(campaignId), [campaignId]);
  const { data, loading, error, reload } = useResource<AdminCampaignResponses | null>(load, null);

  const [publishing, setPublishing] = useState<AdminCampaignResponse | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Campaigns');
  const [removing, setRemoving] = useState<AdminCampaignResponse | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingState label="Opening the responses…" />;
  if (error || !data) return <div className="admin-card" style={{ color: 'var(--gold-deep)' }}>{error || 'Not found.'}</div>;

  const { campaign, tally, responses } = data;

  const moderate = async (response: AdminCampaignResponse, status: 'approved' | 'rejected') => {
    try {
      await api.admin.campaigns.moderate(response.id, status);
      await reload();
      success(status === 'approved' ? 'Photo approved. It stays private until you add it to the gallery.' : 'Photo rejected.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not update this photo.');
    }
  };

  const block = async (response: AdminCampaignResponse, everywhere: boolean) => {
    try {
      await api.admin.campaignBlocks.create(response.user_id, everywhere ? null : campaign.id);
      await reload();
      success(everywhere ? `${response.name} is blocked from all campaigns.` : `${response.name} is blocked from this campaign.`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not block this person.');
    }
  };

  const publish = async () => {
    if (!publishing) return;
    if (!title.trim()) { toastError('Give the photo a title first.'); return; }
    setBusy(true);
    try {
      await api.admin.campaigns.publish(publishing.id, { title: title.trim(), category: category.trim() || 'Campaigns', is_public: true });
      await reload();
      success('Added to your gallery.');
      setPublishing(null); setTitle('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not add this to the gallery.');
    } finally {
      setBusy(false);
    }
  };

  const removeResponse = async () => {
    if (!removing) return;
    try { await api.admin.campaigns.removeResponse(removing.id); await reload(); success('Response removed.'); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Could not remove this response.'); }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-link text-xs"><ArrowLeft size={14} /> All campaigns</button>

      <div>
        <p className="eyebrow">{TYPE_META[campaign.type].label} · {campaign.state}</p>
        <h2 className="mt-3 font-serif text-2xl" style={{ color: 'var(--ink)' }}>{campaign.title}</h2>
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>
          /ask/{campaign.slug} · {responses.length} {responses.length === 1 ? 'response' : 'responses'}
        </p>
      </div>

      {tally && (
        <div className="admin-card">
          <p className="field-label">Tally</p>
          <div className="mt-4 space-y-3">
            {tally.options.map((option) => (
              <div key={option.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span style={{ color: 'var(--ink)' }}>{option.label}</span>
                  <span className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>{option.percent}% · {option.votes}</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border-soft)' }}>
                  <div className="h-full rounded-full" style={{ width: `${option.percent}%`, background: 'var(--moss)' }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>
            {tally.total} total
          </p>
        </div>
      )}

      {responses.length === 0 ? (
        <div className="admin-card text-center text-sm" style={{ color: 'var(--ink-3)' }}>
          Nothing yet. Share the link and check back.
        </div>
      ) : (
        <div className="admin-card">
          {responses.map((response) => (
            <div key={response.id} className="admin-row grid-cols-1 last:border-0">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full font-serif text-sm" style={{ background: 'rgba(110,124,82,.12)', color: 'var(--moss)' }}>
                  {response.avatar_url ? <img src={response.avatar_url} alt="" className="h-full w-full object-cover" /> : response.name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{response.name}</p>
                    {response.declared_name && response.declared_name !== response.name && (
                      <span className="admin-chip" style={{ background: 'var(--border-soft)', color: 'var(--ink-3)' }}>calls themself “{response.declared_name}”</span>
                    )}
                    {response.referral_source && (
                      <span className="admin-chip" style={{ background: 'rgba(92,122,137,.14)', color: 'var(--fjord)' }}>via {response.referral_source.replace(/_/g, ' ')}</span>
                    )}
                    {response.campaign_blocked && <span className="admin-chip" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>blocked</span>}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>
                    {response.email || 'no email'}{response.created_at && ` · ${new Date(response.created_at).toLocaleString()}`}
                  </p>

                  {response.poll_option_label && (
                    <p className="mt-2 text-sm" style={{ color: 'var(--ink-2)' }}>Voted: <strong>{response.poll_option_label}</strong></p>
                  )}
                  {response.answer_text && (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>“{response.answer_text}”</p>
                  )}
                  {response.photo_url && (
                    <div className="mt-3">
                      <img src={response.photo_url} alt="" className="max-h-72 rounded-xl object-cover" />
                      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>
                        {response.moderation_status}{response.photo_size_label && ` · ${response.photo_size_label}`}
                        {response.published_media_id && ' · in gallery'}
                      </p>
                    </div>
                  )}

                  {response.photo_url && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {response.moderation_status !== 'approved' && (
                        <button onClick={() => void moderate(response, 'approved')} className="btn-outline !py-1.5 !text-xs"><Check size={13} /> Approve</button>
                      )}
                      {response.moderation_status !== 'rejected' && (
                        <button onClick={() => void moderate(response, 'rejected')} className="btn-outline !py-1.5 !text-xs"><X size={13} /> Reject</button>
                      )}
                      {response.moderation_status === 'approved' && !response.published_media_id && (
                        <button
                          onClick={() => { setPublishing(response); setTitle(response.answer_text?.slice(0, 60) || `Photo from ${response.name}`); }}
                          className="btn-outline !py-1.5 !text-xs"
                        >
                          <ImageIcon size={13} /> Add to gallery
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <KebabMenu
                  actions={[
                    { label: 'Block from this campaign', icon: <Ban size={15} />, onClick: () => void block(response, false) },
                    { label: 'Block from all campaigns', icon: <Ban size={15} />, onClick: () => void block(response, true) },
                    { label: 'Delete response', icon: <Trash2 size={15} />, danger: true, onClick: () => setRemoving(response) },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={publishing !== null}
        title="Add this photo to your gallery"
        description="This copies the photo into your public media library. It is the only way a guest photo becomes public."
        onClose={() => setPublishing(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setPublishing(null)} className="btn-outline !py-2.5">Cancel</button>
            <button onClick={publish} disabled={busy} className="btn-primary !py-2.5 disabled:opacity-60">{busy ? 'Adding…' : 'Add to gallery'}</button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextField label="Title" value={title} onChange={setTitle} placeholder="A photo from a reader" />
          <TextField label="Category" value={category} onChange={setCategory} placeholder="Campaigns" />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
            Please make sure the person is happy for this to be shown publicly before you add it.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        title="Delete this response?"
        description={`The response from ${removing?.name} will be removed permanently.`}
        confirmLabel="Delete it"
        tone="destructive"
        onConfirm={removeResponse}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BlocksCard({ campaigns }: { campaigns: AdminCampaign[] }) {
  const { success, error: toastError } = useToast();
  const load = useCallback(() => api.admin.campaignBlocks.list(), []);
  const { data: blocks, loading, reload } = useResource(load, []);

  const byCampaign = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.id, campaign.title])),
    [campaigns],
  );

  const lift = async (id: number, name: string) => {
    try { await api.admin.campaignBlocks.remove(id); await reload(); success(`${name} can take part again.`); }
    catch (err) { toastError(err instanceof Error ? err.message : 'Could not lift this block.'); }
  };

  if (loading || blocks.length === 0) return null;

  return (
    <div className="admin-card">
      <p className="field-label">Blocked from campaigns</p>
      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
        Separate from blocking someone in People — these visitors can still read the site and message you.
      </p>
      <div className="mt-3">
        {blocks.map((block) => (
          <div key={block.id} className="admin-row grid-cols-1 last:border-0">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm" style={{ color: 'var(--ink)' }}>{block.name}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>
                  {block.campaign_id ? byCampaign.get(block.campaign_id) || block.campaign_title || 'One campaign' : 'All campaigns'}
                  {block.reason && ` · ${block.reason}`}
                </p>
              </div>
              <button onClick={() => void lift(block.id, block.name)} className="btn-outline !py-1.5 !text-xs">Lift</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
