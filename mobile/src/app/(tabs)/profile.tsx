import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';

export default function ProfileScreen() {
  const { colors, radius } = useTheme();
  const router = useRouter();
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
        {/* Identity card → tap to edit */}
        <Pressable
          onPress={() => router.push('/edit-profile')}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: pressed ? colors.secondary : colors.card,
              borderColor: colors.border,
              borderRadius: radius.lg,
            },
          ]}
        >
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
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </Pressable>

        {/* Account actions */}
        <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Pressable
            onPress={() => router.push('/edit-profile')}
            style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="person-outline" size={20} color={colors.foreground} />
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </Pressable>
          <View style={[styles.menuSep, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={() => router.push('/sessions')}
            style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: colors.secondary }]}
          >
            <Ionicons name="shield-outline" size={20} color={colors.foreground} />
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>Active Sessions</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </Pressable>
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
  menu: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  menuSep: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
});
