import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useDialog } from '@/components/ui/DialogProvider';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { pickAvatar, uploadAvatar } from '@/lib/media';
import { useTheme } from '@/theme/ThemeProvider';

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const router = useRouter();
  const { profile, session, refreshProfile } = useAuth();
  const userId = session?.user.id ?? '';

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const displayName =
    [firstName, lastName].filter(Boolean).join(' ').trim() || 'Setu user';

  const changeAvatar = async () => {
    const asset = await pickAvatar();
    if (!asset) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(asset, 'profile-avatars', userId);
      await api.patch(`/api/users/${userId}`, { avatarUrl: url });
      setAvatarUrl(url);
      await refreshProfile();
    } catch (err) {
      dialog.alert({
        title: 'Upload failed',
        message: err instanceof Error ? err.message : 'Please try again.',
        icon: 'alert-circle-outline',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async () => {
    if (!firstName.trim()) {
      dialog.alert({
        title: 'Name required',
        message: 'Please enter your first name.',
        icon: 'person-outline',
      });
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/api/users/${userId}`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim() || undefined,
      });
      await refreshProfile();
      router.back();
    } catch (err) {
      setSaving(false);
      dialog.alert({
        title: 'Could not save',
        message: err instanceof Error ? err.message : 'Please try again.',
        icon: 'alert-circle-outline',
      });
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Pressable onPress={uploadingAvatar ? undefined : changeAvatar}>
              <Avatar uri={avatarUrl} name={displayName} size={104} />
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
                <Ionicons
                  name={uploadingAvatar ? 'hourglass' : 'camera'}
                  size={18}
                  color={colors.primaryForeground}
                />
              </View>
            </Pressable>
            <Text style={[styles.changePhoto, { color: colors.primary }]}>
              {uploadingAvatar ? 'Uploading…' : 'Change photo'}
            </Text>
          </View>

          <Input label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
          <Input label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            Your email can&apos;t be changed here.
          </Text>

          <View style={{ height: 12 }} />
          <Button label="Save changes" onPress={save} loading={saving} disabled={uploadingAvatar} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  avatarWrap: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  changePhoto: { fontSize: 14, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 19 },
});
