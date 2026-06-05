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

export type ThemePresetId = 'rose-ember' | 'midnight-violet' | 'ocean-sapphire';
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

// Shape that screens consume: every token pre-resolved to a color string,
// plus a helper for alpha variants.
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
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
  /** Raw triplets, for callers that need alpha via withAlpha(). */
  raw: ThemeTokens;
  /** hsla() of a token at the given alpha (0..1). */
  withAlpha: (token: keyof ThemeColors | string, alpha: number) => string;
  /** The brand wordmark gradient stops (primary-light → primary → tertiary). */
  gradient: [string, string, string];
}

export function buildColors(presetId: ThemePresetId, mode: ColorMode): ThemeColors {
  const t = resolveTokens(presetId, mode);
  const get = (k: string) => hsl(t[k]);
  return {
    background: get('background'),
    foreground: get('foreground'),
    card: get('card'),
    cardForeground: get('cardForeground'),
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
    raw: t,
    withAlpha: (token, alpha) => hsl(t[token as string] ?? t.primary, alpha),
    // Matches web .gradient-text: linear-gradient(primary-light, primary, tertiary/0.8)
    gradient: [hsl(t.primaryLight), hsl(t.primary), hsl(t.tertiary, 0.8)],
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
