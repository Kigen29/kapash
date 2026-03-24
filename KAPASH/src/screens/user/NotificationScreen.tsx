/**
 * NotificationsScreen
 * Place at: src/screens/user/NotificationsScreen.tsx
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../../hooks/useData';

const TYPE_ICONS: Record<string, string> = {
  BOOKING_CONFIRMED: '🎉',
  BOOKING_CANCELLED: '❌',
  PAYMENT_RECEIVED:  '💰',
  PAYMENT_FAILED:    '⚠️',
  PAYOUT_SENT:       '💸',
  SLOT_REMINDER:     '⏰',
  REVIEW_REQUEST:    '⭐',
  SYSTEM:            '📢',
};

const TYPE_COLORS: Record<string, string> = {
  BOOKING_CONFIRMED: '#22C55E',
  BOOKING_CANCELLED: '#EF4444',
  PAYMENT_RECEIVED:  '#22C55E',
  PAYMENT_FAILED:    '#EF4444',
  PAYOUT_SENT:       '#22C55E',
  SLOT_REMINDER:     '#F59E0B',
  REVIEW_REQUEST:    '#F59E0B',
  SYSTEM:            '#6B7280',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, error, refetch, markRead, markAllRead } = useNotifications();
  const notifications: any[] = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <View style={s.container}>
      <SafeAreaView>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.title}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={s.unreadLabel}>{unreadCount} unread</Text>
            )}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={s.markAllBtn}>
              <Text style={s.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color="#22C55E" style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>Failed to load notifications</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>🔔</Text>
          <Text style={s.emptyTitle}>No Notifications Yet</Text>
          <Text style={s.emptySubtitle}>You'll see booking updates and alerts here</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
          }
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
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

function NotificationRow({ notification: n, onPress }: { notification: any; onPress: () => void }) {
  const icon  = TYPE_ICONS[n.type]  || '📢';
  const color = TYPE_COLORS[n.type] || '#6B7280';

  return (
    <TouchableOpacity
      style={[s.row, !n.isRead && s.rowUnread]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {!n.isRead && <View style={s.unreadDot} />}
      <View style={[s.iconWrap, { backgroundColor: color + '22' }]}>
        <Text style={s.icon}>{icon}</Text>
      </View>
      <View style={s.rowContent}>
        <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
        <Text style={s.notifBody}  numberOfLines={2}>{n.body}</Text>
        <Text style={s.notifTime}>{timeAgo(n.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0F1923' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1A2535' },
  backBtn:      { width: 36, height: 36, justifyContent: 'center' },
  backArrow:    { fontSize: 22, color: '#fff' },
  headerCenter: { alignItems: 'center' },
  title:        { fontSize: 18, fontWeight: '700', color: '#fff' },
  unreadLabel:  { fontSize: 11, color: '#22C55E', marginTop: 2 },
  markAllBtn:   { paddingHorizontal: 8, paddingVertical: 4 },
  markAllText:  { color: '#22C55E', fontSize: 12, fontWeight: '600' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText:    { color: '#EF4444', fontSize: 15, marginBottom: 12 },
  retryBtn:     { backgroundColor: '#1A2535', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:    { color: '#22C55E', fontWeight: '600' },
  emptyIcon:    { fontSize: 48, marginBottom: 16 },
  emptyTitle:   { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle:{ color: '#6B7280', fontSize: 14, textAlign: 'center' },
  row:          { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1A2535', position: 'relative' },
  rowUnread:    { backgroundColor: '#1A2535' },
  unreadDot:    { position: 'absolute', top: 18, left: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  iconWrap:     { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  icon:         { fontSize: 20 },
  rowContent:   { flex: 1 },
  notifTitle:   { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  notifBody:    { color: '#9CA3AF', fontSize: 13, lineHeight: 18, marginBottom: 6 },
  notifTime:    { color: '#6B7280', fontSize: 11 },
});