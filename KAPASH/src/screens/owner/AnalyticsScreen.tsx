import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useOwnerAnalytics } from '../../hooks/useData';

type Period = 'week' | 'month' | 'year';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

interface Props { navigation: any; }

export default function AnalyticsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [period, setPeriod] = useState<Period>('month');
  const { data, isLoading, error, refetch } = useOwnerAnalytics(period);

  const handleExport = async () => {
    try {
      const summary = [
        `Kapash Analytics — ${period.charAt(0).toUpperCase() + period.slice(1)}`,
        `Revenue: KES ${(data?.totalRevenue ?? 0).toLocaleString()}`,
        `Bookings: ${data?.totalBookings ?? 0}`,
        `Occupancy: ${data?.occupancyRate ?? 0}%`,
      ].join('\n');
      await Share.share({ message: summary });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.85}>
            <Ionicons name="share-outline" size={14} color={colors.primary} />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => {
          const active = period === p.value;
          return (
            <TouchableOpacity
              key={p.value}
              style={[styles.periodBtn, active && styles.periodBtnActive]}
              onPress={() => setPeriod(p.value)}
              activeOpacity={0.85}
            >
              <Text style={[styles.periodBtnText, active && styles.periodBtnTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: SPACING['3xl'] }} />
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={refetch} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Summary cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
            {[
              { icon: 'cash-outline'      as IoniconName, label: 'Revenue',
                value: `KES ${((data?.totalRevenue ?? 0) / 1000).toFixed(1)}k`,
                trend: data?.revenueTrend, },
              { icon: 'calendar-outline'  as IoniconName, label: 'Bookings',
                value: String(data?.totalBookings ?? 0),
                trend: data?.bookingsTrend, },
              { icon: 'pulse-outline'     as IoniconName, label: 'Occupancy',
                value: `${data?.occupancyRate ?? 0}%`,
                trend: data?.occupancyTrend, },
            ].map(card => {
              const up = (card.trend ?? 0) >= 0;
              return (
                <View key={card.label} style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryIconBg}>
                      <Ionicons name={card.icon} size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.summaryLabel}>{card.label}</Text>
                  </View>
                  <Text style={styles.summaryValue}>{card.value}</Text>
                  {card.trend != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons
                        name={up ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={up ? colors.success : colors.error}
                      />
                      <Text style={[styles.trendText, { color: up ? colors.success : colors.error }]}>
                        {up ? '+' : ''}{card.trend}%
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Revenue Chart */}
          <BarChart data={data?.chartData} period={period} colors={colors} styles={styles} />

          {/* Peak Hours */}
          <View style={styles.peakCard}>
            <Text style={styles.cardTitle}>Peak Hours</Text>
            <View style={styles.peakContent}>
              <View style={styles.donut}>
                <Text style={styles.donutLabel}>Peak</Text>
                <Text style={styles.donutValue}>{data?.peakHour ?? '—'}</Text>
              </View>
              <View style={{ flex: 1, gap: SPACING.sm }}>
                {(data?.hourDistribution ?? [
                  { label: 'Evening (6–10pm)', pct: data?.eveningPct ?? 0 },
                  { label: 'Morning',          pct: data?.morningPct ?? 0 },
                  { label: 'Afternoon',        pct: data?.afternoonPct ?? 0 },
                ]).map((item: any, idx: number) => {
                  const dotColors = [colors.primary, '#F59E0B', colors.info];
                  return (
                    <View key={idx} style={styles.legendItem}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: item.color ?? dotColors[idx] }]} />
                        <Text style={styles.legendLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.legendPct}>{item.pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Top Customers */}
          {Array.isArray(data?.topCustomers) && data.topCustomers.length > 0 && (
            <View style={styles.customersCard}>
              <Text style={styles.cardTitle}>Top Customers</Text>
              {data.topCustomers.map((c: any, i: number) => (
                <View key={i} style={[styles.customerRow, i < data.topCustomers.length - 1 && styles.customerRowBorder]}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerInitials}>
                      {(c.name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{c.name}</Text>
                    <Text style={styles.customerMeta}>{c.bookings} Bookings</Text>
                  </View>
                  <Text style={styles.customerRevenue}>KES {(c.totalSpent ?? 0).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function BarChart({
  data, period, colors, styles,
}: { data?: any[]; period: Period; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <View style={[styles.chartCard, { alignItems: 'center', paddingVertical: SPACING.xl }]}>
        <Text style={{ color: colors.textMuted, fontSize: FONTS.sm }}>No chart data available</Text>
      </View>
    );
  }
  const maxVal = Math.max(...data.map(d => d.value ?? d.revenue ?? 0), 1);
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Revenue Trend</Text>
        <Text style={styles.chartPeriod}>{period.charAt(0).toUpperCase() + period.slice(1)}</Text>
      </View>
      <View style={styles.barsRow}>
        {data.map((bar, i) => {
          const v = bar.value ?? bar.revenue ?? 0;
          const height = Math.max(12, (v / maxVal) * 160);
          const isHighest = v === maxVal;
          return (
            <View key={i} style={styles.barColumn}>
              <LinearGradient
                colors={isHighest ? [colors.primary, colors.primaryDark] : [`${colors.primary}40`, `${colors.primary}10`]}
                style={[styles.bar, { height }]}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              />
              <Text style={styles.barLabel}>{bar.label ?? bar.month ?? bar.day ?? bar.week ?? ''}</Text>
            </View>
          );
        })}
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
    exportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: SPACING.md,
      paddingVertical: 7,
      borderRadius: RADIUS.full,
    },
    exportText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: colors.primary },

    periodRow: {
      flexDirection: 'row',
      marginHorizontal: SPACING.base,
      marginBottom: SPACING.base,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    periodBtn: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.lg, alignItems: 'center' },
    periodBtnActive: { backgroundColor: colors.primary },
    periodBtnText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: colors.textMuted },
    periodBtnTextActive: { color: '#fff' },

    content: { paddingHorizontal: SPACING.base, paddingBottom: SPACING['3xl'], gap: SPACING.base },
    summaryRow: { gap: SPACING.md, paddingRight: SPACING.base },
    summaryCard: {
      width: 175,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
    summaryIconBg: {
      width: 36, height: 36, borderRadius: RADIUS.md,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
    },
    summaryLabel: { fontSize: FONTS.sm, color: colors.textSecondary },
    summaryValue: { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: 6 },
    trendText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },

    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.base },
    chartTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    chartPeriod: { fontSize: FONTS.sm, color: colors.textSecondary },
    barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: 176, gap: 6 },
    barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
    bar: { width: '100%', borderRadius: RADIUS.sm },
    barLabel: { fontSize: 10, color: colors.textMuted, fontWeight: FONT_WEIGHT.medium },

    peakCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: SPACING.base },
    peakContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl },
    donut: {
      width: 90, height: 90,
      borderRadius: RADIUS.full,
      borderWidth: 10, borderColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    donutLabel: { fontSize: FONTS.xs, color: colors.textMuted, textAlign: 'center' },
    donutValue: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    legendItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    legendLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    legendDot: { width: 10, height: 10, borderRadius: RADIUS.full },
    legendLabel: { fontSize: FONTS.xs, color: colors.textSecondary },
    legendPct: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },

    customersCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.xl,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    customerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.md },
    customerRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    customerAvatar: {
      width: 42, height: 42,
      borderRadius: RADIUS.full,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
    },
    customerInitials: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, color: colors.primary },
    customerInfo: { flex: 1 },
    customerName: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, marginBottom: 3 },
    customerMeta: { fontSize: FONTS.xs, color: colors.textSecondary },
    customerRevenue: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: colors.primary },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
    errorText: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
    primaryBtn: {
      marginTop: SPACING.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    primaryBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },
  });
}
