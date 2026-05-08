import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { useOwnerDashboard, useOwnerPitches } from '../../hooks/useData';
import { OWNER } from '../../services/api';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  icon: IoniconName;
  title: string;
  subtitle: string;
  section: 'Venue' | 'Finance' | 'Settings';
  nav?: string;
  badge?: string;
  action?: 'payout' | 'help';
}

const MENU: MenuItem[] = [
  { icon: 'business-outline',  title: 'Manage Pitches',  subtitle: 'Add or edit pitch details, photos',  section: 'Venue',   nav: 'AddPitch' },
  { icon: 'time-outline',      title: 'Pricing & Slots', subtitle: 'Set hourly rates per pitch',        section: 'Venue',   nav: 'Schedule' },
  { icon: 'card-outline',      title: 'Withdrawal',      subtitle: 'M-Pesa payout settings',            section: 'Finance', action: 'payout', badge: 'M-PESA' },
  { icon: 'stats-chart-outline', title: 'Full Analytics', subtitle: 'Detailed revenue & booking reports', section: 'Finance', nav: 'Analytics' },
  { icon: 'settings-outline',  title: 'Account Settings', subtitle: 'Profile, password, notifications', section: 'Settings' },
  { icon: 'help-circle-outline', title: 'Help Center',   subtitle: 'Get support from our team',         section: 'Settings', action: 'help' },
];

interface Props { navigation: any; }

