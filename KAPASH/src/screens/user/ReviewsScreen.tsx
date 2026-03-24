/**
 * ReviewsScreen
 * Place at: src/screens/user/ReviewsScreen.tsx
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFetch } from '../../hooks/useData';
import { USER } from '../../services/api';

function StarRow({
  rating, size = 16, onPress,
}: { rating: number; size?: number; onPress?: (r: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onPress?.(i)}
          disabled={!onPress}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: size, color: i <= rating ? '#F59E0B' : '#374151' }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ReviewsScreen({ navigation }: any) {
  const [refreshing, setRefreshing]     = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReview, setSelected]   = useState<any>(null);
  const [editRating, setEditRating]     = useState(5);
  const [editComment, setEditComment]   = useState('');
  const [submitting, setSubmitting]     = useState(false);

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
      await USER.updateReview(selectedReview.id, {
        rating: editRating,
        comment: editComment.trim(),
      });
      setModalVisible(false);
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update review');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  return (
    <View style={s.container}>
      <SafeAreaView>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={s.title}>My Reviews</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color="#22C55E" style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={s.center}>
          <Text style={s.errorText}>Failed to load reviews</Text>
          <TouchableOpacity style={s.retryBtn} onPress={refetch}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : reviews.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyIcon}>⭐</Text>
          <Text style={s.emptyTitle}>No Reviews Yet</Text>
          <Text style={s.emptySubtitle}>
            After completing a booking you can rate the pitch
          </Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.pitchName} numberOfLines={1}>
                    {item.pitch?.name || 'Pitch'}
                  </Text>
                  <Text style={s.pitchAddr} numberOfLines={1}>
                    {item.pitch?.address || ''}
                  </Text>
                </View>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={s.ratingRow}>
                <StarRow rating={item.rating} size={18} />
                <Text style={s.dateText}>{formatDate(item.createdAt)}</Text>
              </View>

              {item.comment
                ? <Text style={s.comment}>{item.comment}</Text>
                : <Text style={s.noComment}>No written review</Text>
              }
            </View>
          )}
        />
      )}

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Edit Review</Text>
            <Text style={s.modalPitch}>{selectedReview?.pitch?.name}</Text>

            <Text style={s.modalLabel}>Rating</Text>
            <StarRow rating={editRating} size={32} onPress={setEditRating} />

            <Text style={[s.modalLabel, { marginTop: 20 }]}>Your Review</Text>
            <TextInput
              style={s.modalInput}
              value={editComment}
              onChangeText={setEditComment}
              placeholder="Share your experience..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSaveBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmitEdit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalSaveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0F1923' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:        { width: 36, height: 36, justifyContent: 'center' },
  backArrow:      { fontSize: 22, color: '#fff' },
  title:          { fontSize: 18, fontWeight: '700', color: '#fff' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText:      { color: '#EF4444', fontSize: 15, marginBottom: 12 },
  retryBtn:       { backgroundColor: '#1A2535', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:      { color: '#22C55E', fontWeight: '600' },
  emptyIcon:      { fontSize: 48, marginBottom: 16 },
  emptyTitle:     { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle:  { color: '#6B7280', fontSize: 14, textAlign: 'center' },
  card:           { backgroundColor: '#1A2535', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  pitchName:      { color: '#fff', fontSize: 15, fontWeight: '700' },
  pitchAddr:      { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  editBtn:        { backgroundColor: '#0F1923', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText:    { color: '#22C55E', fontSize: 12, fontWeight: '700' },
  ratingRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dateText:       { color: '#6B7280', fontSize: 12 },
  comment:        { color: '#D1D5DB', fontSize: 14, lineHeight: 20 },
  noComment:      { color: '#6B7280', fontSize: 13, fontStyle: 'italic' },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal:          { backgroundColor: '#1A2535', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:     { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalPitch:     { color: '#9CA3AF', fontSize: 13, marginBottom: 20 },
  modalLabel:     { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  modalInput:     { backgroundColor: '#0F1923', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, minHeight: 100, borderWidth: 1, borderColor: '#374151' },
  modalBtns:      { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: { flex: 1, backgroundColor: '#0F1923', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCancelText:{ color: '#9CA3AF', fontWeight: '600' },
  modalSaveBtn:   { flex: 1, backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalSaveText:  { color: '#fff', fontWeight: '700' },
});