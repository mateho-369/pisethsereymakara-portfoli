import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarClock, Camera, CheckCircle2, ImageUp, Lock, MessageSquareQuote,
  ShieldCheck, Vote,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { signInWithGoogle } from '../lib/googleAuth';
import { useResource } from '../lib/useResource';
import { MAX_UPLOAD_BYTES, sizeLabel } from '../lib/useUpload';
import { useToast } from '../components/ui/Toast';
import LoadingState from '../components/LoadingState';
import type { CampaignState, PublicCampaign } from '../types';

const REFERRAL_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  telegram: 'Telegram',
  friend: 'A friend told me',
  other: 'Somewhere else',
  prefer_not_to_say: 'Prefer not to say',
};

const CLOSED_COPY: Record<Exclude<CampaignState, 'open'>, { title: string; body: string }> = {
  draft: { title: 'Not open yet', body: 'This campaign has not been shared publicly.' },
  scheduled: { title: 'Not open yet', body: 'This campaign has not started. Please come back a little later.' },
  ended: { title: 'This has ended', body: 'Thank you for stopping by — this campaign is no longer accepting responses.' },
  closed: { title: 'This is closed', body: 'The owner has closed this campaign. Responses are no longer accepted.' },
};

const TYPE_ICON = { poll: Vote, question: MessageSquareQuote, photo: Camera } as const;

/**
 * The public campaign page behind /ask/{slug}.
 *
 * Identity here is strictly self-only: a visitor sees their own account and
 * their own submission, never anybody else's. Poll tallies are aggregate
 * numbers with no names attached. There is no tracking of any kind — the
 * "where did you find this?" question is asked, optional and skippable.
 */
