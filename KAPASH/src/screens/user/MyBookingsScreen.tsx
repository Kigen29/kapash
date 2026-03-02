/**
 * MyBookingsScreen - Real data from backend
 * Place at: src/screens/user/MyBookingsScreen.tsx
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBookings } from '../../hooks/useData';
import { BOOKINGS } from '../../services/api';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B',
  CONFIRMED: '#22C55E',
  COMPLETED: '#6B7280',
  CANCELLED: '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '⏳ Pending',
  CONFIRMED: '✅ Confirmed',
  COMPLETED: '✓ Completed',
  CANCELLED: '✕ Cancelled',
};

export default function MyBookingsScreen({ navigation }: any) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const statusFilter = tab === 'upcoming' ? 'CONFIRMED,PENDING' : 'COMPLETED,CANCELLED';
  const { data, isLoading, error, refetch } = useBookings(statusFilter);
  const bookings: any[] = data || [];

  const cancelBooking = async (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive',
        onPress: async () => {
          try {
            await BOOKINGS.cancel(id, 'User requested cancellation');
            refetch();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not cancel booking.');
          }
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <SafeAreaView>
        <Text style={s.title}>My Bookings</Text>

        {/* Tabs */}
        <View style={s.tabs}>
          {(['upcoming', 'past'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color="#22C55E" style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={s.center}>
          <Text style={s.emptyTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={i => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={bookings.length === 0 ? s.emptyList : { padding: 16 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#22C55E" />}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📅</Text>
              <Text style={s.emptyTxt}>
                {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
              </Text>
              {tab === 'upcoming' && (
                <TouchableOpacity style={s.bookBtn} onPress={() => navigation.navigate('Home')}>
                  <Text style={s.bookBtnTxt}>Browse Pitches</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
              onCancel={['PENDING', 'CONFIRMED'].includes(item.status) ? () => cancelBooking(item.id) : undefined}
            />
          )}
        />
      )}
    </View>
  );
}

function BookingCard({ booking, onPress, onCancel }: { booking: any; onPress: () => void; onCancel?: () => void }) {
  const img = booking.pitch?.images?.[0]?.url;
  const color = STATUS_COLOR[booking.status] || '#6B7280';
  const label = STATUS_LABEL[booking.status] || booking.status;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardTop}>
        {img ? (
          <Image source={{ uri: img }} style={s.cardImg} />
        ) : (
          <View style={[s.cardImg, s.cardImgPlaceholder]}>
            <Text style={{ fontSize: 28 }}>🏟️</Text>
          </View>
        )}
        <View style={s.cardInfo}>
          <Text style={s.cardName} numberOfLines={1}>{booking.pitch?.name}</Text>
          <Text style={s.cardLoc} numberOfLines={1}>📍 {booking.pitch?.location}</Text>
          <Text style={s.cardDate}>📅 {booking.date} · {booking.timeSlot?.startTime} – {booking.timeSlot?.endTime}</Text>
          <View style={[s.statusBadge, { borderColor: color, backgroundColor: `${color}18` }]}>
            <Text style={[s.statusTxt, { color }]}>{label}</Text>
          </View>
        </View>
      </View>

      <View style={s.cardBottom}>
        <Text style={s.amount}>KSh {booking.totalAmount?.toLocaleString()}</Text>
        <View style={s.cardActions}>
          {booking.status === 'CONFIRMED' && (
            <TouchableOpacity
              style={s.qrBtn}
              onPress={onPress}
            >
              <Text style={s.qrBtnTxt}>View Ticket</Text>
            </TouchableOpacity>
          )}
          {onCancel && (
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1923' },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 4 },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#22C55E' },
  tabTxt: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
  tabTxtActive: { color: '#22C55E' },

  card: {
    backgroundColor: '#1A2535', borderRadius: 16, marginBottom: 12, overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', padding: 12 },
  cardImg: { width: 80, height: 80, borderRadius: 10 },
  cardImgPlaceholder: { backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardLoc: { fontSize: 12, color: '#9CA3AF', marginBottom: 3 },
  cardDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt: { fontSize: 11, fontWeight: '700' },

  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#374151',
  },
  amount: { color: '#22C55E', fontWeight: '700', fontSize: 15 },
  cardActions: { flexDirection: 'row', gap: 8 },
  qrBtn: { backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  qrBtnTxt: { color: '#22C55E', fontWeight: '600', fontSize: 12 },
  cancelBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  cancelBtnTxt: { color: '#EF4444', fontWeight: '600', fontSize: 12 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyList: { flexGrow: 1 },
  emptyTxt: { color: '#9CA3AF', fontSize: 15, textAlign: 'center' },
  bookBtn: { marginTop: 16, backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  bookBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  retryBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#374151', borderRadius: 8 },
  retryTxt: { color: '#fff', fontWeight: '600' },
});