import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';

export default function SelectUsernameScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    firstName?: string;
    lastName?: string;
  }>();
  const { refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState(params.firstName ?? '');
  const [lastName, setLastName] = useState(params.lastName ?? '');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  // Pre-fill from Google metadata if params not passed.
  useEffect(() => {
    if (params.firstName || params.lastName) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const meta = user.user_metadata || {};
      const fullName = meta.full_name || meta.name || '';
      const parts = fullName.trim().split(/\s+/);
      const gFirst = meta.given_name || parts[0] || '';
      const gLast = meta.family_name || parts.slice(1).join(' ') || '';
      if (gFirst && !firstName) setFirstName(gFirst);
      if (gLast && !lastName) setLastName(gLast);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAvailability = useCallback(async (value: string) => {
    if (!value || value.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value)
        .single();
      setAvailable(!data);
    } catch {
      setAvailable(true); // No match found = available.
    } finally {
      setChecking(false);
    }
  }, []);

  // Debounced username check.
  useEffect(() => {
    if (!username || username.length < 3) {
      setAvailable(null);
      return;
    }
    const timer = setTimeout(() => checkAvailability(username), 500);
    return () => clearTimeout(timer);
  }, [username, checkAvailability]);

  async function onSubmit() {
    setError(null);

    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Session expired. Please sign in again.');
        setLoading(false);
        return;
      }

      // Update profile via Supabase directly (the profile row already exists).
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.trim().toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.message.includes('duplicate') || updateError.message.includes('unique')) {
          setError('Username is already taken.');
        } else {
          setError(updateError.message);
        }
        setLoading(false);
        return;
      }

      // Create "Saved Messages" self-conversation.
      try {
        await api.post('/api/conversations/self');
      } catch {
        // Non-fatal — the conversation will be created on next login.
      }

      // Refresh profile data in auth context.
      await refreshProfile();

      // Navigate to the main app.
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save username.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <Logo size="md" />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Complete your profile
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Tell us your name and choose a unique username.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Input
                  label="First name *"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Abhi"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.flex}>
                <Input
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Patel"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <Input
              label="Username *"
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase())}
              placeholder="your_username"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {checking && (
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Checking availability...
              </Text>
            )}
            {available === true && username.length >= 3 && (
              <Text style={[styles.hint, { color: '#10b981' }]}>
                ✓ Username is available
              </Text>
            )}
            {available === false && (
              <Text style={[styles.hint, { color: colors.destructive }]}>
                ✗ Username is already taken
              </Text>
            )}

            {error && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {error}
              </Text>
            )}

            <Button
              label="Continue to Chat"
              onPress={onSubmit}
              loading={loading}
              disabled={available === false}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 32, paddingBottom: 48, gap: 28 },
  header: { alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  hint: { fontSize: 13, marginTop: -8 },
  error: { fontSize: 14 },
});
