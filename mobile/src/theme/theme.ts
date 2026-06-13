/**
 * Central theme system — ported 1:1 from the web app so colors match exactly.
 *
 * Source of truth on web:
 *   - Base semantic tokens: src/app/globals.css  (:root and .dark)
 *   - Color presets:        src/lib/theme-config.ts  (THEME_PRESETS + DARK_OVERRIDES)
 *
 * On web these are CSS variables (HSL triplets). React Native has no CSS vars,
 * so we store the same "H S% L%" triplets and resolve them to hsl()/hsla()
 * color strings that RN understands. Every screen reads colors from the
 * ThemeProvider — never hardcode a color anywhere.
 */

export type ThemePresetId =
  | 'rose-ember'
  | 'midnight-violet'
  | 'ocean-sapphire'
  | 'midnight-black';
export type ColorMode = 'light' | 'dark';
export type ThemeModePreference = 'light' | 'dark' | 'system';

/** A raw HSL triplet, e.g. "340 75% 55%" (no hsl() wrapper, no commas). */
type Hsl = string;

// ─── Base semantic tokens (globals.css :root / .dark) ────────────────
// Primary-related tokens are filled in by the active preset, so they are
// intentionally omitted here.
const LIGHT_BASE = {
  background: '0 0% 100%',
  foreground: '222.2 84% 4.9%',
  card: '0 0% 100%',
  cardForeground: '222.2 84% 4.9%',
  popover: '0 0% 100%',
  popoverForeground: '222.2 84% 4.9%',
  secondary: '210 40% 96.1%',
  secondaryForeground: '222.2 47.4% 11.2%',
  muted: '210 40% 96.1%',
  mutedForeground: '215.4 16.3% 46.9%',
  destructive: '0 84.2% 60.2%',
  destructiveForeground: '210 40% 98%',
  border: '214.3 31.8% 91.4%',
  input: '214.3 31.8% 91.4%',
  sidebar: '240 20% 97%',
  sidebarForeground: '222.2 84% 4.9%',
  success: '142 71% 45%',
  successForeground: '0 0% 100%',
  warning: '38 92% 50%',
  warningForeground: '0 0% 100%',
  info: '187 92% 53%',
  // Raised surface — a step above `card` for sheets/headers/elevated rows.
  surface: '0 0% 98.5%',
} as const;

const DARK_BASE = {
  background: '240 10% 3.9%',
  foreground: '0 0% 95%',
  card: '240 10% 5.5%',
  cardForeground: '0 0% 95%',
  popover: '240 10% 5.5%',
  popoverForeground: '0 0% 95%',
  secondary: '240 5% 15%',
  secondaryForeground: '0 0% 95%',
  muted: '240 5% 15%',
  mutedForeground: '240 5% 64.9%',
  destructive: '0 62.8% 30.6%',
  destructiveForeground: '0 0% 95%',
  border: '240 5% 17%',
  input: '240 5% 17%',
  sidebar: '240 10% 5%',
  sidebarForeground: '0 0% 95%',
  success: '142 71% 45%',
  successForeground: '0 0% 100%',
  warning: '45 93% 47%',
  warningForeground: '0 0% 100%',
  info: '187 92% 53%',
  // Raised surface — sits a touch above `card` (5.5%) to give elevated
  // elements (sheets, headers, FAB, pressed rows) a sense of depth.
  surface: '240 8% 10%',
} as const;

