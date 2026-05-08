import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Alert, Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBookings } from '../../hooks/useData';
import { BOOKINGS, REVIEWS } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

const TABS = [
  { label: 'Upcoming', status: 'CONFIRMED,PENDING_PAYMENT' },
  { label: 'Past',     status: 'COMPLETED,CANCELLED,NO_SHOW' },
];

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED:        'Confirmed',
  PENDING_PAYMENT:  'Awaiting Payment',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
  NO_SHOW:          'No-show',
};

function getStatusColors(status: string, c: ColorPalette) {
  switch (status) {
    case 'CONFIRMED':       return { bg: c.primaryMuted, fg: c.primary };
    case 'PENDING_PAYMENT': return { bg: 'rgba(245,158,11,0.15)', fg: c.pending };
    case 'COMPLETED':       return { bg: 'rgba(107,114,128,0.18)', fg: c.textMuted };
    case 'CANCELLED':       return { bg: 'rgba(239,68,68,0.15)', fg: c.error };
    case 'NO_SHOW':         return { bg: 'rgba(239,68,68,0.15)', fg: c.error };
    default:                return { bg: c.surfaceAlt, fg: c.textMuted };
  }
}

export default function MyBookingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Review modal state
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const { data: bookings, isLoading, error, refetch } = useBookings(TABS[activeTab].status);
  const list: any[] = Array.isArray(bookings) ? bookings : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleCancel = (booking: any) => {
    Alert.alert(
      'Cancel Booking',
      `Cancel your booking at ${booking.pitchName ?? booking.pitch?.name ?? 'this pitch'}?`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(booking.id);
            try {
              await BOOKINGS.cancel(booking.id, 'User cancelled');
              await refetch();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not cancel booking. Try again.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  const openReviewModal = (booking: any) => {
    setReviewBooking(booking);
    setReviewRating(5);
    setReviewComment('');
    setReviewError('');
    setReviewModal(true);
  };

  const submitReview = async () => {
    if (reviewComment.trim().length < 10) {
      setReviewError('Please write at least 10 characters.');
      return;
    }
    if (!reviewBooking?.pitchId && !reviewBooking?.pitch?.id) {
      setReviewError('Cannot identify pitch for this booking.');
      return;
    }
    setReviewLoading(true);
    setReviewError('');
    try {
      await REVIEWS.create({
        pitchId: reviewBooking.pitchId ?? reviewBooking.pitch?.id,
        bookingId: reviewBooking.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewModal(false);
      Alert.alert('Thank you!', 'Your review has been submitted.');
      refetch();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review. Try again.');
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
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
              activeOpacity={0.85}
            >
              <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={s.errorTitle}>Couldn't load bookings</Text>
          <Text style={s.errorMsg}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch} activeOpacity={0.85}>
            <Text style={s.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : list.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons
              name={activeTab === 0 ? 'calendar-outline' : 'time-outline'}
              size={36}
              color={colors.primary}
            />
          </View>
          <Text style={s.emptyTitle}>No {TABS[activeTab].label} bookings</Text>
          <Text style={s.emptySubtitle}>
            {activeTab === 0 ? 'Find a pitch and book your next match.' : 'Your past bookings will show up here.'}
          </Text>
          {activeTab === 0 && (
            <TouchableOpacity
              style={s.browseBtn}
              onPress={() => navigation.navigate('Main', { screen: 'Home' })}
              activeOpacity={0.85}
            >
              <Text style={s.browseBtnText}>Browse pitches</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.base, paddingBottom: SPACING['3xl'] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              cancelling={cancellingId === item.id}
              colors={colors}
              styles={s}
              onPress={() => navigation.navigate('BookingConfirmation', { bookingId: item.id })}
              onCancel={['CONFIRMED', 'PENDING_PAYMENT'].includes(item.status) ? () => handleCancel(item) : undefined}
              onReview={item.status === 'COMPLETED' ? () => openReviewModal(item) : undefined}
            />
          )}
        />
      )}

      {/* Review Modal */}
      <Modal visible={reviewModal} transparent animationType="slide" onRequestClose={() => setReviewModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Leave a Review</Text>
            <Text style={s.modalSubtitle} numberOfLines={1}>
              {reviewBooking?.pitchName ?? reviewBooking?.pitch?.name ?? 'Pitch'}
            </Text>

            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)} hitSlop={4}>
                  <Ionicons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={36}
                    color={star <= reviewRating ? '#FBBF24' : colors.textMuted}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={s.reviewInput}
              placeholder="Share your experience (10+ characters)..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={t => { setReviewComment(t); setReviewError(''); }}
            />

            {reviewError ? <Text style={s.reviewError}>{reviewError}</Text> : null}

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setReviewModal(false)} disabled={reviewLoading} activeOpacity={0.85}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSubmitBtn} onPress={submitReview} disabled={reviewLoading} activeOpacity={0.85}>
                {reviewLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalSubmitText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BookingCard({
  booking,
  cancelling,
  colors,
  styles: s,
  onPress,
  onCancel,
  onReview,
}: {
  booking: any;
  cancelling: boolean;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
  onCancel?: () => void;
  onReview?: () => void;
}) {
  const status = booking.status;
  const sc = getStatusColors(status, colors);
  const label = STATUS_LABELS[status] || status;
  const image = booking.pitch?.images?.[0]?.url;
  const dateStr = booking.date
    ? new Date(booking.date).toLocaleDateString('en-KE', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : '—';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.92}>
      <View style={s.cardImageWrap}>
        {image ? (
          <Image source={{ uri: image }} style={s.cardImage} />
        ) : (
          <View style={[s.cardImage, s.cardImagePlaceholder]}>
            <Ionicons name="football-outline" size={32} color={colors.textMuted} />
          </View>
        )}
        <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[s.statusText, { color: sc.fg }]}>{label}</Text>
        </View>
      </View>

      <View style={s.cardBody}>
        <Text style={s.pitchName} numberOfLines={1}>
          {booking.pitchName || booking.pitch?.name || '—'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.sm }}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <Text style={s.pitchAddr} numberOfLines={1}>
            {booking.pitchAddress || booking.pitch?.address || '—'}
          </Text>
        </View>

        <View style={s.cardRow}>
          <View style={s.cardMeta}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
            <Text style={s.metaText}>{dateStr}</Text>
          </View>
          <View style={s.cardMeta}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <Text style={s.metaText}>{booking.startTime} – {booking.endTime}</Text>
          </View>
        </View>

        <View style={s.cardFooter}>
          <Text style={s.amount}>KSh {(booking.totalAmount || 0).toLocaleString()}</Text>
          {booking.ticketId && (
            <Text style={s.ticketId}>#{booking.ticketId.slice(0, 8).toUpperCase()}</Text>
          )}
        </View>

        {(onCancel || onReview) && (
          <View style={s.actionRow}>
            {onReview && (
              <TouchableOpacity style={s.reviewBtn} onPress={onReview} activeOpacity={0.85}>
                <Ionicons name="star-outline" size={14} color={colors.primary} />
                <Text style={s.reviewBtnText}>Leave Review</Text>
              </TouchableOpacity>
            )}
            {onCancel && (
              <TouchableOpacity style={s.cancelBtn} onPress={onCancel} disabled={cancelling} activeOpacity={0.85}>
                {cancelling ? (
                  <ActivityIndicator color={colors.error} size="small" />
                ) : (
                  <Text style={s.cancelBtnText}>Cancel</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    title: {
      fontSize: FONTS.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
    },

    tabRow: {
      flexDirection: 'row',
      marginHorizontal: SPACING.base,
      marginBottom: SPACING.sm,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: SPACING.sm + 2,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
    },
    tabActive: { backgroundColor: colors.primary },
    tabText: {
      color: colors.textMuted,
      fontWeight: FONT_WEIGHT.semiBold,
      fontSize: FONTS.sm,
    },
    tabTextActive: { color: '#fff' },

    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING['2xl'],
    },
    errorTitle: {
      color: colors.textPrimary,
      fontSize: FONTS.md,
      fontWeight: FONT_WEIGHT.bold,
      marginTop: SPACING.md,
    },
    errorMsg: {
      color: colors.textMuted,
      fontSize: FONTS.sm,
      textAlign: 'center',
      marginTop: SPACING.xs,
    },
    retryBtn: {
      marginTop: SPACING.lg,
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    retryText: {
      color: '#fff',
      fontWeight: FONT_WEIGHT.bold,
      fontSize: FONTS.sm,
    },

    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: RADIUS.full,
      backgroundColor: colors.primaryMuted,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: FONTS.lg,
      fontWeight: FONT_WEIGHT.bold,
      marginBottom: SPACING.xs,
    },
    emptySubtitle: {
      color: colors.textMuted,
      fontSize: FONTS.sm,
      textAlign: 'center',
      marginBottom: SPACING.xl,
      lineHeight: 20,
    },
    browseBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    browseBtnText: {
      color: '#fff',
      fontWeight: FONT_WEIGHT.bold,
      fontSize: FONTS.sm,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      marginBottom: SPACING.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardImageWrap: { position: 'relative' },
    cardImage: { width: '100%', height: 130 },
    cardImagePlaceholder: {
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statusBadge: {
      position: 'absolute',
      top: SPACING.md,
      right: SPACING.md,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
    },
    statusText: {
      fontSize: FONTS.xs,
      fontWeight: FONT_WEIGHT.bold,
    },

    cardBody: { padding: SPACING.base },
    pitchName: {
      color: colors.textPrimary,
      fontSize: FONTS.md,
      fontWeight: FONT_WEIGHT.bold,
      marginBottom: 2,
    },
    pitchAddr: {
      color: colors.textMuted,
      fontSize: FONTS.xs,
      flex: 1,
    },
    cardRow: {
      flexDirection: 'row',
      gap: SPACING.base,
      marginBottom: SPACING.sm,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      color: colors.textSecondary,
      fontSize: FONTS.xs,
      fontWeight: FONT_WEIGHT.medium,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    amount: {
      color: colors.primary,
      fontWeight: FONT_WEIGHT.extraBold,
      fontSize: FONTS.md,
    },
    ticketId: {
      color: colors.textMuted,
      fontSize: FONTS.xs,
      fontFamily: 'System',
    },

    actionRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
    },
    cancelBtn: {
      flex: 1,
      height: 38,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelBtnText: {
      color: colors.error,
      fontWeight: FONT_WEIGHT.semiBold,
      fontSize: FONTS.sm,
    },
    reviewBtn: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      height: 38,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewBtnText: {
      color: colors.primary,
      fontWeight: FONT_WEIGHT.semiBold,
      fontSize: FONTS.sm,
    },

    // Review modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: SPACING.xl,
      paddingBottom: SPACING['3xl'],
    },
    modalHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: SPACING.lg,
    },
    modalTitle: {
      fontSize: FONTS.xl,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: FONTS.sm,
      color: colors.textMuted,
      marginBottom: SPACING.lg,
    },
    starsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
    reviewInput: {
      backgroundColor: colors.background,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
      fontSize: FONTS.sm,
      padding: SPACING.md,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: SPACING.sm,
    },
    reviewError: { color: colors.error, fontSize: FONTS.sm, marginBottom: SPACING.sm },
    modalBtns: { flexDirection: 'row', gap: SPACING.sm },
    modalCancelBtn: {
      flex: 1,
      height: 48,
      borderRadius: RADIUS.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalCancelText: { color: colors.textSecondary, fontWeight: FONT_WEIGHT.semiBold },
    modalSubmitBtn: {
      flex: 2,
      height: 48,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalSubmitText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },
  });
}
