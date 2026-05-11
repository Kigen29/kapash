import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Share, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { useReferral } from '../../hooks/useData';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props { navigation: any; }

const SHARE_OPTIONS: { icon: IoniconName; label: string; color: string }[] = [
  { icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366' },
  { icon: 'logo-facebook', label: 'Facebook', color: '#1877F2' },
  { icon: 'logo-twitter',  label: 'Twitter',  color: '#1DA1F2' },
  { icon: 'share-social-outline', label: 'More', color: '#6B7280' },
];

export default function ReferralScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data, isLoading, error, refetch } = useReferral();

  const referralCode  = data?.referralCode   ?? '—';
  const referralCount = data?.referralCount  ?? 0;
  const totalEarned   = data?.totalEarned    ?? 0;
  const earningsPer   = data?.earningsPerReferral ?? 500;

  const shareMessage = `Join Kapash and book sports pitches easily! Use my referral code ${referralCode} to get started.`;

  const handleShare = async () => {
    try { await Share.share({ message: shareMessage }); } catch {}
  };

  const handleCopy = async () => {
    try { await Share.share({ message: referralCode }); } catch {}
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={refetch} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.hero}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroBadge}>
              <Ionicons name="trophy" size={12} color="#FBBF24" />
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
            <TouchableOpacity style={styles.shareRoundBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Referral Code */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Your Referral Code</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{referralCode}</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.85}>
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
              <Text style={styles.copyBtnText}>Share Code</Text>
            </TouchableOpacity>
            <Text style={styles.codeHint}>Share this code with friends</Text>
          </View>

          {/* Share Options */}
          <View style={{ gap: SPACING.md }}>
            <Text style={styles.sectionTitle}>Share via</Text>
            <View style={styles.shareRow}>
              {SHARE_OPTIONS.map(item => (
                <TouchableOpacity key={item.label} style={styles.shareOption} onPress={handleShare} activeOpacity={0.85}>
                  <View style={[styles.shareIconBg, { backgroundColor: `${item.color}1A` }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <Text style={styles.shareLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* How it works */}
          <View style={{ gap: SPACING.base }}>
            <Text style={styles.sectionTitle}>How it works</Text>
            {[
              { n: '1', title: 'Share Your Code',     desc: 'Send your referral code to friends via WhatsApp, SMS or social media.' },
              { n: '2', title: 'Friend Signs Up',     desc: 'Your friend creates a Kapash account using your code.' },
              { n: '3', title: `Earn KES ${earningsPer.toLocaleString()}`, desc: `You receive KES ${earningsPer.toLocaleString()} when your friend completes their first booking.` },
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepNumber, i === 2 && styles.stepNumberActive]}>
                  <Text style={[styles.stepNumberText, i === 2 && { color: '#fff' }]}>{step.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSafe: { backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },

    content: { paddingHorizontal: SPACING.base, paddingBottom: SPACING['3xl'], gap: SPACING.lg },

    hero: {
      borderRadius: RADIUS['2xl'],
      padding: SPACING.xl,
      minHeight: 200,
      justifyContent: 'flex-end',
    },
    heroBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignSelf: 'flex-end',
      paddingHorizontal: SPACING.md, paddingVertical: 6,
      borderRadius: RADIUS.full,
      marginBottom: SPACING.xl,
    },
    heroBadgeText: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.bold, color: '#fff' },
    heroTitle: {
      fontSize: FONTS['3xl'],
      fontWeight: FONT_WEIGHT.extraBold,
      color: '#fff',
      letterSpacing: -0.5,
      lineHeight: 36,
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: FONTS.sm,
      color: 'rgba(255,255,255,0.85)',
      lineHeight: 20,
    },

    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl,
      padding: SPACING.base,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statCard: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    statLabel: { fontSize: FONTS.xs, color: colors.textMuted },
    statDivider: { width: StyleSheet.hairlineWidth, height: 40, backgroundColor: colors.border },
    shareRoundBtn: {
      width: 36, height: 36, borderRadius: RADIUS.full,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
    },

    codeCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl,
      padding: SPACING.lg,
      alignItems: 'center',
      gap: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    codeLabel: { fontSize: FONTS.sm, color: colors.textMuted, fontWeight: FONT_WEIGHT.medium },
    codeBox: {
      backgroundColor: colors.background,
      borderRadius: RADIUS.lg,
      borderWidth: 2, borderStyle: 'dashed',
      borderColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      width: '100%',
      alignItems: 'center',
    },
    codeText: {
      fontSize: FONTS['2xl'],
      fontWeight: FONT_WEIGHT.extraBold,
      color: colors.primary,
      letterSpacing: 2,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.full,
    },
    copyBtnText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: colors.primary },
    codeHint: { fontSize: FONTS.xs, color: colors.textMuted },

    sectionTitle: {
      fontSize: FONTS.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
    },
    shareRow: { flexDirection: 'row', justifyContent: 'space-between' },
    shareOption: { alignItems: 'center', gap: SPACING.xs },
    shareIconBg: {
      width: 58, height: 58, borderRadius: RADIUS.xl,
      alignItems: 'center', justifyContent: 'center',
    },
    shareLabel: { fontSize: FONTS.xs, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },

    step: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
    stepNumber: {
      width: 32, height: 32, borderRadius: RADIUS.full,
      borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    stepNumberActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    stepNumberText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    stepTitle: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: 4 },
    stepDesc: { fontSize: FONTS.sm, color: colors.textSecondary, lineHeight: 20 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
    errorText: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    primaryBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },
  });
}
