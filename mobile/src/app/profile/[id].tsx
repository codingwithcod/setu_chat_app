import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ImageViewer } from '@/components/chat/ImageViewer';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Touchable } from '@/components/ui/Touchable';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { isUserOnline } from '@/lib/presence';
import { formatLastSeen } from '@/lib/time';
import { useTheme } from '@/theme/ThemeProvider';
import { Elevation, Radius, Spacing } from '@/theme/theme';
import type { Profile } from '@/types';

const AVATAR_SIZE = 110;
const AVATAR_BORDER = 4;

/** Mask an email for privacy: show first 3 chars + •••• + @domain. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = Math.min(3, Math.floor(local.length / 2));
  return `${local.slice(0, visible)}••••@${domain}`;
}

/** Pulsing online dot scaled up for the profile avatar. */
function ProfileOnlineDot({ color, bgColor }: { color: string; bgColor: string }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
  }, [pulse]);

  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 1.2 }],
    opacity: 0.5 * (1 - pulse.value),
  }));

  return (
    <View style={profileStyles.onlineDotWrap}>
      <Animated.View
        style={[
          profileStyles.onlineHalo,
          { backgroundColor: color },
          halo,
        ]}
      />
      <View
        style={[
          profileStyles.onlineDot,
          { backgroundColor: color, borderColor: bgColor },
        ]}
      />
    </View>
  );
}

