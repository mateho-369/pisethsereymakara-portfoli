import { useEffect, useState } from 'react';
import {
  ArrowRight, Check, Coffee, Copy, Download, ExternalLink, Heart,
  MessageCircle, QrCode, Sparkles, X, ZoomIn,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { useContent } from '../contexts/ContentContext';
import { api } from '../lib/api';
import { socialIcon } from '../lib/icons';
import type { Profile } from '../types';

export default function SupportPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [zoomedQr, setZoomedQr] = useState(false);
  const { text } = useContent();

  useEffect(() => {
    api.profile.get()
      .then(setProfile)
      .catch((err) => setError(err.message || 'Could not load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const copyPageUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore clipboard error
    }
  };

  if (loading) return <LoadingState label="Opening support page…" />;
  if (error || !profile) {
    return (
      <div className="page-shell py-28 text-center">
        <p className="eyebrow justify-center">Support</p>
        <h1 className="mt-5 font-serif text-4xl" style={{ color: 'var(--ink)' }}>Could not load support details</h1>
        <p className="mt-4 text-sm" style={{ color: 'var(--ink-3)' }}>{error || 'Please try again in a moment.'}</p>
        <Link to="/" className="btn-primary mt-8">Return home</Link>
      </div>
    );
  }

  const socialEntries = Object.entries(profile.social_links || {});

  return (
    <div className="page-shell py-14 md:py-24">
      {/* ── Page Header ── */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow justify-center mb-3">
          <Sparkles size={13} /> {text('support.eyebrow', 'Support & Connect')}
        </p>
        <h1 className="font-serif text-[clamp(2.4rem,6vw,4.2rem)] leading-tight tracking-tight" style={{ color: 'var(--ink)' }}>
          {text('support.title', 'Support this work')}
        </h1>
        <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--ink-2)' }}>
          {text(
            'support.subtitle',
            'Made slowly, shared warmly. If my photographs, field notes, or projects have brought you peace or inspiration, here are ways to support.',
          )}
        </p>

        {/* Creator Identity summary */}
        <div
          className="mt-8 inline-flex items-center gap-4 rounded-full border px-5 py-2.5"
          style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}
        >
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="text-left">
            <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--ink)' }}>{profile.display_name}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--ink-4)' }}>{profile.location}</p>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="mx-auto mt-14 grid max-w-4xl gap-8 lg:grid-cols-12">
        {/* Left Column: KHQR Card (7 cols) */}
        <div className="lg:col-span-7">
          <div
            className="relative overflow-hidden rounded-[1.8rem] p-6 sm:p-9"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Horizon top accent line */}
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#6E7C52] via-[#D9A441] to-[#5C7A89]" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl font-serif text-sm font-semibold"
                  style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}
                >
                  <Coffee size={18} />
                </span>
                <div>
                  <h2 className="font-serif text-xl" style={{ color: 'var(--ink)' }}>
                    {text('support.qr_card_title', 'KHQR Support')}
                  </h2>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: 'var(--moss)' }}>
                    Bakong · Cambodia
                  </p>
                </div>
              </div>

              <span
                className="rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.14em]"
                style={{ background: 'rgba(110,124,82,.12)', color: 'var(--moss)' }}
              >
                Zero Fees
              </span>
            </div>

            {/* QR Image Frame */}
            <div className="mt-7">
              {profile.support_qr_url ? (
                <div className="flex flex-col items-center">
                  <div
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 transition-all duration-300 hover:scale-[1.01]"
                    style={{ borderColor: 'var(--border-soft)', boxShadow: 'var(--shadow-md)' }}
                    onClick={() => setZoomedQr(true)}
                  >
                    <img
                      src={profile.support_qr_url}
                      alt="KHQR Donation Code"
                      className="h-64 w-64 max-w-full rounded-xl object-contain sm:h-72 sm:w-72"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-neutral-800 shadow-md">
                        <ZoomIn size={14} /> Click to enlarge
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => setZoomedQr(true)}
                      className="btn-outline !px-4 !py-2 text-xs"
                      title="Enlarge QR Code"
                    >
                      <ZoomIn size={14} /> Enlarge
                    </button>
                    <a
                      href={profile.support_qr_url}
                      download="Piseth-Serey-Makara-KHQR.jpg"
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline !px-4 !py-2 text-xs"
                      title="Open or save image"
                    >
                      <Download size={14} /> Save QR
                    </a>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-14 text-center"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}>
                    <QrCode size={24} />
                  </span>
                  <p className="mt-4 font-serif text-lg" style={{ color: 'var(--ink)' }}>QR Code coming soon</p>
                  <p className="mt-1 max-w-xs text-xs" style={{ color: 'var(--ink-3)' }}>
                    You can still support by following along or sharing kind words via the links below.
                  </p>
                </div>
              )}
            </div>

            {/* Support Caption / Note */}
            <div
              className="mt-6 rounded-xl p-4 text-center sm:text-left"
              style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-soft)' }}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {profile.support_caption ||
                  text(
                    'support.default_caption',
                    'If this space or any of my work helped or inspired you, buying me a coffee or sending a kind tip means a lot 🙏',
                  )}
              </p>
            </div>

            {/* Instruction footnote */}
            <p className="mt-5 text-center text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>
              Scan with Bakong or any mobile banking app in Cambodia (ABA, ACLEDA, Canadia, Wing, Sathapana, etc.).
            </p>
          </div>
        </div>

        {/* Right Column: Social Links & Alternative Support (5 cols) */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          {/* Social Channels Card */}
          <div
            className="rounded-[1.8rem] p-6 sm:p-7"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: 'rgba(110,124,82,.12)', color: 'var(--moss)' }}
              >
                <Heart size={16} />
              </span>
              <div>
                <h3 className="font-serif text-lg" style={{ color: 'var(--ink)' }}>
                  {text('support.links_title', 'Connect & Follow')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
                  {text('support.links_subtitle', 'Follow my work and updates across the web')}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {socialEntries.length > 0 ? (
                socialEntries.map(([name, url]) => {
                  const Icon = socialIcon(name);
                  const isMailOrTel = url.startsWith('mailto:') || url.startsWith('tel:');
                  const cleanLabel = name.charAt(0).toUpperCase() + name.slice(1);
                  let displayUrl = url.replace(/^https?:\/\/(www\.)?/, '').replace(/^mailto:/, '');
                  if (displayUrl.length > 28) displayUrl = displayUrl.slice(0, 26) + '…';

                  return (
                    <a
                      key={name}
                      href={url}
                      target={isMailOrTel ? undefined : '_blank'}
                      rel={isMailOrTel ? undefined : 'noreferrer'}
                      className="group flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-all hover:scale-[1.01]"
                      style={{
                        borderColor: 'var(--border-soft)',
                        background: 'var(--bg)',
                        color: 'var(--ink)',
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors group-hover:bg-moss/20"
                          style={{ background: 'var(--bg-surface)', color: 'var(--moss)' }}
                        >
                          <Icon size={17} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight group-hover:text-moss">{cleanLabel}</p>
                          <p className="truncate font-mono text-[10px] text-ink-4 opacity-75">{displayUrl}</p>
                        </div>
                      </div>
                      <ExternalLink size={14} className="shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
                    </a>
                  );
                })
              ) : (
                <p className="py-4 text-center text-xs" style={{ color: 'var(--ink-4)' }}>No links added yet.</p>
              )}
            </div>
          </div>

          {/* Say Hello / Chat Card */}
          <div
            className="rounded-[1.8rem] p-6 sm:p-7"
            style={{
              background: 'var(--bg-muted)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                style={{ background: 'var(--gold-pale)', color: 'var(--gold-deep)' }}
              >
                <MessageCircle size={16} />
              </span>
              <div>
                <h3 className="font-serif text-lg leading-tight" style={{ color: 'var(--ink)' }}>
                  {text('support.chat_title', 'Send a kind note')}
                </h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                  {text('support.chat_body', 'A few warm words or questions are just as appreciated as a coffee.')}
                </p>
                <Link to="/chat" className="btn-primary mt-4 !px-4 !py-2 text-xs">
                  {text('support.chat_cta', 'Say hello in chat')} <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* Share Page Button */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border px-5 py-4" style={{ borderColor: 'var(--border-soft)', background: 'var(--bg-surface)' }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Share this page</p>
              <p className="text-[11px]" style={{ color: 'var(--ink-4)' }}>Copy direct link to your clipboard</p>
            </div>
            <button
              onClick={copyPageUrl}
              className="btn-outline !px-3.5 !py-1.5 text-xs"
              aria-label="Copy link"
            >
              {copiedLink ? (
                <>
                  <Check size={13} className="text-moss" /> Copied!
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Quote / Philosophy Banner ── */}
      {profile.quote && (
        <div className="mx-auto mt-16 max-w-2xl text-center">
          <blockquote
            className="font-serif text-lg italic leading-relaxed sm:text-xl"
            style={{ color: 'var(--ink-2)' }}
          >
            "{profile.quote}"
          </blockquote>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--ink-4)' }}>
            — {profile.display_name}
          </p>
        </div>
      )}

      {/* ── QR Zoom Modal ── */}
      {zoomedQr && profile.support_qr_url && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setZoomedQr(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[92vw] overflow-hidden rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedQr(false)}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-700 transition hover:bg-neutral-200"
              aria-label="Close zoomed view"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <p className="font-serif text-xl font-semibold text-neutral-900">
                {profile.display_name} — KHQR
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">Scan with any Bakong banking app</p>
            </div>

            <div className="mt-5 flex justify-center">
              <img
                src={profile.support_qr_url}
                alt="Enlarged KHQR Code"
                className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-sm"
              />
            </div>

            {profile.support_caption && (
              <p className="mx-auto mt-4 max-w-md text-center text-xs text-neutral-600">
                {profile.support_caption}
              </p>
            )}

            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setZoomedQr(false)}
                className="btn-primary !px-6 !py-2 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
