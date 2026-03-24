/**
 * BookingConfirmationScreen - Fixed field names
 * Place at: src/screens/user/BookingConfirmationScreen.tsx
 */

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBooking } from '../../hooks/useData';

export default function BookingConfirmationScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const { data: booking, isLoading, error } = useBooking(bookingId);

  if (isLoading) {
    return (
      <View style={s.container}>
        <ActivityIndicator color="#22C55E" size="large" style={{ flex: 1, marginTop: 80 }} />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#9CA3AF', fontSize: 16, marginBottom: 16 }}>Could not load booking</Text>
        <TouchableOpacity style={s.primaryBtnGrad} onPress={() => navigation.navigate('Main')}>
          <Text style={s.primaryBtnTxt}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const b: any = booking;

  // ✅ FIXED: backend stores times directly on booking, not nested in timeSlot
  const startTime  = b.startTime  || '—';
  const endTime    = b.endTime    || '—';
  // ✅ FIXED: address stored as pitchAddress on booking
  const pitchAddr  = b.pitchAddress || b.pitch?.address || '—';
  const pitchName  = b.pitchName    || b.pitch?.name    || '—';
  // ✅ FIXED: ticketId is the human-readable ref, id is the UUID
  const ticketRef  = b.ticketId
    ? b.ticketId.slice(0, 8).toUpperCase()
    : b.id?.slice(0, 8).toUpperCase() || '—';

  const dateStr = b.date
    ? new Date(b.date).toLocaleDateString('en-KE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Success */}
          <View style={s.successWrap}>
            <LinearGradient colors={['#22C55E', '#16A34A']} style={s.successBadge}>
              <Text style={s.successTick}>✓</Text>
            </LinearGradient>
            <Text style={s.successTitle}>Booking Confirmed!</Text>
            <Text style={s.successSub}>Your pitch is booked. Have a great game! ⚽</Text>
          </View>

          {/* Ticket */}
          <View style={s.ticket}>
            <LinearGradient colors={['#1A2535', '#1E2D40']} style={s.ticketTop}>
              <Text style={s.ticketPitch}>{pitchName}</Text>
              <Text style={s.ticketLoc}>📍 {pitchAddr}</Text>
              <View style={s.ticketDivider} />
              <View style={s.ticketDetails}>
                <TicketRow label="Date"        value={dateStr} />
                <TicketRow label="Time"        value={`${startTime} – ${endTime}`} />
                <TicketRow label="Booking Ref" value={`#${ticketRef}`} />
                <TicketRow label="Payment"     value={b.payment?.method === 'MPESA' ? 'M-Pesa ✓' : (b.payment?.method || 'M-Pesa')} />
                <TicketRow
                  label="Total Paid"
                  value={`KSh ${(b.totalAmount || 0).toLocaleString()}`}
                  highlight
                />
              </View>
            </LinearGradient>

            {/* Perforated edge */}
            <View style={s.perfRow}>
              {[...Array(12)].map((_, i) => <View key={i} style={s.perf} />)}
            </View>

            <View style={s.ticketBottom}>
              <Text style={s.qrLabel}>Show this at the pitch</Text>
              <View style={s.qrPlaceholder}>
                <Text style={s.qrEmoji}>📱</Text>
                <Text style={s.qrCode}>{ticketRef}</Text>
              </View>
              <Text style={s.validTxt}>Valid for entry</Text>
            </View>
          </View>

          {/* What's next */}
          <View style={s.nextCard}>
            <Text style={s.nextTitle}>What's next?</Text>
            <Text style={s.nextItem}>📲 Check your SMS for confirmation</Text>
            <Text style={s.nextItem}>⏰ Arrive 5 minutes before your slot</Text>
            <Text style={s.nextItem}>📱 Show this screen at the entrance</Text>
            <Text style={s.nextItem}>⚽ Bring your boots and enjoy the game!</Text>
          </View>

          {/* Actions */}
          <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate('MyBookings')}>
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={s.primaryBtnGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.primaryBtnTxt}>View My Bookings</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.navigate('Main')}>
            <Text style={s.secondaryBtnTxt}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TicketRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={s.ticketRow}>
      <Text style={s.ticketLabel}>{label}</Text>
      <Text style={[s.ticketVal, highlight && { color: '#22C55E', fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0F1923' },
  scroll:         { padding: 16, paddingTop: 24 },
  successWrap:    { alignItems: 'center', marginBottom: 28 },
  successBadge:   { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successTick:    { fontSize: 36, color: '#fff', fontWeight: '800' },
  successTitle:   { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  successSub:     { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  ticket:         { borderRadius: 20, overflow: 'hidden', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  ticketTop:      { padding: 20 },
  ticketPitch:    { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  ticketLoc:      { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  ticketDivider:  { height: 1, backgroundColor: '#374151', marginBottom: 16 },
  ticketDetails:  { gap: 10 },
  ticketRow:      { flexDirection: 'row', justifyContent: 'space-between' },
  ticketLabel:    { color: '#6B7280', fontSize: 13 },
  ticketVal:      { color: '#D1D5DB', fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },
  perfRow:        { flexDirection: 'row', backgroundColor: '#0F1923' },
  perf:           { flex: 1, height: 16, backgroundColor: '#1A2535', borderRadius: 8, marginHorizontal: 2 },
  ticketBottom:   { backgroundColor: '#1A2535', padding: 20, alignItems: 'center' },
  qrLabel:        { color: '#9CA3AF', fontSize: 12, marginBottom: 12 },
  qrPlaceholder:  { width: 100, height: 100, backgroundColor: '#0F1923', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  qrEmoji:        { fontSize: 40 },
  qrCode:         { color: '#22C55E', fontWeight: '800', fontSize: 13, marginTop: 4, letterSpacing: 2 },
  validTxt:       { color: '#22C55E', fontSize: 11, fontWeight: '600' },
  nextCard:       { backgroundColor: '#1A2535', borderRadius: 16, padding: 16, marginBottom: 20, gap: 10 },
  nextTitle:      { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  nextItem:       { color: '#9CA3AF', fontSize: 13, lineHeight: 20 },
  primaryBtn:     { marginBottom: 12 },
  primaryBtnGrad: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  primaryBtnTxt:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn:   { height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A2535', marginBottom: 20 },
  secondaryBtnTxt:{ color: '#9CA3AF', fontWeight: '600', fontSize: 14 },
});