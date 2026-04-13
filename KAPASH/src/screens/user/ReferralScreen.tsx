import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Share, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useReferral } from '../../hooks/useData';

interface Props { navigation: any; }

export default function ReferralScreen({ navigation }: Props) {
  const { data, isLoading, error, refetch } = useReferral();

  const referralCode   = data?.referralCode   ?? '—';
  const referralCount  = data?.referralCount  ?? 0;
  const totalEarned    = data?.totalEarned    ?? 0;
  const earningsPer    = data?.earningsPerReferral ?? 500;

  const shareMessage = `Join Kapash and book sports pitches easily! Use my referral code ${referralCode} to get started. Download the app now.`;

  const handleShare = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch {}
  };

  const handleCopy = async () => {
    try {
      await Share.share({ message: referralCode });
    } catch {}
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>😕</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONTS.base, textAlign: 'center', marginBottom: 20 }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: COLORS.primaryBg, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.full }}
            onPress={refetch}
          >
            <Text style={{ color: COLORS.primary, fontWeight: FONT_WEIGHT.semiBold }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero Banner */}
        <LinearGradient
          colors={[COLORS.dark, COLORS.darkCard]}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>🏆</Text>
            <Text style={styles.heroBadgeText}>Top Earner</Text>
          </View>
          <Text style={styles.heroTitle}>Invite Friends,{'\n'}Earn KES {earningsPer.toLocaleString()}</Text>
          <Text style={styles.heroSubtitle}>
            For every friend who makes their first booking on Kapash.
          </Text>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>KES {totalEarned.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{referralCount}</Text>
            <Text style={styles.statLabel}>Friends Referred</Text>
          </View>
          <TouchableOpacity style={styles.shareRoundBtn} onPress={handleShare}>
            <Text style={styles.shareRoundIcon}>↑</Text>
          </TouchableOpacity>
        </View>

        {/* Referral Code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{referralCode}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
            <Text style={styles.copyBtnIcon}>📋</Text>
            <Text style={styles.copyBtnText}>Share Code</Text>
          </TouchableOpacity>
          <Text style={styles.codeHint}>Share this code with friends</Text>
        </View>

        {/* Share Options */}
        <View style={styles.shareSection}>
          <Text style={styles.sectionTitle}>Share via</Text>
          <View style={styles.shareRow}>
            {[
              { icon: '💬', label: 'WhatsApp' },
              { icon: 'f', label: 'Facebook' },
              { icon: 'X', label: 'Twitter' },
              { icon: '↑', label: 'More' },
            ].map(item => (
              <TouchableOpacity key={item.label} style={styles.shareOption} onPress={handleShare}>
                <View style={styles.shareIconBg}>
                  <Text style={styles.shareIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.shareLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* How it works */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>How it works</Text>
          {[
            { n: '1', title: 'Share Your Code', desc: 'Send your referral code to friends via WhatsApp, SMS or social media.' },
            { n: '2', title: 'Friend Signs Up', desc: 'Your friend creates a Kapash account using your code.' },
            { n: '3', title: `Earn KES ${earningsPer.toLocaleString()}`, desc: `You receive KES ${earningsPer.toLocaleString()} when your friend completes their first booking.` },
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepNumber, i === 2 && styles.stepNumberActive]}>
                <Text style={styles.stepNumberText}>{step.n}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingTop: 56, paddingBottom: SPACING.base },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  headerRight: { width: 40 },
  content: { paddingHorizontal: SPACING.base, paddingBottom: SPACING['3xl'], gap: SPACING.base },

  hero: { borderRadius: RADIUS['2xl'], padding: SPACING.xl, minHeight: 200, justifyContent: 'flex-end', ...SHADOWS.lg },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.2)', alignSelf: 'flex-end', paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, marginBottom: SPACING.xl },
  heroBadgeIcon: { fontSize: 14 },
  heroBadgeText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  heroTitle: { fontSize: FONTS['3xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.white, letterSpacing: -0.5, lineHeight: 36, marginBottom: 8 },
  heroSubtitle: { fontSize: FONTS.base, color: 'rgba(255,255,255,0.65)', lineHeight: 22 },

  statsRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', ...SHADOWS.xs },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  statLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  shareRoundBtn: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
  shareRoundIcon: { fontSize: 18, color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },

  codeCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', gap: SPACING.md, ...SHADOWS.xs },
  codeLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  codeBox: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, width: '100%', alignItems: 'center' },
  codeText: { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.primary, letterSpacing: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.primaryBg, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.full },
  copyBtnIcon: { fontSize: 16 },
  copyBtnText: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary },
  codeHint: { fontSize: FONTS.xs, color: COLORS.textMuted },

  shareSection: { gap: SPACING.md },
  sectionTitle: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  shareRow: { flexDirection: 'row', justifyContent: 'space-between' },
  shareOption: { alignItems: 'center', gap: SPACING.sm },
  shareIconBg: { width: 58, height: 58, borderRadius: RADIUS.xl, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.xs },
  shareIcon: { fontSize: 24 },
  shareLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },

  stepsSection: { gap: SPACING.base },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  stepNumber: { width: 32, height: 32, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  stepNumberActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepNumberText: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  stepContent: { flex: 1, paddingBottom: SPACING.base },
  stepTitle: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 5 },
  stepDesc: { fontSize: FONTS.sm, color: COLORS.textSecondary, lineHeight: 18 },
});
