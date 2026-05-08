import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOwnerBookings, useOwnerDashboard, useOwnerPitches } from '../../hooks/useData';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { DashboardData } from '../../types/index';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function OwnerDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);
  const { data: dash, isLoading: dashLoading, refetch: refetchDash } = useOwnerDashboard();
  const { data: pitches, refetch: refetchPitches } = useOwnerPitches();
  const { data: confirmedBookings, refetch: refetchConfirmed } = useOwnerBookings({ status: 'CONFIRMED' });

  const d = (dash || {}) as DashboardData;
  const pitchCount = Array.isArray(pitches) ? pitches.length : 0;
  const upcomingBookings: any[] = Array.isArray(confirmedBookings) ? confirmedBookings : [];
  const todayList: any[] = d.todayBookingsList || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDash(), refetchPitches(), refetchConfirmed()]);
    setRefreshing(false);
  };

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Dashboard</Text>
            <Text style={s.subGreet}>{user?.name || 'Owner'}</Text>
          </View>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.85}>
            <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
            <View style={s.dot} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}
      >
        {dashLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING['3xl'] }} />
        ) : (
          <>
            {/* Hero card */}
            <LinearGradient
              colors={[colors.primaryDark, colors.primary]}
              style={s.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={s.heroLabel}>This Month's Revenue</Text>
              <Text style={s.heroAmount}>
                KSh {(d.monthlyRevenue || 0).toLocaleString()}
              </Text>
              <View style={s.heroRow}>
                <MiniStat label="Today"     value={`KSh ${(d.todayRevenue || 0).toLocaleString()}`} />
                <View style={s.heroDivider} />
                <MiniStat label="Bookings"  value={String(d.monthlyBookings || 0)} />
                <View style={s.heroDivider} />
                <MiniStat label="Occupancy" value={`${d.occupancyRate || 0}%`} />
              </View>
            </LinearGradient>

            {/* Quick stats grid */}
            <View style={s.grid}>
              <StatCard icon="calendar-outline" label="Today's Bookings" value={d.todayBookings || 0} colors={colors} />
              <StatCard icon="hourglass-outline" label="Pending"          value={d.pendingBookings || 0} colors={colors} />
              <StatCard icon="star-outline"      label="Avg Rating"       value={(d.avgRating || 0).toFixed(1)} colors={colors} />
              <StatCard icon="business-outline"  label="Pitches"          value={pitchCount} colors={colors} />
            </View>

            {/* Pending payout */}
            {(d.pendingPayout || 0) > 0 && (
              <TouchableOpacity
                style={s.payoutCard}
                onPress={() => navigation.navigate('Account')}
                activeOpacity={0.9}
              >
                <View style={s.payoutIconWrap}>
                  <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.payoutLabel}>Pending Payout</Text>
                  <Text style={s.payoutAmount}>KSh {(d.pendingPayout || 0).toLocaleString()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {/* Today's bookings */}
            <SectionHeader title="Today" colors={colors} count={todayList.length} />
            {todayList.length === 0 ? (
              <EmptyRow text="No bookings today" colors={colors} icon="calendar-clear-outline" />
            ) : (
              todayList.slice(0, 5).map((b: any) => (
                <BookingRow key={b.id} booking={b} colors={colors} styles={s} />
              ))
            )}

            {/* Upcoming bookings */}
            <SectionHeader
              title="Upcoming"
              colors={colors}
              count={upcomingBookings.length}
              actionLabel={upcomingBookings.length > 5 ? 'See all' : undefined}
              onAction={() => navigation.navigate('Schedule')}
            />
            {upcomingBookings.length === 0 ? (
              <EmptyRow text="No upcoming bookings" colors={colors} icon="time-outline" />
            ) : (
              upcomingBookings
                .filter((b: any) => b.date && b.date.split('T')[0] !== todayISO())
                .slice(0, 5)
                .map((b: any) => (
                  <BookingRow key={b.id} booking={b} colors={colors} styles={s} />
                ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: FONTS.xs, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function StatCard({
  icon, label, value, colors,
}: { icon: IoniconName; label: string; value: string | number; colors: ColorPalette }) {
  return (
    <View style={{
      flexBasis: '48%',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
      gap: SPACING.sm,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: RADIUS.sm,
        backgroundColor: colors.primaryMuted,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View>
        <Text style={{ color: colors.textPrimary, fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold }}>{value}</Text>
        <Text style={{ color: colors.textMuted, fontSize: FONTS.xs, marginTop: 2 }}>{label}</Text>
      </View>
    </View>
  );
}

function SectionHeader({
  title, colors, count, actionLabel, onAction,
}: { title: string; colors: ColorPalette; count?: number; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      marginTop: SPACING.xl,
      marginBottom: SPACING.md,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm }}>
        <Text style={{ color: colors.textPrimary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold }}>{title}</Text>
        {count != null && (
          <Text style={{ color: colors.textMuted, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.medium }}>
            {count}
          </Text>
        )}
      </View>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={{ color: colors.primary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold }}>{actionLabel} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyRow({
  text, colors, icon,
}: { text: string; colors: ColorPalette; icon: IoniconName }) {
  return (
    <View style={{
      marginHorizontal: SPACING.base,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: FONTS.sm }}>{text}</Text>
    </View>
  );
}

function BookingRow({
  booking, colors, styles,
}: { booking: any; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  const time = booking.startTime && booking.endTime ? `${booking.startTime} – ${booking.endTime}` : '—';
  const dateStr = booking.date
    ? new Date(booking.date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';
  const userName = booking.user?.name || booking.userName || 'Customer';
  const pitchName = booking.pitchName || booking.pitch?.name || '';
  return (
    <View style={styles.bookingRow}>
      <View style={styles.bookingTime}>
        <Text style={styles.bookingTimeText}>{booking.startTime || '—'}</Text>
        <Text style={styles.bookingDateText}>{dateStr || 'Today'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bookingName} numberOfLines={1}>{userName}</Text>
        <Text style={styles.bookingPitch} numberOfLines={1}>{pitchName} • {time}</Text>
      </View>
      <Text style={styles.bookingAmount}>
        KSh {(booking.totalAmount || 0).toLocaleString()}
      </Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    safeTop:   { backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
      gap: SPACING.sm,
    },
    greeting: { fontSize: FONTS.sm, color: colors.textMuted },
    subGreet: {
      fontSize: FONTS['2xl'],
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      marginTop: 2,
    },
    iconBtn: {
      width: 40, height: 40,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    dot: {
      position: 'absolute', top: 9, right: 10,
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: colors.primary,
      borderWidth: 1.5, borderColor: colors.surface,
    },

    hero: {
      marginHorizontal: SPACING.base,
      borderRadius: RADIUS.xl,
      padding: SPACING.xl,
      marginTop: SPACING.sm,
    },
    heroLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.semiBold,
    },
    heroAmount: {
      color: '#fff',
      fontSize: FONTS['4xl'],
      fontWeight: FONT_WEIGHT.bold,
      marginTop: SPACING.xs,
      letterSpacing: -0.5,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.md,
      marginTop: SPACING.lg,
    },
    heroDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(255,255,255,0.4)',
      alignSelf: 'stretch',
    },

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: SPACING.base,
      gap: SPACING.md,
      marginTop: SPACING.base,
    },

    payoutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginHorizontal: SPACING.base,
      marginTop: SPACING.base,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    payoutIconWrap: {
      width: 40, height: 40, borderRadius: RADIUS.sm,
      backgroundColor: colors.primaryMuted,
      justifyContent: 'center', alignItems: 'center',
    },
    payoutLabel: { color: colors.textMuted, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold },
    payoutAmount: { color: colors.primary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, marginTop: 2 },

    bookingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginHorizontal: SPACING.base,
      marginBottom: SPACING.sm,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bookingTime: {
      width: 64,
      alignItems: 'center',
    },
    bookingTimeText: {
      color: colors.primary,
      fontSize: FONTS.md,
      fontWeight: FONT_WEIGHT.bold,
    },
    bookingDateText: {
      color: colors.textMuted,
      fontSize: FONTS.xs,
      marginTop: 2,
    },
    bookingName: {
      color: colors.textPrimary,
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.bold,
    },
    bookingPitch: {
      color: colors.textMuted,
      fontSize: FONTS.xs,
      marginTop: 2,
    },
    bookingAmount: {
      color: colors.textPrimary,
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.bold,
    },
  });
}
