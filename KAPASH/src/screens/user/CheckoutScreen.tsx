/**
 * CheckoutScreen - Real M-Pesa STK Push flow
 * Place at: src/screens/user/CheckoutScreen.tsx
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { BOOKINGS, PAYMENTS } from '../../services/api';

type PaymentStatus = 'idle' | 'creating_booking' | 'initiating_mpesa' | 'awaiting_pin' | 'polling' | 'success' | 'failed';

export default function CheckoutScreen({ route, navigation }: any) {
  const { pitchId, pitchName, pitchLocation, slotId, date, startTime, endTime, price, pitchImage } = route.params;
  const { user } = useAuth();

  const [phone, setPhone] = useState(user?.phone?.replace('+254', '0') || '');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const serviceFee = Math.round(price * 0.05);
  const total = price + serviceFee;

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

// Replace the entire pollPaymentStatus function
const pollPaymentStatus = (bookingId: string) => {
  pollCountRef.current = 0;
  setStatus('polling');
  setStatusMsg('Confirming payment...');

  pollRef.current = setInterval(async () => {
    pollCountRef.current += 1;
    if (pollCountRef.current > 20) {
      clearInterval(pollRef.current!);
      setStatus('failed');
      setStatusMsg('Payment timed out. Please try again.');
      return;
    }
    try {
      const { data } = await PAYMENTS.checkStatus(bookingId);
      if (data.bookingStatus === 'CONFIRMED') {
        clearInterval(pollRef.current!);
        setStatus('success');
        navigation.replace('BookingConfirmation', { bookingId });
      } else if (
        data.paymentStatus === 'FAILED' ||
        data.bookingStatus === 'CANCELLED'
      ) {
        clearInterval(pollRef.current!);
        setStatus('failed');
        setStatusMsg('Payment was cancelled or failed. Please try again.');
      }
    } catch {}
  }, 3000);
};

// Replace the handlePay function
const handlePay = async () => {
  const phoneClean = phone.replace(/\s/g, '');
  if (!phoneClean || phoneClean.length < 9) {
    Alert.alert('Invalid phone', 'Enter a valid Safaricom number.');
    return;
  }

  const formattedPhone = phoneClean.startsWith('0')
    ? '+254' + phoneClean.slice(1)
    : phoneClean.startsWith('254')
    ? '+' + phoneClean
    : phoneClean;

  try {
    // Step 1: Create booking
    setStatus('creating_booking');
    setStatusMsg('Creating booking...');
    const { data: bookingData } = await BOOKINGS.create({
      pitchId,
      date,
      startTime,        // ← from route.params
      endTime,          // ← from route.params
      paymentMethod: 'MPESA',
    });
    const bookingId = bookingData.bookingId;  // ← fixed shape

    if (!bookingId) throw new Error('Booking creation failed. Please try again.');

    // Step 2: Initiate M-Pesa STK push
    setStatus('initiating_mpesa');
    setStatusMsg('Sending M-Pesa request...');
    await PAYMENTS.initiateMpesa({
      bookingId,
      phone: formattedPhone,
      amount: total,
    });

    setStatus('awaiting_pin');
    setStatusMsg('Check your phone for the M-Pesa PIN prompt');

    // Step 3: Poll for confirmation
    setTimeout(() => pollPaymentStatus(bookingId), 5000);

  } catch (err: any) {
    setStatus('failed');
    setStatusMsg(err.message || 'Payment initiation failed. Try again.');
  }
};

  const isBusy = ['creating_booking', 'initiating_mpesa', 'polling'].includes(status);

  return (
    <View style={s.container}>
      <SafeAreaView>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={isBusy}>
            <Text style={s.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Booking Summary */}
        <View style={s.summaryCard}>
          {pitchImage && <Image source={{ uri: pitchImage }} style={s.pitchImg} />}
          <View style={s.summaryInfo}>
            <Text style={s.pitchName}>{pitchName}</Text>
            <Text style={s.pitchLoc}>📍 {pitchLocation}</Text>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Date</Text>
              <Text style={s.summaryVal}>{date}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Time</Text>
              <Text style={s.summaryVal}>{startTime} – {endTime}</Text>
            </View>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={s.priceCard}>
          <Text style={s.cardTitle}>Price Breakdown</Text>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Pitch fee</Text>
            <Text style={s.priceVal}>KSh {price?.toLocaleString()}</Text>
          </View>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Service fee (5%)</Text>
            <Text style={s.priceVal}>KSh {serviceFee.toLocaleString()}</Text>
          </View>
          <View style={[s.priceRow, s.totalRow]}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalVal}>KSh {total.toLocaleString()}</Text>
          </View>
        </View>

        {/* M-Pesa section */}
        <View style={s.mpesaCard}>
          <View style={s.mpesaHeader}>
            <Text style={s.mpesaLogo}>M-PESA</Text>
            <Text style={s.mpesaSubtitle}>Express Checkout</Text>
          </View>

          <Text style={s.fieldLabel}>Safaricom Phone Number</Text>
          <View style={s.phoneRow}>
            <View style={s.prefix}><Text style={s.prefixTxt}>🇰🇪 +254</Text></View>
            <TextInput
              style={s.phoneInput}
              placeholder="712 345 678"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!isBusy}
            />
          </View>

          <Text style={s.mpesaNote}>
            You'll receive an STK push notification on this number. Enter your M-Pesa PIN to complete payment.
          </Text>

          {/* Status display */}
          {status !== 'idle' && (
            <View style={[s.statusBox, status === 'failed' && s.statusBoxError, status === 'awaiting_pin' && s.statusBoxWaiting]}>
              {isBusy && <ActivityIndicator color="#22C55E" size="small" style={{ marginRight: 10 }} />}
              <Text style={[s.statusTxt, status === 'failed' && { color: '#EF4444' }, status === 'awaiting_pin' && { color: '#F59E0B' }]}>
                {status === 'awaiting_pin' ? '📲 ' : ''}{statusMsg}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Pay Button */}
      <View style={s.footer}>
        {status === 'failed' ? (
          <TouchableOpacity onPress={() => setStatus('idle')} style={s.retryBtn}>
            <Text style={s.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handlePay} disabled={isBusy} activeOpacity={0.85} style={{ flex: 1 }}>
            <LinearGradient
              colors={isBusy ? ['#374151', '#374151'] : ['#22C55E', '#16A34A']}
              style={s.payBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.payBtnTxt}>Pay KSh {total.toLocaleString()} via M-Pesa</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1923' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backTxt: { color: '#fff', fontSize: 22 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  summaryCard: { backgroundColor: '#1A2535', borderRadius: 16, margin: 16, overflow: 'hidden' },
  pitchImg: { width: '100%', height: 140 },
  summaryInfo: { padding: 14 },
  pitchName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  pitchLoc: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { color: '#6B7280', fontSize: 13 },
  summaryVal: { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },

  priceCard: { backgroundColor: '#1A2535', borderRadius: 16, marginHorizontal: 16, marginBottom: 16, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  priceLabel: { color: '#9CA3AF', fontSize: 14 },
  priceVal: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 12, marginTop: 4 },
  totalLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  totalVal: { color: '#22C55E', fontSize: 18, fontWeight: '800' },

  mpesaCard: { backgroundColor: '#1A2535', borderRadius: 16, marginHorizontal: 16, padding: 16, marginBottom: 16 },
  mpesaHeader: { marginBottom: 16 },
  mpesaLogo: { fontSize: 18, fontWeight: '900', color: '#22C55E', letterSpacing: 1 },
  mpesaSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#D1D5DB', marginBottom: 8 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1923',
    borderRadius: 12, borderWidth: 1, borderColor: '#374151', overflow: 'hidden', marginBottom: 14,
  },
  prefix: { paddingHorizontal: 12, paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#374151' },
  prefixTxt: { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },
  phoneInput: { flex: 1, color: '#fff', fontSize: 15, paddingHorizontal: 14, paddingVertical: 14 },
  mpesaNote: { color: '#6B7280', fontSize: 12, lineHeight: 18 },

  statusBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  statusBoxError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
  statusBoxWaiting: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' },
  statusTxt: { color: '#22C55E', fontSize: 13, fontWeight: '600', flex: 1 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1A2535', paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#374151',
    flexDirection: 'row', gap: 10,
  },
  payBtn: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  payBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  retryBtn: {
    flex: 1, height: 52, borderRadius: 14, backgroundColor: '#374151',
    justifyContent: 'center', alignItems: 'center',
  },
  retryTxt: { color: '#fff', fontWeight: '600' },
});