import { useEffect, useMemo, useRef, useState } from 'react';
import { useContent } from '../contexts/ContentContext';
import {
  INTENSITY_SCALE,
  MAX_PARTICLES,
  presetFor,
  type ParticleLayer,
  type ParticleShape,
  type Range,
} from '../lib/particlePresets';

/**
 * The ambient drifting layer for seasonal themes — snow, petals, lanterns…
 *
 * One generic renderer for every theme: it reads the preset for the active
 * theme (see `lib/particlePresets.ts`) and emits a handful of absolutely
 * positioned nodes whose entire animation lives in CSS `@keyframes`, fed by
 * per-particle custom properties (`--p-left`, `--p-delay`, `--p-duration`…).
 *
 * Deliberately *not* framer-motion. framer-motion is the right tool everywhere
 * else in this app, but it animates via JS on the main thread; for ~20 shapes
 * looping forever that competes with scrolling and input. Plain CSS transforms
 * and opacity stay on the compositor, so the layer costs close to nothing.
 *
 * Three guardrails, all handled here:
 *   • `prefers-reduced-motion` — the layer is never mounted at all.
 *   • hidden tab — animations are paused, so a backgrounded phone stops working.
 *   • `pointer-events: none` throughout — nothing can ever swallow a click.
 */

/** Small deterministic PRNG, so a given theme always lays out the same way. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashString = (value: string) =>
  [...value].reduce((acc, char) => (Math.imul(acc, 31) + char.charCodeAt(0)) | 0, 7);

interface Particle {
  key: string;
  shape: ParticleShape;
  motion: ParticleLayer['motion'];
  style: React.CSSProperties;
  blur?: number;
  glow?: boolean;
  color: string;
  size: number;
  spins: boolean;
  bobs: boolean;
  swayAxis: 'x' | 'y';
}

function buildParticles(layer: ParticleLayer, scale: number, seedKey: string): Particle[] {
  const random = mulberry32(hashString(`${seedKey}:${layer.id}`));
  const pick = ([min, max]: Range) => min + random() * (max - min);
  const round = (value: number, places = 2) => Number(value.toFixed(places));

  const count = Math.max(1, Math.min(MAX_PARTICLES, Math.round(layer.count * scale)));
  const crossing = layer.motion === 'cross';

  return Array.from({ length: count }, (_, index) => {
    const size = round(pick(layer.size), 1);
    const duration = round(pick(layer.duration));
    const color = layer.colors[Math.floor(random() * layer.colors.length)];

    // Spread the initial delays across a full cycle (plus a little extra) so the
    // field looks mid-flight on load instead of arriving as one visible wave.
    const delay = round(-random() * duration * 1.35);
    const swayDirection = random() > 0.5 ? 1 : -1;

    const style: React.CSSProperties & Record<string, string | number> = {
      '--p-size': `${size}px`,
      '--p-duration': `${duration}s`,
      '--p-delay': `${delay}s`,
      '--p-opacity': round(pick(layer.opacity)),
      '--p-sway': `${round(pick(layer.sway) * swayDirection, 1)}px`,
      '--p-sway-duration': `${round(pick(layer.swayDuration))}s`,
    };

    if (crossing) {
      const band = layer.band ?? [10, 90];
      style['--p-top'] = `${round(pick(band))}vh`;
      // Reverse roughly half the crossings so traffic moves both ways.
      style['--p-direction'] = random() > 0.5 ? 'normal' : 'reverse';
    } else {
      style['--p-left'] = `${round(random() * 100)}vw`;
    }

    if (layer.spin) {
      style['--p-spin'] = `${round(pick(layer.spin) * (random() > 0.5 ? 1 : -1))}deg`;
      style['--p-spin-duration'] = `${round(duration * (0.6 + random() * 0.6))}s`;
    }

    if (layer.bob) {
      style['--p-bob'] = `${round(pick(layer.bob), 1)}px`;
      style['--p-bob-duration'] = `${round(1.8 + random() * 2.4)}s`;
    }

    return {
      key: `${layer.id}-${index}`,
      shape: layer.shape,
      motion: layer.motion,
      style,
      blur: layer.blur,
      glow: layer.glow,
      color,
      size,
      spins: Boolean(layer.spin),
      bobs: Boolean(layer.bob),
      swayAxis: crossing ? 'y' : 'x',
    };
  });
}

/** The drawn shape itself. Sized by `--p-size`, tinted by `currentColor`. */
function Shape({ shape, color, blur, glow }: { shape: ParticleShape; color: string; blur?: number; glow?: boolean }) {
  const filter = blur ? `blur(${blur}px)` : undefined;

  if (shape === 'lantern') {
    return (
      <span
        className="ambient-shape ambient-shape-lantern"
        style={{ background: `radial-gradient(circle, ${color} 0%, ${color} 32%, transparent 72%)`, filter }}
      />
    );
  }

  if (shape === 'fog' || shape === 'wisp') {
    return (
      <span
        className={`ambient-shape ambient-shape-${shape}`}
        style={{ background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)`, filter }}
      />
    );
  }

  const paths: Record<string, React.ReactNode> = {
    snowflake: (
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none">
        <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
        <path d="M12 6.4l-2.1-2.1M12 6.4l2.1-2.1M12 17.6l-2.1 2.1M12 17.6l2.1 2.1" />
        <path d="M6.4 12l-2.1-2.1M6.4 12l-2.1 2.1M17.6 12l2.1-2.1M17.6 12l2.1 2.1" />
      </g>
    ),
    petal: (
      // Rumdul-like petal: an asymmetric, slightly curled teardrop. The
      // off-centre tip keeps it from reading as a plain leaf as it spins.
      <path
        fill="currentColor"
        d="M13.2 2c4.9 4 6.9 8.2 5.8 12.4-1 4.2-4.7 7.2-10.9 8.9-2-3.7-2.4-7.2-1.2-10.6C8.1 9.3 10.2 5.8 13.2 2z"
      />
    ),
    lotus: (
      // Side petals first, centre petal last — drawing the centre on top hides
      // the seam where the outer petals cross at the base.
      <g fill="currentColor">
        <path opacity="0.5" d="M3.7 8.8c3.1 1.1 5.3 2.9 6.7 5.2 1.4 2.3 2 4.9 1.7 7.7-2.9-1.1-5-2.8-6.4-5.1-1.4-2.4-2.1-4.9-2-7.8z" />
        <path opacity="0.5" d="M20.3 8.8c.1 2.9-.6 5.4-2 7.8-1.4 2.3-3.5 4-6.4 5.1-.3-2.8.3-5.4 1.7-7.7 1.4-2.3 3.6-4.1 6.7-5.2z" />
        <path d="M12 2.3c2.7 3.4 4 6.9 4 10.4 0 3.6-1.3 7.1-4 10.4-2.7-3.3-4-6.8-4-10.4 0-3.5 1.3-7 4-10.4z" />
      </g>
    ),
    bat: (
      <path
        fill="currentColor"
        d="M12 8.4c.7 0 1.3.6 1.5 1.4.9-1.1 2-2.1 3.3-2.6 1.4-.6 2.8-.6 4.2-.1-.9.7-1.4 1.6-1.5 2.7-.1 1.1.2 2.1.9 3-1.5-.4-2.9-.2-4.1.6-1 .7-1.8 1.7-2.3 3-.5-1-1.2-1.6-2-1.6s-1.5.6-2 1.6c-.5-1.3-1.3-2.3-2.3-3-1.2-.8-2.6-1-4.1-.6.7-.9 1-1.9.9-3-.1-1.1-.6-2-1.5-2.7 1.4-.5 2.8-.5 4.2.1 1.3.5 2.4 1.5 3.3 2.6.2-.8.8-1.4 1.5-1.4z"
      />
    ),
  };

  return (
    <svg
      className={`ambient-shape ambient-shape-${shape}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ color, filter: glow ? `${filter ? `${filter} ` : ''}drop-shadow(0 0 3px ${color})` : filter }}
    >
      {paths[shape]}
    </svg>
  );
}

