import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
