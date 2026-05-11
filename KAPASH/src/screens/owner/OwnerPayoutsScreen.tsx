import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { useFetch } from '../../hooks/useData';
import { OWNER } from '../../services/api';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props { navigation: any; }

const STATUS_CONFIG: Record<string, { label: string; icon: IoniconName }> = {
  PENDING:    { label: 'Pending',    icon: 'time-outline' },
  PROCESSING: { label: 'Processing', icon: 'sync-outline' },
  COMPLETED:  { label: 'Paid',       icon: 'checkmark-circle-outline' },
  FAILED:     { label: 'Failed',     icon: 'alert-circle-outline' },
};

function getStatusColor(status: string, c: ColorPalette) {
  switch (status) {
    case 'COMPLETED':              return c.primary;
    case 'PROCESSING':              return c.info;
    case 'PENDING':                 return c.pending;
    case 'FAILED':                  return c.error;
    default:                        return c.textMuted;
  }
}

export default function OwnerPayoutsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useFetch(
    () => OWNER.getPayouts(),
    [],
    { transform: (d) => Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [] },
  );
  const payouts: any[] = Array.isArray(data) ? data : [];

  const totals = useMemo(() => {
    return payouts.reduce(
      (acc, p) => {
        const amount = p.amount || 0;
        if (p.status === 'PENDING' || p.status === 'PROCESSING') acc.pending += amount;
        else if (p.status === 'COMPLETED') acc.paid += amount;
        return acc;
      },
      { pending: 0, paid: 0 },
    );
  }, [payouts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payouts</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: SPACING['3xl'], gap: SPACING.base }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* Summary hero */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.hero}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={styles.heroLabel}>Pending payouts</Text>
          <Text style={styles.heroAmount}>KSh {totals.pending.toLocaleString()}</Text>
          <View style={styles.heroDivider} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.heroSubLabel}>Lifetime paid</Text>
              <Text style={styles.heroSubValue}>KSh {totals.paid.toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.heroSubLabel}>Total payouts</Text>
              <Text style={styles.heroSubValue}>{payouts.length}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Info banner */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Payouts are scheduled automatically after each booking is completed. You'll receive M-Pesa within 24 hours of the scheduled date.
          </Text>
        </View>

        {/* History */}
        <Text style={styles.sectionLabel}>History</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING.lg }} />
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refetch} activeOpacity={0.85}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : payouts.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="wallet-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No payouts yet</Text>
            <Text style={styles.emptyText}>Payouts appear here once your first booking is completed.</Text>
          </View>
        ) : (
          payouts.map(p => <PayoutRow key={p.id} payout={p} colors={colors} styles={styles} />)
        )}
      </ScrollView>
    </View>
  );
}

function PayoutRow({
  payout, colors, styles,
}: { payout: any; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  const cfg = STATUS_CONFIG[payout.status] ?? STATUS_CONFIG.PENDING;
  const color = getStatusColor(payout.status, colors);
  const dateLabel = payout.processedAt ?? payout.scheduledFor ?? payout.createdAt;
  const dateStr = dateLabel
    ? new Date(dateLabel).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const pitchName = payout.booking?.pitchName || '—';

  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={cfg.icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{pitchName}</Text>
          <Text style={[styles.rowStatus, { color }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.rowMeta}>
          {dateStr}
          {payout.mpesaTransactionId ? ` · ${payout.mpesaTransactionId}` : ''}
        </Text>
        <Text style={[styles.rowAmount, payout.status === 'COMPLETED' && { color: colors.primary }]}>
          KSh {(payout.amount || 0).toLocaleString()}
        </Text>
      </View>
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

    hero: { borderRadius: RADIUS.xl, padding: SPACING.xl },
    heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },
    heroAmount: { color: '#fff', fontSize: FONTS['4xl'], fontWeight: FONT_WEIGHT.bold, marginTop: 4, letterSpacing: -0.5 },
    heroDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: SPACING.md },
    heroSubLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FONTS.xs },
    heroSubValue: { color: '#fff', fontSize: FONTS.md, fontWeight: FONT_WEIGHT.bold, marginTop: 2 },

    infoBox: {
      flexDirection: 'row',
      gap: SPACING.sm,
      backgroundColor: colors.primaryMuted,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      borderWidth: 1, borderColor: colors.primary,
      alignItems: 'flex-start',
    },
    infoText: { flex: 1, color: colors.textSecondary, fontSize: FONTS.xs, lineHeight: 18 },

    sectionLabel: {
      fontSize: FONTS.xs,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs,
    },

    empty: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
    emptyIconWrap: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: colors.primaryMuted,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    emptyTitle: { color: colors.textPrimary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold },
    emptyText: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
    retryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      marginTop: SPACING.sm,
    },
    retryBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },

    row: {
      flexDirection: 'row',
      gap: SPACING.md,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'flex-start',
    },
    rowIcon: {
      width: 40, height: 40, borderRadius: RADIUS.sm,
      alignItems: 'center', justifyContent: 'center',
    },
    rowTitle: { flex: 1, color: colors.textPrimary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold },
    rowStatus: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.bold },
    rowMeta: { color: colors.textMuted, fontSize: FONTS.xs, marginTop: 2 },
    rowAmount: { color: colors.textPrimary, fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, marginTop: 6 },
  });
}
