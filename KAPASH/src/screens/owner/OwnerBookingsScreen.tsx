import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { useOwnerBookings } from '../../hooks/useData';

interface Props { navigation: any; }

const TABS = [
  { key: 'CONFIRMED',       label: 'Upcoming' },
  { key: 'COMPLETED',       label: 'Completed' },
  { key: 'PENDING_PAYMENT', label: 'Pending' },
  { key: 'CANCELLED',       label: 'Cancelled' },
];

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED:        'Confirmed',
  PENDING_PAYMENT:  'Pending Payment',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
  NO_SHOW:          'No-show',
};

function getStatusColor(status: string, c: ColorPalette) {
  switch (status) {
    case 'CONFIRMED':       return c.primary;
    case 'PENDING_PAYMENT': return c.pending;
    case 'COMPLETED':       return c.textMuted;
    case 'CANCELLED':       return c.error;
    case 'NO_SHOW':         return c.error;
    default:                return c.textMuted;
  }
}

export default function OwnerBookingsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, error, refetch } = useOwnerBookings({
    status: TABS[activeTab].key,
  });
  const list: any[] = Array.isArray(bookings) ? bookings : [];

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
          <Text style={styles.headerTitle}>Bookings</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={refetch} hitSlop={8}>
            <Ionicons name="refresh" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((t, i) => {
            const active = activeTab === i;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(i)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={refetch} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No {TABS[activeTab].label.toLowerCase()} bookings</Text>
          <Text style={styles.emptyText}>
            {activeTab === 0
              ? 'Confirmed bookings on your pitches will show here.'
              : 'Nothing in this category yet.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.base, paddingBottom: SPACING['3xl'] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <BookingRow
              booking={item}
              colors={colors}
              styles={styles}
              onPress={() => navigation.navigate('BookingConfirmation', { bookingId: item.id })}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}
    </View>
  );
}

function BookingRow({
  booking, colors, styles, onPress,
}: {
  booking: any;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}) {
  const status = booking.status;
  const color = getStatusColor(status, colors);
  const dateStr = booking.date
    ? new Date(booking.date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })
    : '—';
  const userName = booking.user?.name || 'Customer';
  const phone = booking.user?.phone;
  const pitchName = booking.pitchName || booking.pitch?.name;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardTime}>{booking.startTime}</Text>
        <View style={styles.cardTimeLine} />
        <Text style={styles.cardTime}>{booking.endTime}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm }}>
          <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${color}1A` }]}>
            <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[status] || status}</Text>
          </View>
        </View>
        {pitchName ? (
          <View style={styles.metaRow}>
            <Ionicons name="business-outline" size={11} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{pitchName}</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
          <Text style={styles.metaText}>{dateStr}</Text>
          {phone ? (
            <>
              <View style={styles.metaDot} />
              <Ionicons name="call-outline" size={11} color={colors.textMuted} />
              <Text style={styles.metaText}>{phone}</Text>
            </>
          ) : null}
        </View>
        <Text style={styles.amount}>KSh {(booking.totalAmount || 0).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSafe: {
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },

    tabsRow: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.md, gap: SPACING.sm },
    tab: {
      paddingHorizontal: SPACING.base,
      paddingVertical: 8,
      borderRadius: RADIUS.full,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { color: colors.textMuted, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },
    tabTextActive: { color: '#fff' },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
    errorText: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    primaryBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },
    emptyIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.primaryMuted,
      justifyContent: 'center', alignItems: 'center',
    },
    emptyTitle: { color: colors.textPrimary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold },
    emptyText: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },

    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden',
    },
    cardLeft: {
      width: 80,
      paddingVertical: SPACING.md,
      alignItems: 'center', justifyContent: 'center',
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
    },
    cardTime: { color: colors.textPrimary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold },
    cardTimeLine: { width: 2, height: 8, borderRadius: 1, backgroundColor: colors.border, marginVertical: 4 },
    cardBody: { flex: 1, padding: SPACING.md, gap: 4 },
    userName: { flex: 1, color: colors.textPrimary, fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold },
    statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.sm },
    statusText: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.bold },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
    metaText: { color: colors.textMuted, fontSize: FONTS.xs },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted, marginHorizontal: 4 },
    amount: { color: colors.primary, fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, marginTop: 4 },
  });
}