export default function AmbientParticles() {
  const { activeTheme, particlesEnabled, particleIntensity } = useContent();
  const [allowed, setAllowed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [densityScale, setDensityScale] = useState(1);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Respect prefers-reduced-motion. Persistent drifting motion is a genuine
  // accessibility problem (nausea, vestibular discomfort), so when the visitor
  // has asked for less motion we don't mount the layer at all — and we keep
  // listening, so flipping the OS setting takes effect without a reload.
  // Narrow viewports get a smaller field too: fewer nodes, less battery.
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const smallScreen = window.matchMedia('(max-width: 640px)');

    const sync = () => {
      setAllowed(!motionQuery.matches);
      setDensityScale(smallScreen.matches ? 0.6 : 1);
    };

    sync();
    motionQuery.addEventListener('change', sync);
    smallScreen.addEventListener('change', sync);
    return () => {
      motionQuery.removeEventListener('change', sync);
      smallScreen.removeEventListener('change', sync);
    };
  }, []);

  // Freeze the field while the tab is in the background. Hidden animations still
  // burn cycles in some browsers; pausing keeps a pocketed phone quiet.
  useEffect(() => {
    const sync = () => setPaused(document.visibilityState === 'hidden');
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const preset = presetFor(activeTheme);
  const scale = INTENSITY_SCALE[particleIntensity] * densityScale;

  const particles = useMemo(
    () => (preset ? preset.layers.flatMap((layer) => buildParticles(layer, scale, activeTheme)) : []),
    [preset, scale, activeTheme],
  );

  if (!allowed || !particlesEnabled || !preset || particles.length === 0) return null;

  return (
    <div ref={fieldRef} className="ambient-field" data-paused={paused} data-theme={activeTheme} aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.key}
          className={`ambient-particle ambient-particle-${particle.motion}`}
          style={particle.style}
        >
          <div className={`ambient-sway ambient-sway-${particle.swayAxis}`}>
            <div
              className={[
                'ambient-spin',
                particle.spins ? 'is-spinning' : '',
                particle.bobs ? 'is-bobbing' : '',
              ].filter(Boolean).join(' ')}
            >
              <Shape shape={particle.shape} color={particle.color} blur={particle.blur} glow={particle.glow} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