/** A single info row card with icon, label, and value. */
function InfoCard({
  icon,
  label,
  value,
  colors,
  delay = 0,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(360).springify()}
      style={[
        profileStyles.infoCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        Elevation.sm,
      ]}
    >
      <View style={[profileStyles.iconCircle, { backgroundColor: colors.withAlpha('primary', 0.12) }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={profileStyles.infoText}>
        <Text style={[profileStyles.infoLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text style={[profileStyles.infoValue, { color: colors.foreground }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function PublicProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const myId = session?.user.id ?? '';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.get<Profile>(`/api/users/${id}`);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const online = isUserOnline(profile);
  const isSelf = myId === profile?.id;
  const [avatarViewer, setAvatarViewer] = useState(false);

  // ── Loading state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <View style={profileStyles.headerBar}>
          <Touchable onPress={() => router.back()} hitSlop={10} style={profileStyles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.foreground} />
          </Touchable>
          <Text style={[profileStyles.headerTitle, { color: colors.foreground }]}>Profile</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={profileStyles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  // ── Not found state ────────────────────────────────────────────────
  if (!profile) {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <View style={profileStyles.headerBar}>
          <Touchable onPress={() => router.back()} hitSlop={10} style={profileStyles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.foreground} />
          </Touchable>
          <Text style={[profileStyles.headerTitle, { color: colors.foreground }]}>Profile</Text>
          <View style={{ width: 42 }} />
        </View>
        <View style={profileStyles.emptyWrap}>
          <Ionicons name="person-outline" size={64} color={colors.withAlpha('mutedForeground', 0.3)} />
          <Text style={[profileStyles.emptyText, { color: colors.mutedForeground }]}>
            User not found
          </Text>
          <Button label="Go Back" variant="outline" onPress={() => router.back()} fullWidth={false} />
        </View>
      </Screen>
    );
  }

  // ── Profile view ───────────────────────────────────────────────────
  return (
    <Screen edges={['top', 'left', 'right']}>
      {/* Header bar */}
      <View style={profileStyles.headerBar}>
        <Touchable onPress={() => router.back()} hitSlop={10} style={profileStyles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Touchable>
        <Text style={[profileStyles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={profileStyles.scroll}
        contentContainerStyle={profileStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ── Avatar section ────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(80).duration(400).springify()}
          style={profileStyles.avatarSection}
        >
          <Touchable
            onPress={() => profile.avatar_url && setAvatarViewer(true)}
            disabled={!profile.avatar_url}
            scaleTo={0.94}
          >
            <View
              style={[
                profileStyles.avatarRing,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
                Elevation.md,
              ]}
            >
              <Avatar uri={profile.avatar_url} name={profile.full_name} size={AVATAR_SIZE} />
            </View>
          </Touchable>
          {online && <ProfileOnlineDot color={colors.success} bgColor={colors.card} />}
        </Animated.View>

        {/* ── Name & username ───────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(360)}
          style={profileStyles.nameSection}
        >
          <Text style={[profileStyles.fullName, { color: colors.foreground }]}>
            {profile.first_name} {profile.last_name}
          </Text>
          {profile.username ? (
            <Text style={[profileStyles.username, { color: colors.mutedForeground }]}>
              @{profile.username}
            </Text>
          ) : null}

          {/* Online / Last seen badge */}
          <View style={profileStyles.statusRow}>
            {online ? (
              <View
                style={[
                  profileStyles.statusBadge,
                  { backgroundColor: colors.withAlpha('success', 0.12) },
                ]}
              >
                <View style={[profileStyles.statusDot, { backgroundColor: colors.success }]} />
                <Text style={[profileStyles.statusText, { color: colors.success }]}>Online</Text>
              </View>
            ) : (
              <View style={[profileStyles.statusBadge, { backgroundColor: colors.muted }]}>
                <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                <Text style={[profileStyles.statusText, { color: colors.mutedForeground }]}>
                  {formatLastSeen(profile.last_seen)}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Info cards ────────────────────────────────────────────── */}
        <View style={profileStyles.cardsContainer}>
          <InfoCard
            icon="mail-outline"
            label="EMAIL"
            value={maskEmail(profile.email)}
            colors={colors}
            delay={280}
          />

          {profile.username ? (
            <InfoCard
              icon="at"
              label="USERNAME"
              value={`@${profile.username}`}
              colors={colors}
              delay={360}
            />
          ) : null}

          <InfoCard
            icon="calendar-outline"
            label="MEMBER SINCE"
            value={new Date(profile.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            colors={colors}
            delay={440}
          />

          <InfoCard
            icon="shield-checkmark-outline"
            label="ACCOUNT STATUS"
            value={profile.is_email_verified ? 'Verified' : 'Unverified'}
            colors={colors}
            delay={520}
          />
        </View>

        {/* ── Send Message button ───────────────────────────────────── */}
        {!isSelf && (
          <Animated.View
            entering={FadeInDown.delay(600).duration(360).springify()}
            style={profileStyles.ctaWrap}
          >
            <Button
              label="Send Message"
              onPress={() => router.back()}
              left={<Ionicons name="chatbubble-outline" size={18} color={colors.primaryForeground} />}
            />
          </Animated.View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full-screen avatar viewer with pinch-zoom */}
      <ImageViewer
        files={
          profile.avatar_url
            ? [{ id: profile.id, file_url: profile.avatar_url, file_name: `${profile.username ?? 'avatar'}.jpg` }]
            : []
        }
        initialIndex={0}
        visible={avatarViewer}
        onClose={() => setAvatarViewer(false)}
      />
    </Screen>
  );
}

const profileStyles = StyleSheet.create({
  // ── Header ──
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  backBtn: {
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // ── Avatar ──
  avatarSection: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  avatarRing: {
    width: AVATAR_SIZE + AVATAR_BORDER * 2,
    height: AVATAR_SIZE + AVATAR_BORDER * 2,
    borderRadius: (AVATAR_SIZE + AVATAR_BORDER * 2) / 2,
    borderWidth: AVATAR_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Online dot (profile size) ──
  onlineDotWrap: {
    position: 'absolute',
    bottom: 4,
    right: '50%',
    marginRight: -(AVATAR_SIZE / 2 + AVATAR_BORDER) + 6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineHalo: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  onlineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },

  // ── Name section ──
  nameSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  fullName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 15,
    marginTop: 3,
  },
  statusRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  // ── Info cards ──
  cardsContainer: {
    paddingHorizontal: 20,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14.5,
    fontWeight: '600',
    marginTop: 3,
  },

  // ── CTA ──
  ctaWrap: {
    paddingHorizontal: 20,
    marginTop: Spacing.xl,
  },

  // ── States ──
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
