import type { SeasonalTheme } from '../contexts/ContentContext';

/**
 * Data-driven ambient particle presets — one entry per seasonal theme.
 *
 * Everything about a theme's drifting layer (shape, count, speed, opacity,
 * direction) is declared here, so `AmbientParticles` stays a single generic
 * renderer instead of one-off code per holiday. Switching `theme.active` in the
 * studio swaps which preset renders; nothing else has to change.
 *
 * The motion itself is plain CSS `@keyframes` driven by per-particle custom
 * properties (see `index.css`). That keeps every looping particle on the
 * compositor thread rather than re-rendering through React/framer-motion on
 * each frame, which matters because this runs in every visitor's browser.
 */

/** Inclusive `[min, max]` range; each particle picks a random value inside it. */
export type Range = [min: number, max: number];

export type ParticleShape = 'snowflake' | 'bat' | 'petal' | 'lantern' | 'lotus' | 'wisp' | 'fog';

/** Travel direction across the viewport. */
export type ParticleMotion = 'fall' | 'rise' | 'cross';

export interface ParticleLayer {
  /** Stable key — presets may stack two layers (e.g. bats above ground fog). */
  id: string;
  shape: ParticleShape;
  motion: ParticleMotion;
  /** Particles in this layer at "normal" intensity, before device scaling. */
  count: number;
  /** Rendered shape size, px. */
  size: Range;
  /** Seconds for one full traversal. Longer = calmer. */
  duration: Range;
  /** Peak opacity, 0–1. */
  opacity: Range;
  /** Sideways drift amplitude, px (vertical flutter for `cross` layers). */
  sway: Range;
  /** Seconds per sway cycle. */
  swayDuration: Range;
  /** Degrees of slow rotation per cycle. Omit for shapes that shouldn't spin. */
  spin?: Range;
  /** Vertical bob amplitude, px — used instead of `spin` for floating lights. */
  bob?: Range;
  /**
   * Tints picked at random per particle. These are CSS custom properties, not
   * literals, so each theme can carry a different palette in light and dark
   * mode — white snow is invisible on the light `#EEF2EA` background, and the
   * dark-mode equivalents would be far too hot the other way around. The
   * values live beside the theme's colour tokens in `index.css`.
   */
  colors: string[];
  /** Gaussian blur, px — softens fog and smoke. */
  blur?: number;
  /** Adds a soft radial halo behind the shape. */
  glow?: boolean;
  /** Vertical band the layer occupies, in vh. Only used by `cross` layers. */
  band?: Range;
}

export interface ParticlePreset {
  /** Short description shown in the studio so the owner knows what renders. */
  description: string;
  layers: ParticleLayer[];
}

