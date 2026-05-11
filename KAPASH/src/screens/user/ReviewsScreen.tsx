import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFetch } from '../../hooks/useData';
import { USER } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

function StarRow({
  rating, size = 16, onPress, mutedColor,
}: { rating: number; size?: number; onPress?: (r: number) => void; mutedColor: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <TouchableOpacity key={i} onPress={() => onPress?.(i)} disabled={!onPress} activeOpacity={0.7} hitSlop={4}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={size}
            color={i <= rating ? '#FBBF24' : mutedColor}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReview, setSelected] = useState<any>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, error, refetch } = useFetch(
    () => USER.getReviews(),
    [],
    { transform: (d) => d.reviews || d || [] },
  );
  const reviews: any[] = Array.isArray(data) ? data : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  function openEdit(review: any) {
    setSelected(review);
    setEditRating(review.rating || 5);
    setEditComment(review.comment || '');
    setModalVisible(true);
  }

  async function handleSubmitEdit() {
    if (!selectedReview) return;
    if (editComment.trim().length < 10) {
      Alert.alert('Too short', 'Please write at least 10 characters');
      return;
    }
    setSubmitting(true);
    try {
      await USER.updateReview(selectedReview.id, { rating: editRating, comment: editComment.trim() });
      setModalVisible(false);
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update review');
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>My Reviews</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={s.errorText}>Failed to load reviews</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={refetch} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : reviews.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons name="star-outline" size={36} color={colors.primary} />
          </View>
          <Text style={s.emptyTitle}>No Reviews Yet</Text>
          <Text style={s.emptySubtitle}>After completing a booking you can rate the pitch.</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: SPACING.base, paddingBottom: SPACING['3xl'] }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.pitchName} numberOfLines={1}>{item.pitch?.name || 'Pitch'}</Text>
                  {item.pitch?.address ? (
                    <Text style={s.pitchAddr} numberOfLines={1}>{item.pitch.address}</Text>
                  ) : null}
                </View>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)} activeOpacity={0.85}>
                  <Ionicons name="pencil-outline" size={12} color={colors.primary} />
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={s.ratingRow}>
                <StarRow rating={item.rating} size={18} mutedColor={colors.textMuted} />
                <Text style={s.dateText}>{formatDate(item.createdAt)}</Text>
              </View>

              {item.comment
                ? <Text style={s.comment}>{item.comment}</Text>
                : <Text style={s.noComment}>No written review</Text>}
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Edit Review</Text>
            <Text style={s.modalPitch}>{selectedReview?.pitch?.name}</Text>

            <Text style={s.modalLabel}>Rating</Text>
            <StarRow rating={editRating} size={32} onPress={setEditRating} mutedColor={colors.textMuted} />

            <Text style={[s.modalLabel, { marginTop: SPACING.lg }]}>Your Review</Text>
            <TextInput
              style={s.modalInput}
              value={editComment}
              onChangeText={setEditComment}
              placeholder="Share your experience..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg }}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setModalVisible(false)} activeOpacity={0.85}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSaveBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmitEdit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    title: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },

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
    },
    emptyTitle: { color: colors.textPrimary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold },
    emptySubtitle: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },

    card: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.base,
      marginBottom: SPACING.md,
      borderWidth: 1, borderColor: colors.border,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
    pitchName: { color: colors.textPrimary, fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold },
    pitchAddr: { color: colors.textMuted, fontSize: FONTS.xs, marginTop: 2 },
    editBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: SPACING.md, paddingVertical: 6,
      borderRadius: RADIUS.sm,
    },
    editBtnText: { color: colors.primary, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.bold },
    ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
    dateText: { color: colors.textMuted, fontSize: FONTS.xs },
    comment: { color: colors.textSecondary, fontSize: FONTS.sm, lineHeight: 20 },
    noComment: { color: colors.textMuted, fontSize: FONTS.xs, fontStyle: 'italic' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: SPACING.xl, paddingBottom: SPACING['3xl'],
    },
    modalHandle: {
      alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: SPACING.lg,
    },
    modalTitle: { color: colors.textPrimary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, marginBottom: 4 },
    modalPitch: { color: colors.textMuted, fontSize: FONTS.sm, marginBottom: SPACING.lg },
    modalLabel: { color: colors.textSecondary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, marginBottom: SPACING.sm },
    modalInput: {
      backgroundColor: colors.background,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      color: colors.textPrimary,
      fontSize: FONTS.sm,
      minHeight: 100,
      borderWidth: 1, borderColor: colors.border,
    },
    modalCancelBtn: {
      flex: 1, backgroundColor: colors.background,
      borderWidth: 1, borderColor: colors.border,
      borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center',
    },
    modalCancelText: { color: colors.textSecondary, fontWeight: FONT_WEIGHT.semiBold },
    modalSaveBtn: {
      flex: 1, backgroundColor: colors.primary,
      borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center',
    },
    modalSaveText: { color: '#fff', fontWeight: FONT_WEIGHT.bold },
  });
}
