import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';

export default function ProfileScreen() {
  const { colors, radius } = useTheme();
  const { profile, session, signOut } = useAuth();

  const displayName =
    profile?.full_name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    'Setu user';

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Avatar uri={profile?.avatar_url} name={displayName} size={72} online={profile?.is_online} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
            {profile?.username && (
              <Text style={{ color: colors.mutedForeground }}>@{profile.username}</Text>
            )}
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }} numberOfLines={1}>
              {profile?.email ?? session?.user.email}
            </Text>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.sectionHeader}>
          <Ionicons name="color-palette-outline" size={18} color={colors.foreground} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
        </View>
        <ThemeSwitcher />

        <View style={{ height: 24 }} />
        <Button
          label="Sign out"
          variant="outline"
          onPress={confirmSignOut}
          left={<Ionicons name="log-out-outline" size={20} color={colors.foreground} />}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 20, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
});
