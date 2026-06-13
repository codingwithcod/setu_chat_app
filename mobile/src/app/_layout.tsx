import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DialogProvider } from '@/components/ui/DialogProvider';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useAppFonts } from '@/theme/fonts';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

/** Redirect between the (auth) and (tabs) groups based on session state. */
function useAuthGate() {
  const { isAuthenticated, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';

    // Google OAuth users land on select-username while authenticated — let them
    // stay there to finish profile setup instead of bouncing them to (tabs).
    const onSelectUsername = (segments[1] as string) === 'select-username';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup && !onSelectUsername) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, initializing, segments, router]);
}

function RootNavigator() {
  const { initializing } = useAuth();
  const { hydrated, colors, scheme } = useTheme();
  const fontsLoaded = useAppFonts();
  useAuthGate();

  useEffect(() => {
    if (!initializing && hydrated && fontsLoaded) SplashScreen.hideAsync();
  }, [initializing, hydrated, fontsLoaded]);

  // Paint the NATIVE root/window background to match the theme. Without this the
  // window defaults to white and flashes through during native-stack slide
  // transitions (e.g. pressing back out of a chat). contentStyle/navTheme only
  // theme the JS scenes, not the native layer behind them.
  useEffect(() => {
    try {
      SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
    } catch {
      // never let a color-parse issue take down startup
    }
  }, [colors.background]);

  // Override React Navigation's theme so the navigator container itself uses
  // our themed background — otherwise its default white shows through during
  // screen transitions (the back-navigation flash).
  const navTheme = useMemo<NavigationTheme>(() => {
    const base = scheme === 'dark' ? NavDarkTheme : NavDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.card,
        border: colors.border,
        primary: colors.primary,
        text: colors.foreground,
      },
    };
  }, [scheme, colors]);

  if (initializing || !hydrated || !fontsLoaded) return null;

  return (
    <NavigationThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="group/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="new-group" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="sessions" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <DialogProvider>
                <AuthProvider>
                  <RootNavigator />
                </AuthProvider>
              </DialogProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
