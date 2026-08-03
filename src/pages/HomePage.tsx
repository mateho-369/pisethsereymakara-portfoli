import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowRight, BookOpen, Camera, Coffee, Code2, Compass, Heart, Leaf, MapPin, Mountain, Music, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { Favorite, MediaItem, Profile } from '../types';
import LoadingState from '../components/LoadingState';
import { api } from '../lib/api';

const favoriteIcons: Record<string, typeof Leaf> = { leaf: Leaf, camera: Camera, coffee: Coffee, code: Code2, compass: Compass, mountain: Mountain, music: Music, book: BookOpen };
const reveal = { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.18 }, transition: { duration: 0.7, ease: 'easeOut' as const } };

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    Promise.all([api.profile.get(), api.favorites.list(), api.media.list()])
      .then(([p, f, m]) => { setProfile(p); setFavorites(f); setMedia(m); })
      .catch((err) => setError(err.message || 'The page could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [loading, location.hash]);

  if (loading) return <LoadingState />;
  if (error || !profile) return (
    <div className="page-shell py-28">
      <div className="error-card">
        <p>{error || 'Profile not found.'}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-5">Try again</button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="hero-glow" />
        <div className="page-shell relative flex min-h-[calc(100vh-76px)] flex-col justify-center py-20 md:py-28">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85 }} className="max-w-4xl">
            <p className="eyebrow mb-6"><Sparkles size={13} /> A quiet corner of the internet</p>
            <h1 className="font-serif text-[clamp(3.8rem,10vw,8.6rem)] leading-[0.88] tracking-[-0.065em]" style={{ color: 'var(--ink)' }}>
              {profile.display_name.split(' ').map((word, i) => (
                <span key={word} style={i === 1 ? { color: 'var(--moss)' } : {}}>{word}{' '}</span>
              ))}
            </h1>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <p className="max-w-xl text-lg leading-relaxed sm:text-xl" style={{ color: 'var(--ink-2)' }}>{profile.role_title}</p>
              <span className="hidden h-px w-12 sm:block" style={{ background: 'var(--gold)', opacity: .6 }} />
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--ink-3)' }}>
                <MapPin size={13} />{profile.location}
              </span>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/gallery" className="btn-primary">View gallery <ArrowRight size={17} /></Link>
              <Link to="/chat" className="btn-outline">Say hello <ArrowRight size={17} /></Link>
            </div>
          </motion.div>
          <div className="absolute bottom-10 left-5 right-5 flex items-center gap-4 sm:left-8 sm:right-8">
            <span className="h-px flex-1 bg-gradient-to-r from-[#6E7C52] via-[#D9A441] to-[#5C7A89]" />
            <ArrowDown size={16} className="animate-gentle-bob" style={{ color: 'var(--moss)' }} />
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="page-shell py-24 md:py-32">
        <motion.div {...reveal} className="grid items-center gap-12 lg:grid-cols-[1.05fr_.85fr] lg:gap-20">
          <div>
            <p className="eyebrow">01 · About me</p>
            <h2 className="section-title mt-5" style={{ color: 'var(--ink)' }}>
              Making room for<br /><em className="font-normal" style={{ color: 'var(--fjord)' }}>wonder.</em>
            </h2>
            <p className="mt-7 max-w-2xl text-lg leading-[1.85]" style={{ color: 'var(--ink-2)' }}>{profile.bio}</p>
            <blockquote className="mt-8 border-l-2 pl-5 font-serif text-xl italic leading-relaxed" style={{ borderColor: 'var(--gold)', color: 'var(--ink)' }}>
              "{profile.quote}"
            </blockquote>
          </div>
          <div className="relative mx-auto max-w-md">
            <div className="absolute -inset-3 rounded-[2rem] blur-xl" style={{ background: 'linear-gradient(135deg, rgba(217,164,65,.25), transparent, rgba(92,122,137,.25))' }} />
            <img src={profile.avatar_url} alt={`${profile.display_name} outdoors`} className="relative aspect-[4/5] w-full rounded-[1.7rem] object-cover" style={{ boxShadow: 'var(--shadow-xl)' }} />
            <span className="absolute -bottom-4 -left-4 rounded-full border px-4 py-2 font-mono text-[9px] uppercase tracking-[0.18em]" style={{ borderColor: 'rgba(217,164,65,.25)', background: 'var(--bg-surface)', color: 'var(--ink-3)' }}>
              Here, now, grateful
            </span>
          </div>
        </motion.div>
      </section>

      {/* ── Favorites ── */}
      <section id="favorites" className="scroll-mt-24 py-24 md:py-32" style={{ background: 'color-mix(in srgb, var(--bg-surface) 70%, transparent)' }}>
        <div className="page-shell">
          <motion.div {...reveal} className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">02 · Small joys</p>
              <h2 className="section-title mt-5" style={{ color: 'var(--ink)' }}>Things I love</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              A collection of things that keep me curious, grounded, and moving gently through the world.
            </p>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {favorites.map((fav, i) => {
              const Icon = favoriteIcons[fav.icon] || Heart;
              return (
                <motion.article key={fav.id} {...reveal} transition={{ duration: 0.55, delay: i * 0.05 }} className="favorite-card group">
                  <span className="grid h-11 w-11 place-items-center rounded-full transition-colors" style={{ background: 'rgba(110,124,82,.1)', color: 'var(--moss)' }}>
                    <Icon size={20} strokeWidth={1.7} />
                  </span>
                  <h3 className="mt-7 font-serif text-2xl" style={{ color: 'var(--ink)' }}>{fav.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>{fav.description}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Gallery preview ── */}
      <section className="page-shell py-24 md:py-32">
        <motion.div {...reveal} className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">03 · Field journal</p>
            <h2 className="section-title mt-5" style={{ color: 'var(--ink)' }}>From the gallery</h2>
          </div>
          <Link to="/gallery" className="text-link">View full gallery <ArrowRight size={16} /></Link>
        </motion.div>
        <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[230px] md:grid-cols-4">
          {media.slice(0, 5).map((item, i) => (
            <Link to="/gallery" key={item.id} className={`gallery-preview group ${i === 0 ? 'col-span-2 row-span-2' : i === 3 ? 'col-span-2' : ''}`}>
              <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1F18]/70 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-90" />
              <div className="absolute bottom-0 left-0 p-4" style={{ color: '#F8F4E9' }}>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-75">{item.category}</span>
                <p className="mt-1 font-serif text-lg">{item.title}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="page-shell pb-12">
        <motion.div {...reveal} className="relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-12 md:py-20" style={{ background: 'var(--bg-muted)' }}>
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: 'rgba(217,164,65,.08)' }} />
          <p className="eyebrow relative justify-center" style={{ color: 'var(--gold)' }}>The door is open</p>
          <h2 className="relative mt-5 font-serif text-4xl tracking-tight sm:text-5xl" style={{ color: 'var(--ink)' }}>
            Let's exchange a few kind words.
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl" style={{ color: 'var(--ink-2)' }}>
            No pitch, no pressure. Just a quiet conversation about ideas, images, or whatever is bringing you hope lately.
          </p>
          <Link to="/chat" className="btn-primary relative mt-8">Start a conversation <ArrowRight size={17} /></Link>
        </motion.div>
      </section>
    </>
  );
}
