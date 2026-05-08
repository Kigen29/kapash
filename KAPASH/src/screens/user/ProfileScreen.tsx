import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { useUserStats } from '../../hooks/useData';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const MENU: { icon: IoniconName; label: string; screen: string }[] = [
  { icon: 'calendar-outline',         label: 'My Bookings',     screen: 'MyBookings' },
  { icon: 'star-outline',              label: 'Reviews',         screen: 'Reviews' },
  { icon: 'gift-outline',              label: 'Referrals',       screen: 'Referral' },
  { icon: 'notifications-outline',     label: 'Notifications',   screen: 'Notifications' },
  { icon: 'help-circle-outline',       label: 'Help & Support',  screen: 'HelpSupport' },
];

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const { data: stats, isLoading: statsLoading } = useUserStats();
  const [loggingOut, setLoggingOut] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} hitSlop={8}>
            <Text style={s.editTxt}>Edit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}>
        {/* Avatar & Name */}
        <View style={s.avatarSection}>
          <View style={s.avatarRing}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={s.avatar} />
            ) : (
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.avatar}>
                <Text style={s.avatarTxt}>{(user?.name || 'U')[0].toUpperCase()}</Text>
              </LinearGradient>
            )}
          </View>
          <Text style={s.userName}>{user?.name}</Text>
          <Text style={s.userPhone}>{user?.phone || user?.email}</Text>
          {user?.isVerified ? (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={s.verifiedTxt}>Verified</Text>
            </View>
          ) : (
            <TouchableOpacity style={s.unverifiedBadge} onPress={() => navigation.navigate('VerifyPhone')}>
              <Ionicons name="warning-outline" size={14} color={colors.pending} />
              <Text style={s.unverifiedTxt}>Verify phone</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {statsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <StatBox label="Bookings"  value={stats?.totalBookings    ?? 0} colors={colors} />
              <View style={s.statDivider} />
              <StatBox label="Completed" value={stats?.completedBookings ?? 0} colors={colors} />
              <View style={s.statDivider} />
              <StatBox label="Referrals" value={stats?.referralCount     ?? 0} colors={colors} />
            </>
          )}
        </View>

        {/* Wallet */}
        {(user?.walletBalance || 0) > 0 && (
          <View style={s.walletCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Ionicons name="wallet-outline" size={18} color={colors.textMuted} />
              <Text style={s.walletLabel}>Wallet Balance</Text>
            </View>
            <Text style={s.walletAmount}>KSh {user?.walletBalance?.toLocaleString()}</Text>
          </View>
        )}

        {/* Appearance */}
        <SectionHeader title="Appearance" colors={colors} />
        <AppearanceCard colors={colors} />

        {/* Account */}
        <SectionHeader title="Account" colors={colors} />
        <View style={s.menuCard}>
          {MENU.map((item, i) => (
            <TouchableOpacity
              key={item.screen}
              style={[s.menuItem, i < MENU.length - 1 && s.menuItemBorder]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={s.menuIconWrap}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} disabled={loggingOut} activeOpacity={0.85}>
          {loggingOut ? (
            <ActivityIndicator color={colors.error} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
              <Text style={s.logoutTxt}>Log out</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function StatBox({ label, value, colors }: { label: string; value: number; colors: ColorPalette }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.extraBold, color: colors.primary }}>{value}</Text>
      <Text style={{ fontSize: FONTS.xs, color: colors.textMuted, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: ColorPalette }) {
  return (
    <Text
      style={{
        fontSize: FONTS.xs,
        fontWeight: FONT_WEIGHT.bold,
        color: colors.textMuted,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginHorizontal: SPACING.base,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
      }}
    >
      {title}
    </Text>
  );
}

function AppearanceCard({ colors }: { colors: ColorPalette }) {
  const { mode, setMode } = useTheme();
  const options: { value: ThemeMode; icon: IoniconName; label: string }[] = [
    { value: 'light',  icon: 'sunny-outline',          label: 'Light' },
    { value: 'dark',   icon: 'moon-outline',           label: 'Dark' },
    { value: 'system', icon: 'phone-portrait-outline', label: 'System' },
  ];
  return (
    <View
      style={{
        flexDirection: 'row',
        marginHorizontal: SPACING.base,
        backgroundColor: colors.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xs,
        gap: SPACING.xs,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {options.map(opt => {
        const active = mode === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setMode(opt.value)}
            activeOpacity={0.85}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: SPACING.xs,
              paddingVertical: SPACING.md,
              borderRadius: RADIUS.md,
              backgroundColor: active ? colors.primaryMuted : 'transparent',
            }}
          >
            <Ionicons name={opt.icon} size={16} color={active ? colors.primary : colors.textMuted} />
            <Text
              style={{
                fontSize: FONTS.sm,
                fontWeight: FONT_WEIGHT.semiBold,
                color: active ? colors.primary : colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Styles factory ─────────────────────────────────────────────────────────────

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    headerTitle: {
      fontSize: FONTS['2xl'],
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
    },
    editTxt: {
      color: colors.primary,
      fontWeight: FONT_WEIGHT.semiBold,
      fontSize: FONTS.sm,
    },

    avatarSection: { alignItems: 'center', paddingVertical: SPACING.lg },
    avatarRing: {
      padding: 3,
      borderRadius: RADIUS.full,
      backgroundColor: colors.primaryMuted,
      marginBottom: SPACING.md,
    },
    avatar: {
      width: 92,
      height: 92,
      borderRadius: RADIUS.full,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarTxt: {
      fontSize: FONTS['3xl'],
      fontWeight: FONT_WEIGHT.bold,
      color: '#fff',
    },
    userName: {
      fontSize: FONTS.xl,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    userPhone: {
      fontSize: FONTS.sm,
      color: colors.textMuted,
      marginBottom: SPACING.sm,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryMuted,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: 5,
    },
    verifiedTxt: { color: colors.primary, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.bold },
    unverifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(245,158,11,0.12)',
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: 5,
    },
    unverifiedTxt: { color: colors.pending, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold },

    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      marginHorizontal: SPACING.base,
      borderRadius: RADIUS.lg,
      padding: SPACING.base,
      marginTop: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 4,
    },

    walletCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      marginHorizontal: SPACING.base,
      marginTop: SPACING.md,
      padding: SPACING.base,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    walletLabel: { color: colors.textSecondary, fontSize: FONTS.sm },
    walletAmount: {
      color: colors.primary,
      fontWeight: FONT_WEIGHT.bold,
      fontSize: FONTS.md,
    },

    menuCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      marginHorizontal: SPACING.base,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.base,
      gap: SPACING.md,
    },
    menuItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    menuIconWrap: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.primaryMuted,
      justifyContent: 'center',
      alignItems: 'center',
    },
    menuLabel: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.medium,
    },

    logoutBtn: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginHorizontal: SPACING.base,
      marginTop: SPACING.lg,
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.25)',
    },
    logoutTxt: {
      color: colors.error,
      fontWeight: FONT_WEIGHT.bold,
      fontSize: FONTS.sm,
    },
  });
}
