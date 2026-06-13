import { Ionicons } from '@expo/vector-icons';
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

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
      });
      setDone(res.message ?? 'Check your email to verify your account.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create account.');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignUp() {
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
          // TOTP not yet implemented on mobile — proceed.
          break;
        case 'blocked':
          setError(
            result.message ??
              'Your account was created with email & password. Connect Google from Settings first.'
          );
          break;
        case 'proceed':
          // Auth state change listener will trigger navigation.
          break;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Google sign-up failed.';
      if (!msg.toLowerCase().includes('cancel')) {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  if (done) {
    return (
      <Screen padded>
        <View style={styles.successWrap}>
          <View style={[styles.successIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="mail-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Almost there
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {done}
          </Text>
          <Button label="Back to sign in" onPress={() => router.replace('/(auth)/login')} />
        </View>
      </Screen>
    );
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
            <Logo size="md" />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Create your account
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Input label="First name" value={firstName} onChangeText={setFirstName} placeholder="Jane" autoCapitalize="words" />
              </View>
              <View style={styles.flex}>
                <Input label="Last name" value={lastName} onChangeText={setLastName} placeholder="Doe" autoCapitalize="words" />
              </View>
            </View>
            <Input label="Username" value={username} onChangeText={setUsername} placeholder="janedoe" autoCapitalize="none" autoCorrect={false} />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" password autoCapitalize="none" />

            {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}

            <Button label="Create account" onPress={onSubmit} loading={loading} />

            {/* Divider */}
            <View style={styles.dividerWrap}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
                or continue with
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <Button
              label={googleLoading ? 'Signing up...' : 'Continue with Google'}
              onPress={onGoogleSignUp}
              variant="outline"
              loading={googleLoading}
              disabled={loading}
              left={!googleLoading ? <GoogleIcon /> : undefined}
            />
          </View>

          <View style={styles.footer}>
            <Text style={{ color: colors.mutedForeground }}>Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32, gap: 28 },
  header: { alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
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
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  successIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
});
