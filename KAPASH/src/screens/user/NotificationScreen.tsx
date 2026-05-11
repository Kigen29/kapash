import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../hooks/useData';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TYPE_ICONS: Record<string, IoniconName> = {
  BOOKING_CONFIRMED: 'checkmark-circle-outline',
  BOOKING_CANCELLED: 'close-circle-outline',
  PAYMENT_RECEIVED:  'cash-outline',
  PAYMENT_FAILED:    'alert-circle-outline',
  PAYOUT_SENT:       'card-outline',
  SLOT_REMINDER:     'time-outline',
  REVIEW_REQUEST:    'star-outline',
  SYSTEM:            'megaphone-outline',
};

function getTypeColor(type: string, c: ColorPalette) {
  switch (type) {
    case 'BOOKING_CONFIRMED':
    case 'PAYMENT_RECEIVED':
    case 'PAYOUT_SENT':       return c.primary;
    case 'BOOKING_CANCELLED':
    case 'PAYMENT_FAILED':    return c.error;
    case 'SLOT_REMINDER':
    case 'REVIEW_REQUEST':    return c.pending;
    default:                  return c.textMuted;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, error, refetch, markRead, markAllRead } = useNotifications();
  const notifications: any[] = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={s.unreadLabel}>{unreadCount} unread</Text>
            )}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} hitSlop={8}>
              <Text style={s.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={s.errorText}>Failed to load notifications</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={refetch} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="notifications-outline" size={36} color={colors.primary} />
          </View>
          <Text style={s.emptyTitle}>No Notifications Yet</Text>
          <Text style={s.emptySubtitle}>You'll see booking updates and alerts here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              colors={colors}
              styles={s}
              onPress={() => {
                if (!item.isRead) markRead(item.id);
                if (item.data?.bookingId) {
                  navigation.navigate('BookingConfirmation', { bookingId: item.data.bookingId });
                }
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function NotificationRow({
  notification: n, colors, styles, onPress,
}: {
  notification: any;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}) {
  const icon  = TYPE_ICONS[n.type] || 'megaphone-outline';
  const color = getTypeColor(n.type, colors);

  return (
    <TouchableOpacity style={[styles.row, !n.isRead && styles.rowUnread]} onPress={onPress} activeOpacity={0.85}>
      {!n.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      <View style={[styles.iconWrap, { backgroundColor: `${color}1A` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
        <Text style={styles.notifBody}  numberOfLines={2}>{n.body}</Text>
        <Text style={styles.notifTime}>{timeAgo(n.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSafe: { backgroundColor: colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { alignItems: 'center' },
    title: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    unreadLabel: { fontSize: FONTS.xs, color: colors.primary, marginTop: 2 },
    markAllText: { color: colors.primary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
    errorText: { color: colors.textMuted, fontSize: FONTS.sm },
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
      marginBottom: SPACING.sm,
    },
    emptyTitle: { color: colors.textPrimary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold },
    emptySubtitle: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },

    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: SPACING.base,
      gap: SPACING.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowUnread: { backgroundColor: colors.surface },
    unreadDot: {
      position: 'absolute', top: 22, left: 4,
      width: 6, height: 6, borderRadius: 3,
    },
    iconWrap: {
      width: 40, height: 40, borderRadius: RADIUS.sm,
      justifyContent: 'center', alignItems: 'center',
    },
    notifTitle: { color: colors.textPrimary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, marginBottom: 3 },
    notifBody: { color: colors.textSecondary, fontSize: FONTS.sm, lineHeight: 18, marginBottom: 6 },
    notifTime: { color: colors.textMuted, fontSize: FONTS.xs },
  });
}