export const PARTICLE_PRESETS: Partial<Record<SeasonalTheme, ParticlePreset>> = {
  /* Snowflakes drifting down with a gentle side-to-side sway and slow spin. */
  christmas: {
    description: 'Snowflakes drifting down, swaying gently as they fall.',
    layers: [
      {
        id: 'snow',
        shape: 'snowflake',
        motion: 'fall',
        count: 22,
        size: [7, 17],
        duration: [12, 24],
        opacity: [0.35, 0.75],
        sway: [12, 40],
        swayDuration: [4, 9],
        spin: [180, 360],
        colors: ['var(--ambient-1)', 'var(--ambient-2)', 'var(--ambient-3)'],
        glow: true,
      },
    ],
  },

  /* Deliberately sparse: a few bats crossing high up, low fog along the floor. */
  halloween: {
    description: 'A few bats drifting across, with a low ground mist.',
    layers: [
      {
        id: 'bats',
        shape: 'bat',
        motion: 'cross',
        count: 5,
        size: [16, 30],
        duration: [22, 38],
        opacity: [0.22, 0.42],
        sway: [14, 34],
        swayDuration: [2.4, 4.5],
        colors: ['var(--ambient-1)', 'var(--ambient-2)', 'var(--ambient-3)'],
        band: [6, 42],
      },
      {
        id: 'mist',
        shape: 'fog',
        motion: 'cross',
        count: 4,
        size: [90, 190],
        duration: [55, 90],
        opacity: [0.1, 0.2],
        sway: [8, 18],
        swayDuration: [12, 22],
        colors: ['var(--ambient-4)', 'var(--ambient-5)'],
        blur: 26,
        band: [80, 97],
      },
    ],
  },

  /* Rumdul petals — Cambodia's national flower — falling warm and unhurried. */
  'khmer-new-year': {
    description: 'Rumdul flower petals drifting down, warm and celebratory.',
    layers: [
      {
        id: 'petals',
        shape: 'petal',
        motion: 'fall',
        count: 20,
        size: [11, 22],
        duration: [13, 26],
        opacity: [0.4, 0.8],
        sway: [22, 60],
        swayDuration: [5, 10],
        spin: [200, 400],
        colors: ['var(--ambient-1)', 'var(--ambient-2)', 'var(--ambient-3)', 'var(--ambient-4)'],
      },
    ],
  },

  /*
   * Pchum Ben is an ancestor-remembrance festival, not a celebration, so this
   * preset intentionally reads quieter than the others: no sparkle, no bright
   * motion — just a little drifting lotus and a slow thread of incense smoke,
   * at low opacity and roughly half the particle count of the festive themes.
   */
  'pchum-ben': {
    description: 'Quiet lotus petals and slow incense smoke — subdued, for a day of remembrance.',
    layers: [
      {
        id: 'lotus',
        shape: 'lotus',
        motion: 'fall',
        count: 9,
        size: [13, 24],
        duration: [30, 46],
        opacity: [0.1, 0.24],
        sway: [16, 40],
        swayDuration: [10, 18],
        spin: [60, 150],
        colors: ['var(--ambient-1)', 'var(--ambient-2)', 'var(--ambient-3)'],
      },
      {
        id: 'incense',
        shape: 'wisp',
        motion: 'rise',
        count: 5,
        size: [16, 30],
        duration: [34, 54],
        opacity: [0.06, 0.14],
        sway: [18, 46],
        swayDuration: [12, 20],
        colors: ['var(--ambient-4)', 'var(--ambient-5)'],
        blur: 5,
      },
    ],
  },

  /* Loy pratip — small lantern lights lifting off the water with a soft bob. */
  'bon-om-touk': {
    description: 'Floating lantern lights drifting upward with a gentle bob.',
    layers: [
      {
        id: 'lanterns',
        shape: 'lantern',
        motion: 'rise',
        count: 18,
        size: [5, 13],
        duration: [16, 30],
        opacity: [0.3, 0.7],
        sway: [14, 44],
        swayDuration: [6, 12],
        bob: [3, 8],
        colors: ['var(--ambient-1)', 'var(--ambient-2)', 'var(--ambient-3)', 'var(--ambient-4)'],
        glow: true,
      },
    ],
  },
};

/** Density options exposed in the studio; scales every layer's count. */
export const PARTICLE_INTENSITIES = ['subtle', 'normal', 'lively'] as const;
export type ParticleIntensity = typeof PARTICLE_INTENSITIES[number];

export const INTENSITY_SCALE: Record<ParticleIntensity, number> = {
  subtle: 0.55,
  normal: 1,
  lively: 1.35,
};

export const INTENSITY_LABELS: Record<ParticleIntensity, string> = {
  subtle: 'Subtle — about half the particles',
  normal: 'Normal — the tuned default',
  lively: 'Lively — a touch busier',
};

/** Hard ceiling per theme, whatever the intensity. Keeps phones comfortable. */
export const MAX_PARTICLES = 25;

export function isParticleIntensity(value: string): value is ParticleIntensity {
  return (PARTICLE_INTENSITIES as readonly string[]).includes(value);
}

export function presetFor(theme: SeasonalTheme): ParticlePreset | null {
  return PARTICLE_PRESETS[theme] ?? null;
}
