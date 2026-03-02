import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const MENU = [
  { icon: '🏟️', title: 'Manage Pitches', subtitle: 'Add / edit pitch details, photos', section: 'Venue' },
  { icon: '💰', title: 'Pricing & Slots', subtitle: 'Set hourly rates per pitch', section: 'Venue' },
  { icon: '💳', title: 'Withdrawal', subtitle: 'M-Pesa payout settings', section: 'Finance', badge: 'M-PESA' },
  { icon: '📊', title: 'Full Analytics', subtitle: 'Detailed revenue & booking reports', section: 'Finance' },
  { icon: '⚙️', title: 'Account Settings', subtitle: 'Profile, password, notifications', section: 'Settings' },
  { icon: '❓', title: 'Help Center', subtitle: 'Get support from our team', section: 'Settings' },
];

interface Props { navigation: any; }

export default function OwnerAccountScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
        <TouchableOpacity style={styles.settingsBtn}>
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
                <Text style={styles.ownerAvatarText}>CT</Text>
              </LinearGradient>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>Camp Toyoyo</Text>
              <Text style={styles.ownerRole}>Pitch Owner</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.starIcon}>⭐</Text>
                <Text style={styles.ownerRating}>4.9 · 124 reviews</Text>
              </View>
            </View>
          </View>
          <View style={styles.ownerStats}>
            {[
              { label: 'Pitches', value: '3' },
              { label: 'Revenue', value: 'KES 450k' },
              { label: 'Bookings', value: '312' },
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
                    key={item.icon}
                    style={[styles.menuItem, index < items.length - 1 && styles.menuItemBorder]}
                    onPress={() => {
                      if (item.title === 'Full Analytics') navigation.navigate('Analytics');
                    }}
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
        <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.replace('Login')}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Kapash v1.0.0 · Pitch Owner</Text>
      </ScrollView>
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
});