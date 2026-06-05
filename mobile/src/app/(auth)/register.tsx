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

import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  successIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
});
