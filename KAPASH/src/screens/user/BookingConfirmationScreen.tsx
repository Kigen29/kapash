import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useBooking } from '../../hooks/useData';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function BookingConfirmationScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { data: booking, isLoading, error } = useBooking(bookingId);

  if (isLoading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={s.errorMsg}>{error || 'Could not load booking'}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate('Main')} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const b: any = booking;
  const startTime  = b.startTime  || '—';
  const endTime    = b.endTime    || '—';
  const pitchAddr  = b.pitchAddress || b.pitch?.address || '—';
  const pitchName  = b.pitchName    || b.pitch?.name    || '—';
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
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Success */}
          <View style={s.successWrap}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.successBadge}>
              <Ionicons name="checkmark" size={42} color="#fff" />
            </LinearGradient>
            <Text style={s.successTitle}>Booking Confirmed!</Text>
            <Text style={s.successSub}>Your pitch is booked. Have a great game.</Text>
          </View>

          {/* Ticket */}
          <View style={s.ticket}>
            <View style={s.ticketTop}>
              <Text style={s.ticketPitch} numberOfLines={1}>{pitchName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                <Text style={s.ticketLoc} numberOfLines={1}>{pitchAddr}</Text>
              </View>
              <View style={s.ticketDivider} />
              <View style={{ gap: SPACING.sm }}>
                <TicketRow label="Date"        value={dateStr}                colors={colors} styles={s} />
                <TicketRow label="Time"        value={`${startTime} – ${endTime}`} colors={colors} styles={s} />
                <TicketRow label="Booking Ref" value={`#${ticketRef}`}        colors={colors} styles={s} />
                <TicketRow label="Payment"     value={b.payment?.method === 'MPESA' ? 'M-Pesa' : (b.payment?.method || 'M-Pesa')} colors={colors} styles={s} />
                <TicketRow
                  label="Total Paid"
                  value={`KSh ${(b.totalAmount || 0).toLocaleString()}`}
                  highlight
                  colors={colors}
                  styles={s}
                />
              </View>
            </View>

            {/* Perforated edge */}
            <View style={s.perfRow}>
              {[...Array(14)].map((_, i) => <View key={i} style={s.perf} />)}
            </View>

            <View style={s.ticketBottom}>
              <Text style={s.qrLabel}>Show this at the pitch</Text>
              <View style={s.qrWrapper}>
                <QRCode
                  value={b.ticketId || b.id || ticketRef}
                  size={140}
                  color="#0F1923"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text style={s.qrRefText}>{ticketRef}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                <Text style={s.validTxt}>Valid for entry</Text>
              </View>
            </View>
          </View>

          {/* What's next */}
          <View style={s.nextCard}>
            <Text style={s.nextTitle}>What's next?</Text>
            <NextItem icon="chatbox-outline" text="Check your SMS for confirmation" colors={colors} styles={s} />
            <NextItem icon="time-outline"     text="Arrive 5 minutes before your slot" colors={colors} styles={s} />
            <NextItem icon="qr-code-outline"  text="Show this screen at the entrance" colors={colors} styles={s} />
            <NextItem icon="football-outline" text="Bring your boots and enjoy the game" colors={colors} styles={s} />
          </View>

          {/* Actions */}
          <TouchableOpacity onPress={() => navigation.navigate('MyBookings')} activeOpacity={0.9}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={s.primaryGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={s.primaryGradientText}>View My Bookings</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.navigate('Main')} activeOpacity={0.85}>
            <Text style={s.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TicketRow({
  label, value, highlight, colors, styles,
}: { label: string; value: string; highlight?: boolean; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.ticketRow}>
      <Text style={styles.ticketLabel}>{label}</Text>
      <Text style={[styles.ticketVal, highlight && { color: colors.primary, fontWeight: FONT_WEIGHT.bold }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function NextItem({
  icon, text, colors, styles,
}: { icon: IoniconName; text: string; colors: ColorPalette; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
      <View style={styles.nextIcon}>
        <Ionicons name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={styles.nextItemText}>{text}</Text>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: SPACING.base, paddingTop: SPACING.lg, paddingBottom: SPACING['3xl'] },
    errorMsg: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },

    successWrap: { alignItems: 'center', marginBottom: SPACING.xl },
    successBadge: {
      width: 80, height: 80, borderRadius: 40,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: SPACING.md,
    },
    successTitle: {
      fontSize: FONTS['3xl'],
      fontWeight: FONT_WEIGHT.extraBold,
      color: colors.textPrimary,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    successSub: { fontSize: FONTS.sm, color: colors.textMuted, textAlign: 'center' },

    ticket: {
      borderRadius: RADIUS.xl,
      overflow: 'hidden',
      marginBottom: SPACING.base,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ticketTop: { padding: SPACING.lg },
    ticketPitch: {
      fontSize: FONTS.xl,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
    },
    ticketLoc: { fontSize: FONTS.xs, color: colors.textMuted, flex: 1 },
    ticketDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: SPACING.md,
    },
    ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ticketLabel: { color: colors.textMuted, fontSize: FONTS.sm },
    ticketVal: {
      color: colors.textPrimary,
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.semiBold,
      textAlign: 'right',
      flex: 1,
      marginLeft: SPACING.base,
    },

    perfRow: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      paddingHorizontal: 4,
    },
    perf: {
      flex: 1,
      height: 12,
      backgroundColor: colors.surface,
      borderRadius: 6,
      marginHorizontal: 2,
    },

    ticketBottom: {
      backgroundColor: colors.surface,
      padding: SPACING.lg,
      alignItems: 'center',
    },
    qrLabel: { color: colors.textMuted, fontSize: FONTS.xs, marginBottom: SPACING.md },
    qrWrapper: {
      backgroundColor: '#FFFFFF',
      padding: SPACING.sm,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.sm,
    },
    qrRefText: {
      color: colors.primary,
      fontWeight: FONT_WEIGHT.extraBold,
      fontSize: FONTS.sm,
      letterSpacing: 2,
    },
    validTxt: { color: colors.primary, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold },

    nextCard: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.base,
      marginBottom: SPACING.lg,
      gap: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    nextTitle: {
      fontSize: FONTS.md,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      marginBottom: SPACING.xs,
    },
    nextIcon: {
      width: 28, height: 28, borderRadius: RADIUS.sm,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
    },
    nextItemText: { color: colors.textSecondary, fontSize: FONTS.sm, lineHeight: 20, flex: 1 },

    primaryBtn: {
      marginTop: SPACING.lg,
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    primaryBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },
    primaryGradient: {
      flexDirection: 'row',
      gap: SPACING.sm,
      height: 52,
      borderRadius: RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    primaryGradientText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },
    secondaryBtn: {
      height: 48,
      borderRadius: RADIUS.md,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryBtnText: { color: colors.textSecondary, fontWeight: FONT_WEIGHT.semiBold, fontSize: FONTS.sm },
  });
}
