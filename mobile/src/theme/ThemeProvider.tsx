import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  buildColors,
  DEFAULT_MODE,
  DEFAULT_PRESET,
  Radius,
  Spacing,
  THEME_PRESETS,
  type ColorMode,
  type ThemeColors,
  type ThemeModePreference,
  type ThemePresetId,
} from './theme';

// Same storage keys as the web app would use under the "setu-" namespace.
const PRESET_KEY = 'setu-theme-preset';
const MODE_KEY = 'setu-theme-mode';

interface ThemeContextValue {
  /** Active color preset (rose-ember | midnight-violet | ocean-sapphire). */
  preset: ThemePresetId;
  /** User preference: light | dark | system. */
  mode: ThemeModePreference;
  /** Resolved scheme after applying `system`. */
  scheme: ColorMode;
  /** Fully resolved colors for the current preset + scheme. */
  colors: ThemeColors;
  presets: typeof THEME_PRESETS;
  radius: typeof Radius;
  spacing: typeof Spacing;
  setPreset: (id: ThemePresetId) => void;
  setMode: (mode: ThemeModePreference) => void;
  /** True until persisted preferences have been loaded. */
  hydrated: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preset, setPresetState] = useState<ThemePresetId>(DEFAULT_PRESET);
  const [mode, setModeState] = useState<ThemeModePreference>(DEFAULT_MODE);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted preferences once on mount.
  useEffect(() => {
    (async () => {
      try {
        const [savedPreset, savedMode] = await AsyncStorage.multiGet([
          PRESET_KEY,
          MODE_KEY,
        ]);
        const p = savedPreset[1];
        const m = savedMode[1];
        if (p && THEME_PRESETS.some((x) => x.id === p)) {
          setPresetState(p as ThemePresetId);
        }
        if (m === 'light' || m === 'dark' || m === 'system') {
          setModeState(m);
        }
      } catch {
        // Fall back to defaults on any storage error.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setPreset = useCallback((id: ThemePresetId) => {
    setPresetState(id);
    AsyncStorage.setItem(PRESET_KEY, id).catch(() => {});
  }, []);

  const setMode = useCallback((next: ThemeModePreference) => {
    setModeState(next);
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
  }, []);

  const scheme: ColorMode =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const colors = useMemo(() => buildColors(preset, scheme), [preset, scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preset,
      mode,
      scheme,
      colors,
      presets: THEME_PRESETS,
      radius: Radius,
      spacing: Spacing,
      setPreset,
      setMode,
      hydrated,
    }),
    [preset, mode, scheme, colors, setPreset, setMode, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