export default function CampaignPage() {
  const { slug = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const load = useCallback(() => api.campaigns.get(slug), [slug]);
  const { data: campaign, setData, loading, error } = useResource<PublicCampaign | null>(load, null);

  const [choice, setChoice] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [referral, setReferral] = useState('');
  const [declaredName, setDeclaredName] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const returnTo = `/ask/${slug}`;
  const Icon = campaign ? TYPE_ICON[campaign.type] : Vote;

  const showResults = useMemo(() => Boolean(campaign?.results), [campaign]);

  if (loading || authLoading) return <LoadingState label="Opening the campaign…" />;

  if (error || !campaign) {
    return (
      <div className="page-shell py-28 text-center">
        <p className="eyebrow justify-center">Nothing here</p>
        <h1 className="mt-5 font-serif text-4xl" style={{ color: 'var(--ink)' }}>This link is not available</h1>
        <p className="mt-4 text-sm" style={{ color: 'var(--ink-3)' }}>{error || 'The campaign may have been removed.'}</p>
        <Link to="/" className="btn-primary mt-8">Return home</Link>
      </div>
    );
  }

  const mine = campaign.my_response;
  const canEdit = campaign.is_open && (!mine || campaign.allow_updates);

  const submit = async () => {
    setBusy(true);
    try {
      const shared = {
        referral_source: referral || null,
        declared_name: declaredName.trim() || null,
      };

      if (campaign.type === 'poll') {
        if (!choice) throw new Error('Please choose one option first.');
        const result = await api.campaigns.respond(slug, { ...shared, poll_option_id: choice });
        setData(result.campaign);
        success('Your vote is in. Thank you.');
      } else if (campaign.type === 'question') {
        if (answer.trim().length < 2) throw new Error('Please write a short reply first.');
        const result = await api.campaigns.respond(slug, { ...shared, answer_text: answer.trim() });
        setData(result.campaign);
        setAnswer('');
        success('Your reply has been sent — only the owner can read it.');
      } else {
        if (!photo) throw new Error('Please choose a photo first.');
        if (photo.size > MAX_UPLOAD_BYTES) throw new Error('Please choose a photo smaller than 4 MB.');
        const { key } = await api.campaigns.uploadPhoto(photo);
        const result = await api.campaigns.respond(slug, {
          ...shared,
          photo_key: key,
          photo_size_label: sizeLabel(photo.size),
          answer_text: answer.trim() || undefined,
        });
        setData(result.campaign);
        setPhoto(null);
        setAnswer('');
        if (fileInput.current) fileInput.current.value = '';
        success('Your photo has been sent privately to the owner.');
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'That could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell py-14 md:py-20">
      <div className="mx-auto w-full max-w-[640px]">
        <div className="relative overflow-hidden rounded-[1.6rem] p-6 sm:p-9" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xl)' }}>
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#6E7C52] via-[#D9A441] to-[#5C7A89]" />

          <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
            <Icon size={21} />
          </span>

          <p className="eyebrow mt-7">
            {campaign.type === 'poll' ? 'A quick vote' : campaign.type === 'question' ? 'Ask me anything' : 'Send a photo'}
          </p>
          <h1 className="mt-3 font-serif text-[clamp(1.9rem,4vw,2.7rem)] leading-tight tracking-tight" style={{ color: 'var(--ink)' }}>
            {campaign.title}
          </h1>
          {campaign.prompt && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>{campaign.prompt}</p>
          )}

          {campaign.end_date && campaign.is_open && (
            <p className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>
              <CalendarClock size={13} /> Open until {new Date(campaign.end_date).toLocaleDateString()}
            </p>
          )}

          {/* Closed / not-active state. The server enforces this too. */}
          {!campaign.is_open && (
            <div className="mt-7 rounded-2xl p-5" style={{ background: 'var(--gold-pale)', border: '1px solid var(--border-soft)' }}>
              <p className="flex items-center gap-2 font-serif text-xl" style={{ color: 'var(--gold-deep)' }}>
                <Lock size={17} /> {CLOSED_COPY[campaign.state as Exclude<CampaignState, 'open'>]?.title || 'This is closed'}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {CLOSED_COPY[campaign.state as Exclude<CampaignState, 'open'>]?.body || 'Responses are no longer accepted.'}
              </p>
            </div>
          )}

          {campaign.is_blocked && (
            <div className="mt-7 rounded-2xl p-5" style={{ background: 'rgba(164,82,60,.08)', border: '1px solid rgba(164,82,60,.25)' }}>
              <p className="font-medium" style={{ color: '#A4523C' }}>You cannot take part in campaigns.</p>
              <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>The rest of the site is still open to you.</p>
            </div>
          )}

          {/* Signed-out: an explicit, knowing login. Never anonymous tracking. */}
          {!user && campaign.is_open && (
            <div className="mt-8 rounded-2xl p-5" style={{ background: 'var(--bg)', border: '1px solid var(--border-soft)' }}>
              <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--ink)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--moss)' }} /> Please sign in to respond
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                Your name and picture from the account you choose are shown to the owner, so everyone here is accountable
                for what they send. Nothing else about you is collected.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => signInWithGoogle(returnTo)} className="btn-primary !py-2.5">Continue with Google</button>
                <button onClick={() => navigate('/login', { state: { from: returnTo } })} className="btn-outline !py-2.5">Use email instead</button>
              </div>
            </div>
          )}

          {/* Signed in: show only their own identity. */}
          {user && (
            <div className="mt-8 flex items-center gap-3 rounded-2xl p-4" style={{ background: 'var(--bg)', border: '1px solid var(--border-soft)' }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full font-serif" style={{ background: 'rgba(110,124,82,.12)', color: 'var(--moss)' }}>
                {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Responding as {user.name}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-4)' }}>The owner sees this name and picture.</p>
              </div>
            </div>
          )}

          {/* Already answered */}
          {mine && (
            <div className="mt-5 rounded-2xl p-5" style={{ background: 'rgba(110,124,82,.09)', border: '1px solid var(--border-soft)' }}>
              <p className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--moss)' }}>
                <CheckCircle2 size={16} /> Your response was received
              </p>
              {campaign.type === 'question' && mine.answer_text && (
                <p className="mt-2.5 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>“{mine.answer_text}”</p>
              )}
              {campaign.type === 'photo' && mine.photo_url && (
                <>
                  <img src={mine.photo_url} alt="Your submission" className="mt-3 max-h-64 w-full rounded-xl object-cover" />
                  <p className="mt-2 text-xs" style={{ color: 'var(--ink-4)' }}>
                    Private — only you and the owner can see this. Status: {mine.moderation_status}.
                  </p>
                </>
              )}
              {campaign.allow_updates && campaign.is_open && (
                <p className="mt-2 text-xs" style={{ color: 'var(--ink-4)' }}>You may replace it below.</p>
              )}
            </div>
          )}

          {/* The form */}
          {user && canEdit && !campaign.is_blocked && (
            <div className="mt-7 space-y-5">
              {campaign.type === 'poll' && (
                <div className="space-y-2.5">
                  {campaign.options.map((option) => {
                    const selected = choice === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setChoice(option.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm transition"
                        style={{
                          border: `1px solid ${selected ? 'var(--moss)' : 'var(--border)'}`,
                          background: selected ? 'rgba(110,124,82,.1)' : 'var(--bg)',
                          color: 'var(--ink)',
                        }}
                      >
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full" style={{ border: `1.5px solid ${selected ? 'var(--moss)' : 'var(--border)'}` }}>
                          {selected && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--moss)' }} />}
                        </span>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {campaign.type === 'question' && (
                <label className="block">
                  <span className="field-label">Your reply</span>
                  <textarea
                    className="input-field mt-2 resize-y leading-relaxed"
                    rows={4}
                    maxLength={1000}
                    value={answer}
                    placeholder="Write something kind…"
                    onChange={(event) => setAnswer(event.target.value)}
                  />
                  <span className="mt-1.5 block text-xs" style={{ color: 'var(--ink-4)' }}>
                    Only the owner will read this. It is never shown publicly.
                  </span>
                </label>
              )}

              {campaign.type === 'photo' && (
                <div className="space-y-3">
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => setPhoto(event.target.files?.[0] || null)}
                  />
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-8 text-sm transition"
                    style={{ border: '1px dashed var(--border)', background: 'var(--bg)', color: 'var(--ink-2)' }}
                  >
                    <ImageUp size={18} />
                    {photo ? `${photo.name} · ${sizeLabel(photo.size)}` : 'Choose a photo (up to 4 MB)'}
                  </button>
                  <label className="block">
                    <span className="field-label">A word about it (optional)</span>
                    <input className="input-field mt-2" maxLength={500} value={answer} placeholder="Where was this?" onChange={(event) => setAnswer(event.target.value)} />
                  </label>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                    Your photo stays private between you and the owner. It never appears in the public gallery unless
                    the owner asks you first and adds it deliberately.
                  </p>
                </div>
              )}

              {/* Self-declared, entirely optional. Not tracking. */}
              {campaign.ask_referral && (
                <div className="rounded-2xl p-4" style={{ background: 'var(--bg)', border: '1px solid var(--border-soft)' }}>
                  <p className="field-label">Where did you find this link? (optional)</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {campaign.referral_sources.map((source) => {
                      const selected = referral === source;
                      return (
                        <button
                          key={source}
                          onClick={() => setReferral(selected ? '' : source)}
                          className="rounded-full px-3.5 py-2 text-xs transition"
                          style={{
                            border: `1px solid ${selected ? 'var(--moss)' : 'var(--border)'}`,
                            background: selected ? 'rgba(110,124,82,.12)' : 'transparent',
                            color: selected ? 'var(--moss)' : 'var(--ink-2)',
                          }}
                        >
                          {REFERRAL_LABELS[source] || source}
                        </button>
                      );
                    })}
                  </div>
                  <label className="mt-3 block">
                    <span className="field-label">What should the owner call you? (optional)</span>
                    <input className="input-field mt-2" maxLength={80} value={declaredName} placeholder={user?.name || 'Your name'} onChange={(event) => setDeclaredName(event.target.value)} />
                  </label>
                  <p className="mt-2 text-xs" style={{ color: 'var(--ink-4)' }}>
                    Both are optional — skip them and simply send.
                  </p>
                </div>
              )}

              <button onClick={submit} disabled={busy} className="btn-primary w-full justify-center disabled:opacity-60">
                {busy ? 'Sending…' : mine ? 'Replace my response' : campaign.type === 'poll' ? 'Send my vote' : 'Send'}
              </button>
            </div>
          )}

          {/* Poll tally — aggregate only, no identities. */}
          {campaign.type === 'poll' && showResults && campaign.results && (
            <div className="mt-8">
              <p className="eyebrow">Results</p>
              <div className="mt-4 space-y-3">
                {campaign.results.options.map((option) => (
                  <div key={option.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span style={{ color: 'var(--ink)' }}>{option.label}</span>
                      <span className="font-mono text-xs" style={{ color: 'var(--ink-3)' }}>{option.percent}% · {option.votes}</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--border-soft)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${option.percent}%`, background: 'var(--moss)' }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[.14em]" style={{ color: 'var(--ink-4)' }}>
                {campaign.results.total} {campaign.results.total === 1 ? 'vote' : 'votes'} · no names shown
              </p>
            </div>
          )}

          {campaign.type === 'poll' && !showResults && mine && (
            <p className="mt-6 text-sm" style={{ color: 'var(--ink-3)' }}>
              Thank you for voting. The results will be shared when this campaign closes.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
          This page never tries to work out who you are. Nothing is recorded unless you sign in and send it yourself.
        </p>
      </div>
    </div>
  );
}
