import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useOwnerDashboard, useOwnerPitches } from '../../hooks/useData';
import { OWNER } from '../../services/api';

const MENU = [
  { icon: '🏟️', title: 'Manage Pitches',    subtitle: 'Add / edit pitch details, photos',    section: 'Venue',    nav: null },
  { icon: '💰', title: 'Pricing & Slots',   subtitle: 'Set hourly rates per pitch',           section: 'Venue',    nav: 'Schedule' },
  { icon: '💳', title: 'Withdrawal',        subtitle: 'M-Pesa payout settings',              section: 'Finance',  nav: null, badge: 'M-PESA' },
  { icon: '📊', title: 'Full Analytics',    subtitle: 'Detailed revenue & booking reports',  section: 'Finance',  nav: 'Analytics' },
  { icon: '⚙️', title: 'Account Settings', subtitle: 'Profile, password, notifications',    section: 'Settings', nav: null },
  { icon: '❓', title: 'Help Center',       subtitle: 'Get support from our team',           section: 'Settings', nav: null },
];

interface Props { navigation: any; }

export default function OwnerAccountScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { data: dashboard, isLoading: dashLoading } = useOwnerDashboard();
  const { data: pitches, isLoading: pitchesLoading } = useOwnerPitches();

  // Payout modal state
  const [payoutModal, setPayoutModal]       = useState(false);
  const [payoutAmount, setPayoutAmount]     = useState('');
  const [payoutLoading, setPayoutLoading]   = useState(false);
  const [payoutError, setPayoutError]       = useState('');

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
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleMenuPress = (item: typeof MENU[0]) => {
    if (item.nav) {
      navigation.navigate(item.nav);
    } else if (item.title === 'Withdrawal') {
      setPayoutAmount('');
      setPayoutError('');
      setPayoutModal(true);
    } else if (item.title === 'Account Settings') {
      Alert.alert('Account Settings', 'Coming soon.');
    } else if (item.title === 'Help Center') {
      Alert.alert('Help Center', 'Email us at support@kapash.app or visit kapash.app/help');
    } else if (item.title === 'Manage Pitches') {
      navigation.navigate('AddPitch');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => handleMenuPress(MENU.find(m => m.title === 'Account Settings')!)}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Owner card */}
        <LinearGradient
          colors={[COLORS.dark, '#1A2633']}
          style={styles.ownerCard}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.decorBlob} />
          <View style={styles.ownerCardContent}>
            <View style={styles.ownerAvatarContainer}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>{initials}</Text>
              </LinearGradient>
              {user?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedIcon}>✓</Text>
                </View>
              )}
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{user?.name ?? '—'}</Text>
              <Text style={styles.ownerRole}>Pitch Owner</Text>
              {rating > 0 && (
                <View style={styles.ratingRow}>
                  <Text style={styles.starIcon}>⭐</Text>
                  <Text style={styles.ownerRating}>{rating.toFixed(1)} avg rating</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          {(dashLoading || pitchesLoading) ? (
            <View style={[styles.ownerStats, { justifyContent: 'center' }]}>
              <ActivityIndicator color={COLORS.white} size="small" />
            </View>
          ) : (
            <View style={styles.ownerStats}>
              {[
                { label: 'Pitches',  value: String(pitchCount) },
                { label: 'Revenue',  value: revenue >= 1000 ? `KES ${(revenue / 1000).toFixed(0)}k` : `KES ${revenue}` },
                { label: 'Bookings', value: String(bookings) },
              ].map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 && <View style={styles.ownerStatDivider} />}
                  <View style={styles.ownerStat}>
                    <Text style={styles.ownerStatValue}>{s.value}</Text>
                    <Text style={styles.ownerStatLabel}>{s.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}
        </LinearGradient>

        {/* Menu Sections */}
        {['Venue', 'Finance', 'Settings'].map(section => {
          const items = MENU.filter(m => m.section === section);
          return (
            <View key={section} style={styles.menuSection}>
              <Text style={styles.menuSectionLabel}>{section}</Text>
              <View style={styles.menuGroup}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={item.title}
                    style={[styles.menuItem, index < items.length - 1 && styles.menuItemBorder]}
                    onPress={() => handleMenuPress(item)}
                  >
                    <View style={styles.menuIconBg}>
                      <Text style={styles.menuIcon}>{item.icon}</Text>
                    </View>
                    <View style={styles.menuContent}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    </View>
                    {item.badge && (
                      <View style={styles.mpesaBadge}>
                        <Text style={styles.mpesaText}>{item.badge}</Text>
                      </View>
                    )}
                    <Text style={styles.menuChevron}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Kapash v1.0.0 · {user?.phone ?? user?.email ?? 'Pitch Owner'}</Text>
      </ScrollView>

      {/* Payout Modal */}
      <Modal visible={payoutModal} transparent animationType="slide" onRequestClose={() => setPayoutModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Request Payout</Text>
              <Text style={styles.modalSubtitle}>Available balance</Text>
              <Text style={styles.modalBalance}>KES {pendingPayout.toLocaleString()}</Text>

              <Text style={styles.modalLabel}>Amount to withdraw</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 5000"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={payoutAmount}
                onChangeText={t => { setPayoutAmount(t); setPayoutError(''); }}
              />

              {payoutError ? <Text style={styles.modalError}>{payoutError}</Text> : null}

              <Text style={styles.modalHint}>Paid to your registered M-Pesa number within 24 hours.</Text>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPayoutModal(false)} disabled={payoutLoading}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRequestPayout} disabled={payoutLoading}>
                  {payoutLoading
                    ? <ActivityIndicator color={COLORS.white} size="small" />
                    : <Text style={styles.modalSubmitText}>Request</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingTop: 56, paddingBottom: SPACING.base },
  headerTitle: { fontSize: FONTS['3xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, letterSpacing: -0.5 },
  settingsBtn: { width: 42, height: 42, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  settingsIcon: { fontSize: 20 },
  content: { paddingHorizontal: SPACING.base, paddingBottom: SPACING['3xl'], gap: SPACING.base },
  ownerCard: { borderRadius: RADIUS['2xl'], padding: SPACING.xl, overflow: 'hidden', ...SHADOWS.lg },
  decorBlob: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: RADIUS.full, backgroundColor: 'rgba(34,197,94,0.08)' },
  ownerCardContent: { flexDirection: 'row', gap: SPACING.base, marginBottom: SPACING.xl },
  ownerAvatarContainer: { position: 'relative' },
  ownerAvatar: { width: 72, height: 72, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  ownerAvatarText: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.dark },
  verifiedIcon: { fontSize: 11, color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  ownerInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  ownerName: { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.white, letterSpacing: -0.3 },
  ownerRole: { fontSize: FONTS.sm, color: 'rgba(255,255,255,0.6)' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starIcon: { fontSize: 12 },
  ownerRating: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.semiBold },
  ownerStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.xl, paddingVertical: SPACING.md },
  ownerStat: { flex: 1, alignItems: 'center', gap: 4 },
  ownerStatValue: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
  ownerStatLabel: { fontSize: FONTS.xs, color: 'rgba(255,255,255,0.5)' },
  ownerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  menuSection: { gap: SPACING.sm },
  menuSectionLabel: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textMuted, letterSpacing: 0.8, marginLeft: 4 },
  menuGroup: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.xs },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.base, gap: SPACING.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  menuIconBg: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 20 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary, marginBottom: 3 },
  menuSubtitle: { fontSize: FONTS.sm, color: COLORS.textMuted },
  mpesaBadge: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.xs, borderWidth: 1, borderColor: COLORS.border },
  mpesaText: { fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: COLORS.textSecondary, letterSpacing: 0.5 },
  menuChevron: { fontSize: FONTS['2xl'], color: COLORS.textMuted },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, height: 54, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.border },
  logoutIcon: { fontSize: 18 },
  logoutText: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.error },
  version: { textAlign: 'center', fontSize: FONTS.xs, color: COLORS.textMuted },

  // Payout modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:      { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 4 },
  modalSubtitle:   { fontSize: FONTS.sm, color: COLORS.textSecondary },
  modalBalance:    { fontSize: FONTS['3xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.primary, marginBottom: SPACING.xl },
  modalLabel:      { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  modalInput:      { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.border, color: COLORS.textPrimary, fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, padding: SPACING.base, marginBottom: SPACING.sm },
  modalError:      { color: COLORS.error, fontSize: FONTS.sm, marginBottom: SPACING.sm },
  modalHint:       { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.xl },
  modalBtns:       { flexDirection: 'row', gap: SPACING.md },
  modalCancelBtn:  { flex: 1, height: 50, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.semiBold },
  modalSubmitBtn:  { flex: 2, height: 50, borderRadius: RADIUS.xl, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },
});