// ─── Color presets (theme-config.ts THEME_PRESETS) ───────────────────
export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  /** Hex swatch for rendering the selector UI. */
  swatch: string;
  /** Primary-family token overrides (light mode). */
  variables: Record<string, Hsl>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'rose-ember',
    name: 'Rose Ember',
    description: 'Bold & unique',
    swatch: '#e84393',
    variables: {
      primary: '340 75% 55%',
      primaryForeground: '210 40% 98%',
      primaryLight: '340 70% 70%',
      primaryGradientEnd: '15 80% 55%',
      tertiary: '20 85% 58%',
      ring: '340 75% 55%',
      sidebarAccent: '340 70% 95%',
      accent: '340 70% 95%',
      accentForeground: '340 70% 25%',
    },
  },
  {
    id: 'midnight-violet',
    name: 'Midnight Violet',
    description: 'Sleek & modern',
    swatch: '#7c5cfc',
    variables: {
      primary: '250 67% 55%',
      primaryForeground: '210 40% 98%',
      primaryLight: '250 67% 72%',
      primaryGradientEnd: '270 65% 58%',
      tertiary: '285 65% 60%',
      ring: '250 67% 55%',
      sidebarAccent: '250 67% 95%',
      accent: '250 67% 95%',
      accentForeground: '250 67% 25%',
    },
  },
  {
    id: 'ocean-sapphire',
    name: 'Ocean Sapphire',
    description: 'Clean & professional',
    swatch: '#2d7ff9',
    variables: {
      primary: '217 90% 55%',
      primaryForeground: '210 40% 98%',
      primaryLight: '210 85% 68%',
      primaryGradientEnd: '195 85% 50%',
      tertiary: '190 80% 52%',
      ring: '217 90% 55%',
      sidebarAccent: '217 80% 95%',
      accent: '217 80% 95%',
      accentForeground: '217 80% 25%',
    },
  },
  {
    id: 'midnight-black',
    name: 'Midnight Black',
    description: 'Pure black & white',
    swatch: '#111111',
    // Pure-grayscale (0% saturation) monochrome. These are the LIGHT-mode
    // values (white theme); DARK_OVERRIDES['midnight-black'] flips them to a pure-black
    // theme. Accent is a mode-appropriate soft gray, so the derived own-bubble
    // (mixBlack(primary)) + primaryForeground naturally give a light bubble with
    // dark text in the black theme. auroraFrom/auroraTo == background mute the
    // page glow; primaryGradientEnd == primary flattens every UI gradient.
    variables: {
      background: '0 0% 100%',
      foreground: '0 0% 9%',
      card: '0 0% 100%',
      cardForeground: '0 0% 9%',
      popover: '0 0% 100%',
      popoverForeground: '0 0% 9%',
      surface: '0 0% 97%',
      secondary: '0 0% 94%',
      secondaryForeground: '0 0% 12%',
      muted: '0 0% 95%',
      mutedForeground: '0 0% 40%',
      border: '0 0% 88%',
      input: '0 0% 88%',
      sidebar: '0 0% 98%',
      sidebarForeground: '0 0% 9%',
      primary: '0 0% 20%',
      primaryForeground: '0 0% 100%',
      primaryLight: '0 0% 45%',
      primaryGradientEnd: '0 0% 20%',
      tertiary: '0 0% 35%',
      ring: '0 0% 20%',
      accent: '0 0% 92%',
      accentForeground: '0 0% 15%',
      sidebarAccent: '0 0% 92%',
      auroraFrom: '0 0% 100%',
      auroraTo: '0 0% 100%',
      // Own bubble decoupled from the accent: light surface, dark text (the
      // mirror of the dark theme below).
      bubbleOwnFrom: '0 0% 90%',
      bubbleOwnTo: '0 0% 85%',
      bubbleOwnText: '0 0% 10%',
      replyOwnBg: '0 0% 80%',
      // Dark logo tile + near-black wordmark (white theme).
      brandTile: '0 0% 12%',
      brandWordmark: '0 0% 9%',
    },
  },
];

// Dark-mode overrides for the accent family (theme-config.ts DARK_OVERRIDES).
const DARK_OVERRIDES: Record<ThemePresetId, Record<string, Hsl>> = {
  'midnight-violet': {
    sidebarAccent: '250 67% 12%',
    accent: '250 67% 15%',
    accentForeground: '250 30% 90%',
  },
  'ocean-sapphire': {
    sidebarAccent: '217 80% 12%',
    accent: '217 80% 15%',
    accentForeground: '217 30% 90%',
  },
  'rose-ember': {
    sidebarAccent: '340 70% 12%',
    accent: '340 70% 15%',
    accentForeground: '340 30% 90%',
  },
  // Midnight Black flips to a pure-black theme. Every token set in its
  // `variables` (light values) is re-stated here with its dark value, since
  // variables apply to both modes. Accent becomes a light soft-gray (visible on
  // black); the own bubble is a deep near-black with white text.
  'midnight-black': {
    background: '0 0% 0%',
    foreground: '0 0% 96%',
    card: '0 0% 6%',
    cardForeground: '0 0% 96%',
    popover: '0 0% 6%',
    popoverForeground: '0 0% 96%',
    surface: '0 0% 9%',
    secondary: '0 0% 14%',
    secondaryForeground: '0 0% 96%',
    muted: '0 0% 14%',
    mutedForeground: '0 0% 60%',
    border: '0 0% 16%',
    input: '0 0% 16%',
    sidebar: '0 0% 4%',
    sidebarForeground: '0 0% 96%',
    primary: '0 0% 82%',
    primaryForeground: '0 0% 8%',
    primaryLight: '0 0% 92%',
    primaryGradientEnd: '0 0% 82%',
    tertiary: '0 0% 70%',
    ring: '0 0% 82%',
    accent: '0 0% 16%',
    accentForeground: '0 0% 90%',
    sidebarAccent: '0 0% 16%',
    auroraFrom: '0 0% 0%',
    auroraTo: '0 0% 0%',
    // Deep, near-black own bubble + white text (darker than the charcoal
    // incoming bubble so your messages read as the darkest surface).
    bubbleOwnFrom: '0 0% 12%',
    bubbleOwnTo: '0 0% 7%',
    bubbleOwnText: '0 0% 98%',
    replyOwnBg: '0 0% 18%',
    // Dark logo tile (distinct from the black bg) + white wordmark.
    brandTile: '0 0% 18%',
    brandWordmark: '0 0% 98%',
  },
};