export default function OwnerAccountScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { mode, setMode, colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: dashboard, isLoading: dashLoading } = useOwnerDashboard();
  const { data: pitches, isLoading: pitchesLoading } = useOwnerPitches();

  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  const pendingPayout = dashboard?.pendingPayout ?? 0;

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!payoutAmount || isNaN(amount) || amount <= 0) {
      setPayoutError('Enter a valid amount.');
      return;
    }
    if (amount > pendingPayout) {
      setPayoutError(`Maximum available is KES ${pendingPayout.toLocaleString()}.`);
      return;
    }
    setPayoutLoading(true);
    setPayoutError('');
    try {
      await OWNER.requestPayout(amount);
      setPayoutModal(false);
      setPayoutAmount('');
      Alert.alert('Payout requested!', `KES ${amount.toLocaleString()} will be sent to your M-Pesa within 24 hours.`);
    } catch (err: any) {
      setPayoutError(err.message || 'Payout request failed. Try again.');
    } finally {
      setPayoutLoading(false);
    }
  };

  const pitchCount = Array.isArray(pitches) ? pitches.length : 0;
  const revenue    = dashboard?.monthlyRevenue  ?? 0;
  const bookings   = dashboard?.monthlyBookings ?? 0;
  const rating     = dashboard?.avgRating       ?? 0;

  const initials = (user?.name ?? '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleMenuPress = (item: MenuItem) => {
    if (item.nav) navigation.navigate(item.nav);
    else if (item.action === 'payout') {
      setPayoutAmount('');
      setPayoutError('');
      setPayoutModal(true);
    } else if (item.action === 'help') {
      Alert.alert('Help Center', 'Email us at support@kapash.app or visit kapash.app/help');
    } else {
      Alert.alert(item.title, 'Coming soon.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Settings', 'Coming soon.')} hitSlop={8}>
            <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: SPACING.base, paddingBottom: SPACING['3xl'], gap: SPACING.base }} showsVerticalScrollIndicator={false}>
        {/* Owner card */}
        <LinearGradient
          colors={[colors.dark, '#1A2633']}
          style={styles.ownerCard}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.decorBlob} />
          <View style={styles.ownerCardContent}>
            <View style={styles.ownerAvatarContainer}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>{initials}</Text>
              </LinearGradient>
              {user?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName} numberOfLines={1}>{user?.name ?? '—'}</Text>
              <Text style={styles.ownerRole}>Pitch Owner</Text>
              {rating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={12} color="#FBBF24" />
                  <Text style={styles.ownerRating}>{rating.toFixed(1)} avg rating</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          {(dashLoading || pitchesLoading) ? (
            <View style={[styles.ownerStats, { justifyContent: 'center' }]}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          ) : (
            <View style={styles.ownerStats}>
              {[
                { label: 'Pitches',  value: String(pitchCount) },
                { label: 'Revenue',  value: revenue >= 1000 ? `KES ${(revenue / 1000).toFixed(0)}k` : `KES ${revenue}` },
                { label: 'Bookings', value: String(bookings) },
              ].map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <View style={styles.ownerStatDivider} />}
                  <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={styles.ownerStatValue}>{stat.value}</Text>
                    <Text style={styles.ownerStatLabel}>{stat.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}
        </LinearGradient>

        {/* Appearance */}
        <View style={{ gap: SPACING.sm }}>
          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={[styles.menuGroup, { flexDirection: 'row', padding: SPACING.xs, gap: SPACING.xs }]}>
            {([
              { value: 'light',  icon: 'sunny-outline'          as IoniconName, label: 'Light' },
              { value: 'dark',   icon: 'moon-outline'           as IoniconName, label: 'Dark' },
              { value: 'system', icon: 'phone-portrait-outline' as IoniconName, label: 'System' },
            ] as { value: ThemeMode; icon: IoniconName; label: string }[]).map(opt => {
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
                  <Text style={{
                    fontSize: FONTS.sm,
                    fontWeight: FONT_WEIGHT.semiBold,
                    color: active ? colors.primary : colors.textSecondary,
                  }}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Menu Sections */}
        {(['Venue', 'Finance', 'Settings'] as const).map(section => {
          const items = MENU.filter(m => m.section === section);
          return (
            <View key={section} style={{ gap: SPACING.sm }}>
              <Text style={styles.sectionLabel}>{section}</Text>
              <View style={styles.menuGroup}>
                {items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.title}
                    style={[styles.menuItem, idx < items.length - 1 && styles.menuItemBorder]}
                    onPress={() => handleMenuPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.menuIconBg}>
                      <Ionicons name={item.icon} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    </View>
                    {item.badge && (
                      <View style={styles.mpesaBadge}>
                        <Text style={styles.mpesaText}>{item.badge}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Kapash v1.0.0 · {user?.phone ?? user?.email ?? 'Pitch Owner'}</Text>
      </ScrollView>

      {/* Payout Modal */}
      <Modal visible={payoutModal} transparent animationType="slide" onRequestClose={() => setPayoutModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Request Payout</Text>
              <Text style={styles.modalSubtitle}>Available balance</Text>
              <Text style={styles.modalBalance}>KES {pendingPayout.toLocaleString()}</Text>

              <Text style={styles.modalLabel}>Amount to withdraw</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 5000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={payoutAmount}
                onChangeText={t => { setPayoutAmount(t); setPayoutError(''); }}
              />

              {payoutError ? <Text style={styles.modalError}>{payoutError}</Text> : null}

              <Text style={styles.modalHint}>Paid to your registered M-Pesa within 24 hours.</Text>

              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPayoutModal(false)} disabled={payoutLoading} activeOpacity={0.85}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRequestPayout} disabled={payoutLoading} activeOpacity={0.85}>
                  {payoutLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSubmitText}>Request</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSafe: { backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    },
    headerTitle: { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, letterSpacing: -0.3 },
    iconBtn: {
      width: 40, height: 40, borderRadius: RADIUS.md,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },

    ownerCard: { borderRadius: RADIUS['2xl'], padding: SPACING.xl, overflow: 'hidden' },
    decorBlob: {
      position: 'absolute', top: -40, right: -40,
      width: 150, height: 150, borderRadius: RADIUS.full,
      backgroundColor: 'rgba(34,197,94,0.10)',
    },
    ownerCardContent: { flexDirection: 'row', gap: SPACING.base, marginBottom: SPACING.xl },
    ownerAvatarContainer: { position: 'relative' },
    ownerAvatar: { width: 72, height: 72, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
    ownerAvatarText: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
    verifiedBadge: {
      position: 'absolute', bottom: 0, right: 0,
      width: 22, height: 22, borderRadius: RADIUS.full,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: '#0F1923',
    },
    ownerInfo: { flex: 1, justifyContent: 'center', gap: 4 },
    ownerName: { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: '#fff' },
    ownerRole: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.6)' },
    ownerRating: { fontSize: FONTS.sm, color: colors.primary, fontWeight: FONT_WEIGHT.semiBold },
    ownerStats: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderRadius: RADIUS.xl,
      paddingVertical: SPACING.md,
    },
    ownerStatValue: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
    ownerStatLabel: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.55)' },
    ownerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.14)' },

    sectionLabel: {
      fontSize: FONTS.xs,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginLeft: 4,
    },
    menuGroup: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.base,
      gap: SPACING.md,
    },
    menuItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    menuIconBg: {
      width: 36, height: 36, borderRadius: RADIUS.sm,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
    },
    menuTitle: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: colors.textPrimary, marginBottom: 3 },
    menuSubtitle: { fontSize: FONTS.xs, color: colors.textMuted },
    mpesaBadge: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: SPACING.sm, paddingVertical: 3,
      borderRadius: RADIUS.xs,
      borderWidth: 1, borderColor: colors.border,
    },
    mpesaText: { fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: colors.textSecondary, letterSpacing: 0.5 },

    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      height: 54,
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderRadius: RADIUS.xl,
      borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    },
    logoutText: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: colors.error },
    version: { textAlign: 'center', fontSize: FONTS.xs, color: colors.textMuted, marginTop: SPACING.sm },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: SPACING.xl, paddingBottom: SPACING['3xl'],
    },
    modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: SPACING.lg },
    modalTitle: { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: 4 },
    modalSubtitle: { fontSize: FONTS.sm, color: colors.textSecondary },
    modalBalance: { fontSize: FONTS['3xl'], fontWeight: FONT_WEIGHT.bold, color: colors.primary, marginBottom: SPACING.xl },
    modalLabel: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: colors.textSecondary, marginBottom: SPACING.sm },
    modalInput: {
      backgroundColor: colors.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: colors.border,
      color: colors.textPrimary,
      fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold,
      padding: SPACING.base, marginBottom: SPACING.sm,
    },
    modalError: { color: colors.error, fontSize: FONTS.sm, marginBottom: SPACING.sm },
    modalHint: { fontSize: FONTS.xs, color: colors.textMuted, marginBottom: SPACING.xl },
    modalCancelBtn: {
      flex: 1, height: 50, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    modalCancelText: { color: colors.textSecondary, fontWeight: FONT_WEIGHT.semiBold },
    modalSubmitBtn: {
      flex: 2, height: 50, borderRadius: RADIUS.lg,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    modalSubmitText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },
  });
}
