import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const BAR_DATA = [
  { month: 'Jan', height: 60 },
  { month: 'Feb', height: 95 },
  { month: 'Mar', height: 50 },
  { month: 'Apr', height: 130 },
  { month: 'May', height: 160 },
  { month: 'Jun', height: 140 },
  { month: 'Jul', height: 90 },
];

interface Props { navigation: any; }

export default function AnalyticsScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.exportBtn}>
          <Text style={styles.exportText}>Export ↓</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryRow}>
          {[
            { icon: '💰', label: 'Revenue', value: 'KES 120k', trend: '+12%', up: true },
            { icon: '📅', label: 'Bookings', value: '42', trend: '+8%', up: true },
            { icon: '📊', label: 'Occupancy', value: '78%', trend: '-2%', up: false },
          ].map(card => (
            <View key={card.label} style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <View style={styles.summaryIconBg}>
                  <Text style={styles.summaryIcon}>{card.icon}</Text>
                </View>
                <Text style={styles.summaryLabel}>{card.label}</Text>
              </View>
              <Text style={styles.summaryValue}>{card.value}</Text>
              <View style={styles.trendRow}>
                <Text style={[styles.trendText, { color: card.up ? COLORS.success : COLORS.error }]}>
                  {card.up ? '↑' : '↓'} {card.trend}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Revenue Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Revenue Trend</Text>
            <Text style={styles.chartPeriod}>Monthly</Text>
          </View>
          <View style={styles.barsRow}>
            {BAR_DATA.map((bar, i) => (
              <View key={i} style={styles.barColumn}>
                <LinearGradient
                  colors={i === 4 ? [COLORS.primary, COLORS.primaryDark] : ['rgba(34,197,94,0.25)', 'rgba(34,197,94,0.08)']}
                  style={[styles.bar, { height: bar.height }]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
                <Text style={styles.barLabel}>{bar.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Peak Hours */}
        <View style={styles.peakCard}>
          <Text style={styles.cardTitle}>Peak Hours</Text>
          <View style={styles.peakContent}>
            <View style={styles.donut}>
              <Text style={styles.donutLabel}>Peak</Text>
              <Text style={styles.donutValue}>18:00</Text>
            </View>
            <View style={styles.legend}>
              {[
                { color: COLORS.primary, label: 'Evening (6–10pm)', pct: '45%' },
                { color: '#F59E0B', label: 'Morning', pct: '30%' },
                { color: '#3B82F6', label: 'Afternoon', pct: '25%' },
              ].map(item => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.legendPct}>{item.pct}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Customers */}
        <View style={styles.customersCard}>
          <Text style={styles.cardTitle}>Top Customers</Text>
          {[
            { initials: 'JD', name: 'John Doe', meta: '12 Bookings • 2d ago', revenue: 'KES 30k' },
            { initials: 'SF', name: 'Simba FC', meta: '8 Bookings • 5h ago', revenue: 'KES 20k' },
            { initials: 'SN', name: 'Sarah N.', meta: '6 Bookings • 1w ago', revenue: 'KES 15k' },
          ].map((c, i) => (
            <View key={i} style={[styles.customerRow, i < 2 && styles.customerRowBorder]}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerInitials}>{c.initials}</Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{c.name}</Text>
                <Text style={styles.customerMeta}>{c.meta}</Text>
              </View>
              <Text style={styles.customerRevenue}>{c.revenue}</Text>
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
  exportBtn: { backgroundColor: COLORS.primaryBg, paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.full },
  exportText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.primary },
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