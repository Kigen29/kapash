import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useOwnerAnalytics } from '../../hooks/useData';

type Period = 'week' | 'month' | 'year';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

interface Props { navigation: any; }

export default function AnalyticsScreen({ navigation }: Props) {
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportText}>Export ↓</Text>
        </TouchableOpacity>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p.value}
            style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[styles.periodBtnText, period === p.value && styles.periodBtnTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : error ? (
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
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Summary cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
            {[
              {
                icon: '💰', label: 'Revenue',
                value: `KES ${((data?.totalRevenue ?? 0) / 1000).toFixed(1)}k`,
                trend: data?.revenueTrend ? `${data.revenueTrend > 0 ? '+' : ''}${data.revenueTrend}%` : null,
                up: (data?.revenueTrend ?? 0) >= 0,
              },
              {
                icon: '📅', label: 'Bookings',
                value: String(data?.totalBookings ?? 0),
                trend: data?.bookingsTrend ? `${data.bookingsTrend > 0 ? '+' : ''}${data.bookingsTrend}%` : null,
                up: (data?.bookingsTrend ?? 0) >= 0,
              },
              {
                icon: '📊', label: 'Occupancy',
                value: `${data?.occupancyRate ?? 0}%`,
                trend: data?.occupancyTrend ? `${data.occupancyTrend > 0 ? '+' : ''}${data.occupancyTrend}%` : null,
                up: (data?.occupancyTrend ?? 0) >= 0,
              },
            ].map(card => (
              <View key={card.label} style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                  <View style={styles.summaryIconBg}>
                    <Text style={styles.summaryIcon}>{card.icon}</Text>
                  </View>
                  <Text style={styles.summaryLabel}>{card.label}</Text>
                </View>
                <Text style={styles.summaryValue}>{card.value}</Text>
                {card.trend ? (
                  <View style={styles.trendRow}>
                    <Text style={[styles.trendText, { color: card.up ? COLORS.success : COLORS.error }]}>
                      {card.up ? '↑' : '↓'} {card.trend}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>

          {/* Revenue Chart */}
          <BarChart data={data?.chartData} period={period} />

          {/* Peak Hours */}
          <View style={styles.peakCard}>
            <Text style={styles.cardTitle}>Peak Hours</Text>
            <View style={styles.peakContent}>
              <View style={styles.donut}>
                <Text style={styles.donutLabel}>Peak</Text>
                <Text style={styles.donutValue}>{data?.peakHour ?? '—'}</Text>
              </View>
              <View style={styles.legend}>
                {(data?.hourDistribution ?? [
                  { label: 'Evening (6–10pm)', pct: data?.eveningPct ?? 0, color: COLORS.primary },
                  { label: 'Morning', pct: data?.morningPct ?? 0, color: '#F59E0B' },
                  { label: 'Afternoon', pct: data?.afternoonPct ?? 0, color: '#3B82F6' },
                ]).map((item: any, idx: number) => {
                  const colors = [COLORS.primary, '#F59E0B', '#3B82F6'];
                  return (
                    <View key={idx} style={styles.legendItem}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: item.color ?? colors[idx] }]} />
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

function BarChart({ data, period }: { data?: any[]; period: Period }) {
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <View style={[styles.chartCard, { alignItems: 'center', paddingVertical: SPACING.xl }]}>
        <Text style={{ color: COLORS.textMuted, fontSize: FONTS.sm }}>No chart data available</Text>
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
          const height = Math.max(12, ((bar.value ?? bar.revenue ?? 0) / maxVal) * 160);
          const isHighest = (bar.value ?? bar.revenue ?? 0) === maxVal;
          return (
            <View key={i} style={styles.barColumn}>
              <LinearGradient
                colors={isHighest ? [COLORS.primary, COLORS.primaryDark] : ['rgba(34,197,94,0.25)', 'rgba(34,197,94,0.08)']}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingTop: 56, paddingBottom: SPACING.base },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  exportBtn: { backgroundColor: COLORS.primaryBg, paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.full },
  exportText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary },

  periodRow: { flexDirection: 'row', marginHorizontal: SPACING.base, marginBottom: SPACING.base, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 4, ...SHADOWS.xs },
  periodBtn: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.lg, alignItems: 'center' },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodBtnText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textMuted },
  periodBtnTextActive: { color: COLORS.white },

  content: { paddingHorizontal: SPACING.base, paddingBottom: SPACING['3xl'], gap: SPACING.base },
  summaryRow: { gap: SPACING.md, paddingRight: SPACING.base },
  summaryCard: { width: 175, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, ...SHADOWS.sm },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  summaryIconBg: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
  summaryIcon: { fontSize: 18 },
  summaryLabel: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  summaryValue: { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 6 },
  trendRow: {},
  trendText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },

  chartCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, ...SHADOWS.sm },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.base },
  chartTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  chartPeriod: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', height: 176, gap: 6 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  bar: { width: '100%', borderRadius: RADIUS.sm },
  barLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.medium },

  peakCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, ...SHADOWS.sm },
  cardTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  peakContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xl },
  donut: { width: 90, height: 90, borderRadius: RADIUS.full, borderWidth: 10, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  donutLabel: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center' },
  donutValue: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  legend: { flex: 1, gap: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  legendDot: { width: 10, height: 10, borderRadius: RADIUS.full },
  legendLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary },
  legendPct: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },

  customersCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, ...SHADOWS.sm },
  customerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.md },
  customerRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  customerAvatar: { width: 42, height: 42, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
  customerInitials: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  customerInfo: { flex: 1 },
  customerName: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, marginBottom: 3 },
  customerMeta: { fontSize: FONTS.xs, color: COLORS.textSecondary },
  customerRevenue: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
});