export const DEFAULT_PRESET: ThemePresetId = 'rose-ember';
export const DEFAULT_MODE: ThemeModePreference = 'system';

/** The full set of resolved tokens (raw HSL triplets) for one preset + mode. */
export type ThemeTokens = Record<string, Hsl>;

/**
 * Merge base tokens + preset + dark overrides — mirrors the web's
 * applyThemePreset(). Returns raw HSL triplets keyed by token name.
 */
export function resolveTokens(presetId: ThemePresetId, mode: ColorMode): ThemeTokens {
  const preset = THEME_PRESETS.find((p) => p.id === presetId) ?? THEME_PRESETS[0];
  const base = mode === 'dark' ? DARK_BASE : LIGHT_BASE;
  const merged: ThemeTokens = { ...base, ...preset.variables };
  if (mode === 'dark') Object.assign(merged, DARK_OVERRIDES[preset.id]);
  return merged;
}

/** Convert a stored "H S% L%" triplet into an RN-parseable color string. */
export function hsl(triplet: Hsl, alpha?: number): string {
  const [h, s, l] = triplet.split(/\s+/);
  return alpha === undefined
    ? `hsl(${h}, ${s}, ${l})`
    : `hsla(${h}, ${s}, ${l}, ${alpha})`;
}

/** Parse an "H S% L%" triplet to [r, g, b] (0–255). */
function hslToRgb(triplet: Hsl): [number, number, number] {
  const [hs, ss, ls] = triplet.split(/\s+/);
  const h = parseFloat(hs);
  const s = parseFloat(ss) / 100;
  const l = parseFloat(ls) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g] = [c, x];
  else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x];
  else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/**
 * CSS `color-mix(in srgb, <color> percent%, #000 (100-percent)%)` — i.e. mix a
 * color with black. Since black contributes 0, each channel = channel * pct/100.
 * Used to match the web's gradient bubble + reply-inset colors.
 */
export function mixBlack(triplet: Hsl, percent: number): string {
  const [r, g, b] = hslToRgb(triplet);
  const f = percent / 100;
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
}

// Shape that screens consume: every token pre-resolved to a color string,
// plus a helper for alpha variants.
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  surface: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  primaryLight: string;
  primaryGradientEnd: string;
  tertiary: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarAccent: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  /**
   * Tint stops for the ambient page Aurora glow. Default to primary /
   * primaryGradientEnd so every colored theme adjusts automatically; a preset
   * may override them (e.g. Midnight Black sets both to `background`) to mute the glow —
   * all controlled by color, with no per-screen conditions.
   */
  auroraFrom: string;
  auroraTo: string;
  /** Raw triplets, for callers that need alpha via withAlpha(). */
  raw: ThemeTokens;
  /** hsla() of a token at the given alpha (0..1). */
  withAlpha: (token: keyof ThemeColors | string, alpha: number) => string;
  /** The brand wordmark gradient stops (primary-light → primary → tertiary). */
  gradient: [string, string, string];
  /** Logo tile background. Defaults to primary; a preset may override (e.g.
   *  Midnight Black uses a dark tile so the white mark reads). */
  brandTile: string;
  /** When set, the "Setu" wordmark renders as this solid color instead of the
   *  gradient (e.g. Midnight Black: white in dark mode, black in light). Null = gradient. */
  brandWordmark: string | null;
  /**
   * Own message bubble gradient stops. Defaults to primary darkened (6% → 20%)
   * to match web, but a preset may override via `bubbleOwnFrom`/`bubbleOwnTo`
   * tokens to decouple the bubble from the accent (e.g. Midnight Black: a dark bubble with
   * a light accent).
   */
  bubbleOwn: [string, string];
  /** Text/meta color on your own bubble. Defaults to primaryForeground. */
  bubbleOwnText: string;
  /** Reply-preview inset background inside own bubbles (near-black w/ primary tint). */
  replyOwnBg: string;
}

