import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { cloneElement, isValidElement, type ReactElement } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

/**
 * Global typography. We ship Inter (the quiet "this is a real product" upgrade
 * over the OS default) and apply it to EVERY <Text>/<TextInput> without touching
 * call sites.
 *
 * The catch: a custom fontFamily on Android ignores `fontWeight`, so naive
 * application would flatten all our 600/700 headers to regular. We solve it by
 * mapping the requested weight to the matching Inter face and dropping the now-
 * redundant `fontWeight`. Any explicit `fontFamily` in a style still wins.
 */

function familyForWeight(weight?: string | number): string {
  switch (String(weight)) {
    case '500':
      return 'Inter_500Medium';
    case '600':
      return 'Inter_600SemiBold';
    case '700':
    case 'bold':
      return 'Inter_700Bold';
    case '800':
    case '900':
      return 'Inter_800ExtraBold';
    default:
      return 'Inter_400Regular';
  }
}

let patched = false;

/** Monkeypatch Text/TextInput render once to inject the Inter family. */
function patchDefaultFont() {
  if (patched) return;
  patched = true;

  for (const Comp of [Text, TextInput] as const) {
    // forwardRef components expose their render fn as `.render`.
    const anyComp = Comp as unknown as { render?: (...a: unknown[]) => unknown };
    const orig = anyComp.render;
    if (typeof orig !== 'function') continue;

    anyComp.render = function patchedRender(...args: unknown[]) {
      const el = orig.apply(this, args);
      if (!isValidElement(el)) return el;

      const typed = el as ReactElement<{ style?: unknown }>;
      const flat = (StyleSheet.flatten(typed.props.style) || {}) as Record<string, unknown>;
      const family = (flat.fontFamily as string) ?? familyForWeight(flat.fontWeight as string);
      const { fontWeight: _drop, ...rest } = flat;

      return cloneElement(typed, { style: { ...rest, fontFamily: family } });
    };
  }
}

/**
 * Loads Inter and applies it globally. Returns whether fonts are ready — the
 * splash screen should stay up until they are.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  if (loaded) patchDefaultFont();
  return loaded;
}
