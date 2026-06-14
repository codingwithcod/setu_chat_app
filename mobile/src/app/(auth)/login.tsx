import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // The auth gate redirects to the tabs once the session is set.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();

      switch (result.action) {
        case 'select_username':
          router.replace({
            pathname: '/(auth)/select-username' as const as '/(auth)/login',
            params: {
              firstName: result.firstName ?? '',
              lastName: result.lastName ?? '',
            },
          } as never);
          break;
        case 'verify_totp':
          // TODO: Navigate to TOTP verification if implemented on mobile.
          // For now, proceed to tabs — the server has authenticated them.
          break;
        case 'blocked':
          setError(
            'Google account not linked\n\nYour account was created with email and password. To sign in with Google, first log in with your password, then connect Google from Settings → Linked Accounts.'
          );
          break;
        case 'proceed':
          // Auth state change listener in AuthContext will trigger navigation.
          break;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Google sign-in failed.';
      // Don't show "cancelled" as an error — the user intentionally closed.
      if (!msg.toLowerCase().includes('cancel')) {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <Screen padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo size="lg" />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Welcome back
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Sign in to continue to your conversations
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              password
              autoCapitalize="none"
              textContentType="password"
            />

            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Forgot password?
              </Text>
            </Link>

            {error && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {error}
              </Text>
            )}

            <Button label="Sign in" onPress={onSubmit} loading={loading} />

            {/* Divider */}
            <View style={styles.dividerWrap}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
                or continue with
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Button
              label={googleLoading ? 'Signing in...' : 'Continue with Google'}
              onPress={onGoogleSignIn}
              variant="outline"
              loading={googleLoading}
              disabled={loading}
              left={!googleLoading ? <GoogleIcon /> : undefined}
            />
          </View>

          <View style={styles.footer}>
            <Text style={{ color: colors.mutedForeground }}>
              Don&apos;t have an account?{' '}
            </Text>
            <Link href="/(auth)/register">
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                Sign up
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32, gap: 32 },
  header: { alignItems: 'center', gap: 10 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 15, textAlign: 'center' },
  form: { gap: 16 },
  forgotLink: { alignSelf: 'flex-end' },
  error: { fontSize: 14 },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13, textTransform: 'uppercase', fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
