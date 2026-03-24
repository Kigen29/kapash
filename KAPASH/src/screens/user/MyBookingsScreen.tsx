/**
 * MyBookingsScreen
 * Place at: src/screens/user/MyBookingsScreen.tsx
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBookings } from '../../hooks/useData';

const TABS = [
  { label: 'Upcoming', status: 'CONFIRMED,PENDING,PENDING_PAYMENT' },
  { label: 'Past',     status: 'COMPLETED,CANCELLED' },
];

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:        '#22C55E',
  PENDING:          '#F59E0B',
  PENDING_PAYMENT:  '#F59E0B',
  COMPLETED:        '#6B7280',
  CANCELLED:        '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED:        'Confirmed',
  PENDING:          'Pending',
  PENDING_PAYMENT:  'Awaiting Payment',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
};

export default function MyBookingsScreen({ navigation }: any) {
  const [activeTab, setActiveTab]   = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, error, refetch } = useBookings(TABS[activeTab].status);
  const list: any[] = Array.isArray(bookings) ? bookings : [];

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
          <Text style={s.title}>My Bookings</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={s.tabRow}>
          {TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab.label}
              style={[s.tab, activeTab === i && s.tabActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color="#22C55E" style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>Failed to load bookings</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : list.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>{activeTab === 0 ? '📅' : '🏟️'}</Text>
          <Text style={s.emptyTitle}>No {TABS[activeTab].label} Bookings</Text>
          <Text style={s.emptySubtitle}>
            {activeTab === 0
              ? 'Book a pitch to get started'
              : 'Your past bookings will appear here'}
          </Text>
          {activeTab === 0 && (
            <TouchableOpacity
              style={s.browseBtn}
              onPress={() => navigation.navigate('Main')}
            >
              <Text style={s.browseBtnText}>Browse Pitches</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => navigation.navigate('BookingConfirmation', { bookingId: item.id })}
            />
          )}
        />
      )}
    </View>
  );
}

function BookingCard({ booking, onPress }: { booking: any; onPress: () => void }) {
  const color  = STATUS_COLORS[booking.status] || '#6B7280';
  const label  = STATUS_LABELS[booking.status] || booking.status;
  const image  = booking.pitch?.images?.[0]?.url;
  const dateStr = booking.date
    ? new Date(booking.date).toLocaleDateString('en-KE', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardImageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={s.cardImage} />
        ) : (
          <View style={[s.cardImage, s.cardImagePlaceholder]}>
            <Text style={{ fontSize: 28 }}>🏟️</Text>
          </View>
        )}
        <View style={[s.statusBadge, { backgroundColor: color + '22', borderColor: color }]}>
          <Text style={[s.statusText, { color }]}>{label}</Text>
        </View>
      </View>

      <View style={s.cardBody}>
        <Text style={s.pitchName} numberOfLines={1}>
          {booking.pitchName || booking.pitch?.name || '—'}
        </Text>
        <Text style={s.pitchAddr} numberOfLines={1}>
          {booking.pitchAddress || booking.pitch?.address || '—'}
        </Text>

        <View style={s.cardRow}>
          <View style={s.cardMeta}>
            <Text style={s.metaIcon}>📅</Text>
            <Text style={s.metaText}>{dateStr}</Text>
          </View>
          <View style={s.cardMeta}>
            <Text style={s.metaIcon}>⏰</Text>
            <Text style={s.metaText}>{booking.startTime} – {booking.endTime}</Text>
          </View>
        </View>

        <View style={s.cardFooter}>
          <Text style={s.amount}>KSh {(booking.totalAmount || 0).toLocaleString()}</Text>
          {booking.ticketId && (
            <Text style={s.ticketId}>#{booking.ticketId.slice(0, 8).toUpperCase()}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#0F1923' },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:              { width: 36, height: 36, justifyContent: 'center' },
  backArrow:            { fontSize: 22, color: '#fff' },
  title:                { fontSize: 18, fontWeight: '700', color: '#fff' },
  tabRow:               { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1A2535', borderRadius: 12, padding: 4 },
  tab:                  { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive:            { backgroundColor: '#22C55E' },
  tabText:              { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  tabTextActive:        { color: '#fff' },
  center:               { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText:            { color: '#EF4444', fontSize: 15, marginBottom: 12 },
  retryBtn:             { backgroundColor: '#1A2535', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:            { color: '#22C55E', fontWeight: '600' },
  emptyIcon:            { fontSize: 48, marginBottom: 16 },
  emptyTitle:           { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle:        { color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  browseBtn:            { backgroundColor: '#22C55E', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  browseBtnText:        { color: '#fff', fontWeight: '700', fontSize: 15 },
  card:                 { backgroundColor: '#1A2535', borderRadius: 16, marginBottom: 14, overflow: 'hidden' },
  cardImageWrap:        { position: 'relative' },
  cardImage:            { width: '100%', height: 120 },
  cardImagePlaceholder: { backgroundColor: '#0F1923', justifyContent: 'center', alignItems: 'center' },
  statusBadge:          { position: 'absolute', top: 10, right: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:           { fontSize: 11, fontWeight: '700' },
  cardBody:             { padding: 14 },
  pitchName:            { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  pitchAddr:            { color: '#9CA3AF', fontSize: 12, marginBottom: 10 },
  cardRow:              { flexDirection: 'row', gap: 16, marginBottom: 10 },
  cardMeta:             { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon:             { fontSize: 13 },
  metaText:             { color: '#D1D5DB', fontSize: 12 },
  cardFooter:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount:               { color: '#22C55E', fontWeight: '800', fontSize: 16 },
  ticketId:             { color: '#6B7280', fontSize: 11 },
});