export function buildColors(presetId: ThemePresetId, mode: ColorMode): ThemeColors {
  const t = resolveTokens(presetId, mode);
  const get = (k: string) => hsl(t[k]);
  return {
    background: get('background'),
    foreground: get('foreground'),
    card: get('card'),
    cardForeground: get('cardForeground'),
    surface: get('surface'),
    popover: get('popover'),
    popoverForeground: get('popoverForeground'),
    primary: get('primary'),
    primaryForeground: get('primaryForeground'),
    primaryLight: get('primaryLight'),
    primaryGradientEnd: get('primaryGradientEnd'),
    tertiary: get('tertiary'),
    secondary: get('secondary'),
    secondaryForeground: get('secondaryForeground'),
    muted: get('muted'),
    mutedForeground: get('mutedForeground'),
    accent: get('accent'),
    accentForeground: get('accentForeground'),
    destructive: get('destructive'),
    destructiveForeground: get('destructiveForeground'),
    border: get('border'),
    input: get('input'),
    ring: get('ring'),
    sidebar: get('sidebar'),
    sidebarForeground: get('sidebarForeground'),
    sidebarAccent: get('sidebarAccent'),
    success: get('success'),
    successForeground: get('successForeground'),
    warning: get('warning'),
    warningForeground: get('warningForeground'),
    info: get('info'),
    // Default the aurora tint to the brand gradient so any colored theme works
    // out of the box; presets can override `auroraFrom`/`auroraTo` to mute it.
    auroraFrom: t.auroraFrom ? hsl(t.auroraFrom) : get('primary'),
    auroraTo: t.auroraTo ? hsl(t.auroraTo) : get('primaryGradientEnd'),
    raw: t,
    withAlpha: (token, alpha) => hsl(t[token as string] ?? t.primary, alpha),
    // Matches web .gradient-text: linear-gradient(primary-light, primary, tertiary/0.8)
    gradient: [hsl(t.primaryLight), hsl(t.primary), hsl(t.tertiary, 0.8)],
    brandTile: t.brandTile ? hsl(t.brandTile) : get('primary'),
    brandWordmark: t.brandWordmark ? hsl(t.brandWordmark) : null,
    // .msg-bubble-sent: linear-gradient(primary 94%/black, primary 80%/black).
    // A preset may override the stops to decouple the bubble from the accent.
    bubbleOwn:
      t.bubbleOwnFrom && t.bubbleOwnTo
        ? [hsl(t.bubbleOwnFrom), hsl(t.bubbleOwnTo)]
        : [mixBlack(t.primary, 94), mixBlack(t.primary, 80)],
    bubbleOwnText: t.bubbleOwnText ? hsl(t.bubbleOwnText) : get('primaryForeground'),
    // .reply-preview-own: color-mix(primary 12%, #000 88%) — overridable so it
    // tracks the bubble surface when the bubble is decoupled from the accent.
    replyOwnBg: t.replyOwnBg ? hsl(t.replyOwnBg) : mixBlack(t.primary, 12),
  };
}

// Layout constants (radius from globals.css --radius: 0.75rem = 12px).
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Dark-tuned elevation presets. Shadows are near-invisible on dark backgrounds,
 * so these lean on a soft, slightly-spread black plus Android `elevation`.
 * For a branded lift, pass a color (e.g. primary) as `shadowColor` at the call
 * site — see `glow()`.
 */
export const Elevation = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

/**
 * A colored "glow" shadow — used to give primary buttons/FABs a branded lift.
 * `color` should be a solid color string (e.g. colors.primary).
 */
export function glow(color: string, strength: 'sm' | 'md' = 'md') {
  return strength === 'sm'
    ? {
        shadowColor: color,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 6,
      }
    : {
        shadowColor: color,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55,
        shadowRadius: 16,
        elevation: 12,
      };
}
