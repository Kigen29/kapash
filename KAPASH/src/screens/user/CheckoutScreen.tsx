import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { BOOKINGS, PAYMENTS } from '../../services/api';

type PaymentStatus = 'idle' | 'creating_booking' | 'initiating_mpesa' | 'awaiting_pin' | 'polling' | 'success' | 'failed';

export default function CheckoutScreen({ route, navigation }: any) {
  const { pitchId, pitchName, pitchAddress, date, startTime, endTime, price, pitchImage } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [phone, setPhone] = useState(user?.phone?.replace('+254', '0') || '');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const serviceFee = Math.round((price || 0) * 0.05);
  const total = (price || 0) + serviceFee;

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const pollPaymentStatus = (bookingId: string) => {
    pollCountRef.current = 0;
    setStatus('polling');
    setStatusMsg('Confirming payment…');
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
        } else if (data.paymentStatus === 'FAILED' || data.bookingStatus === 'CANCELLED') {
          clearInterval(pollRef.current!);
          setStatus('failed');
          setStatusMsg('Payment was cancelled or failed.');
        }
      } catch {}
    }, 3000);
  };

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
      setStatus('creating_booking');
      setStatusMsg('Creating booking…');
      const { data: bookingData } = await BOOKINGS.create({
        pitchId, date, startTime, endTime, paymentMethod: 'MPESA',
      });
      const bookingId = bookingData.bookingId;
      if (!bookingId) throw new Error('Booking creation failed.');

      setStatus('initiating_mpesa');
      setStatusMsg('Sending M-Pesa request…');
      await PAYMENTS.initiateMpesa({ bookingId, phone: formattedPhone, amount: total });

      setStatus('awaiting_pin');
      setStatusMsg('Check your phone for the M-Pesa PIN prompt');
      setTimeout(() => pollPaymentStatus(bookingId), 5000);
    } catch (err: any) {
      setStatus('failed');
      setStatusMsg(err.message || 'Payment initiation failed.');
    }
  };

  const isBusy = ['creating_booking', 'initiating_mpesa', 'polling'].includes(status);
  const dateStr = date ? new Date(date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }) : date;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={s.container}>
        <SafeAreaView edges={['top']} style={s.headerSafe}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} disabled={isBusy} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Checkout</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Booking Summary */}
          <View style={s.summaryCard}>
            {pitchImage && <Image source={{ uri: pitchImage }} style={s.pitchImg} />}
            <View style={s.summaryInfo}>
              <Text style={s.pitchName} numberOfLines={1}>{pitchName}</Text>
              {pitchAddress && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text style={s.pitchLoc} numberOfLines={1}>{pitchAddress}</Text>
                </View>
              )}
              <View style={s.summaryDivider} />
              <SummaryRow label="Date"  value={dateStr} icon="calendar-outline" colors={colors} styles={s} />
              <SummaryRow label="Time"  value={`${startTime} – ${endTime}`} icon="time-outline" colors={colors} styles={s} />
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={s.card}>
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

          {/* Payment method */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Payment method</Text>
            <View style={s.methodRow}>
              <View style={s.methodIcon}>
                <Text style={s.methodIconText}>M</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.methodTitle}>M-Pesa Express</Text>
                <Text style={s.methodSubtitle}>Pay instantly via STK push</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </View>

            <Text style={s.fieldLabel}>Safaricom phone number</Text>
            <View style={s.phoneRow}>
              <View style={s.prefix}>
                <Text style={s.prefixTxt}>🇰🇪 +254</Text>
              </View>
              <TextInput
                style={s.phoneInput}
                placeholder="712 345 678"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                editable={!isBusy}
              />
            </View>
            <Text style={s.helpText}>
              You'll receive an STK push notification on this number. Enter your M-Pesa PIN to complete payment.
            </Text>

            {/* Status display */}
            {status !== 'idle' && (
              <View style={[
                s.statusBox,
                status === 'failed' && s.statusBoxError,
                status === 'awaiting_pin' && s.statusBoxWaiting,
                status === 'success' && s.statusBoxSuccess,
              ]}>
                {isBusy && <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: 10 }} />}
                {status === 'awaiting_pin' && <Ionicons name="phone-portrait-outline" size={18} color="#F59E0B" style={{ marginRight: 8 }} />}
                {status === 'failed' && <Ionicons name="alert-circle-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />}
                {status === 'success' && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />}
                <Text style={[
                  s.statusTxt,
                  status === 'failed' && { color: colors.error },
                  status === 'awaiting_pin' && { color: '#F59E0B' },
                  status === 'success' && { color: colors.primary },
                ]}>
                  {statusMsg}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Pay Button */}
        <SafeAreaView edges={['bottom']} style={s.footer}>
          {status === 'failed' ? (
            <TouchableOpacity onPress={() => setStatus('idle')} style={s.retryBtn} activeOpacity={0.85}>
              <Text style={s.retryTxt}>Try Again</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handlePay} disabled={isBusy} activeOpacity={0.9}>
              <LinearGradient
                colors={isBusy ? [colors.textMuted, colors.textMuted] : [colors.primary, colors.primaryDark]}
                style={s.payBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {isBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={s.payBtnTxt}>Pay KSh {total.toLocaleString()}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({
  label, value, icon, colors, styles,
}: { label: string; value: string; icon: any; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.summaryRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={14} color={colors.textMuted} />
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryVal}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSafe: { backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },

    summaryCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      margin: SPACING.base,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    pitchImg: { width: '100%', height: 140 },
    summaryInfo: { padding: SPACING.base },
    pitchName: { fontSize: FONTS.md, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    pitchLoc: { fontSize: FONTS.xs, color: colors.textMuted, flex: 1 },
    summaryDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: SPACING.md,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    summaryLabel: { color: colors.textMuted, fontSize: FONTS.sm },
    summaryVal: { color: colors.textPrimary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },

    card: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      marginHorizontal: SPACING.base,
      marginBottom: SPACING.base,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: FONTS.md,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      marginBottom: SPACING.md,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    priceLabel: { color: colors.textMuted, fontSize: FONTS.sm },
    priceVal: { color: colors.textPrimary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },
    totalRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: SPACING.md,
      marginTop: SPACING.xs,
    },
    totalLabel: { color: colors.textPrimary, fontSize: FONTS.md, fontWeight: FONT_WEIGHT.bold },
    totalVal: { color: colors.primary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.extraBold },

    methodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.md,
      backgroundColor: colors.primaryMuted,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.primary,
      marginBottom: SPACING.lg,
    },
    methodIcon: {
      width: 40, height: 40, borderRadius: RADIUS.sm,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    methodIconText: { color: '#fff', fontWeight: FONT_WEIGHT.extraBold, fontSize: FONTS.md },
    methodTitle: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    methodSubtitle: { fontSize: FONTS.xs, color: colors.textMuted, marginTop: 2 },

    fieldLabel: {
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.semiBold,
      color: colors.textSecondary,
      marginBottom: SPACING.sm,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: SPACING.md,
    },
    prefix: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
    },
    prefixTxt: { color: colors.textSecondary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },
    phoneInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: FONTS.base,
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
    },
    helpText: { color: colors.textMuted, fontSize: FONTS.xs, lineHeight: 18 },

    statusBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginTop: SPACING.base,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    statusBoxError: {
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderColor: colors.error,
    },
    statusBoxWaiting: {
      backgroundColor: 'rgba(245,158,11,0.1)',
      borderColor: '#F59E0B',
    },
    statusBoxSuccess: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    statusTxt: { color: colors.primary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, flex: 1 },

    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: colors.surface,
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    payBtn: {
      flexDirection: 'row',
      gap: SPACING.sm,
      height: 52,
      borderRadius: RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    payBtnTxt: { color: '#fff', fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold },
    retryBtn: {
      height: 52,
      borderRadius: RADIUS.md,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    retryTxt: { color: colors.textPrimary, fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },
  });
}
