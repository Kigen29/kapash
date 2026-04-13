import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useOwnerPitches } from '../../hooks/useData';
import { PITCHES, OWNER } from '../../services/api';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  AVAILABLE:  { bg: COLORS.successBg,  text: COLORS.textGreen,  dot: COLORS.success },
  available:  { bg: COLORS.successBg,  text: COLORS.textGreen,  dot: COLORS.success },
  BOOKED:     { bg: COLORS.infoBg,     text: COLORS.info,       dot: COLORS.info },
  booked:     { bg: COLORS.infoBg,     text: COLORS.info,       dot: COLORS.info },
  HELD:       { bg: COLORS.infoBg,     text: COLORS.info,       dot: COLORS.info },
  held:       { bg: COLORS.infoBg,     text: COLORS.info,       dot: COLORS.info },
  UNAVAILABLE:{ bg: COLORS.errorBg,    text: COLORS.error,      dot: COLORS.error },
  unavailable:{ bg: COLORS.errorBg,    text: COLORS.error,      dot: COLORS.error },
  BLOCKED:    { bg: COLORS.errorBg,    text: COLORS.error,      dot: COLORS.error },
  blocked:    { bg: COLORS.errorBg,    text: COLORS.error,      dot: COLORS.error },
};

function buildWeek(): { day: string; date: string; iso: string }[] {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const result = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    result.push({
      day: days[d.getDay()],
      date: String(d.getDate()).padStart(2, '0'),
      iso: d.toISOString().split('T')[0],
    });
  }
  return result;
}

const WEEK = buildWeek();

interface Props { navigation: any; }

export default function ManageScheduleScreen({ navigation }: Props) {
  const [selectedDay, setSelectedDay]         = useState(0);
  const [selectedPitchIdx, setSelectedPitchIdx] = useState(0);
  const [slots, setSlots]                     = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading]       = useState(false);
  const [slotsError, setSlotsError]           = useState('');
  const [togglingSlot, setTogglingSlot]       = useState<string | null>(null);

  const { data: pitches, isLoading: pitchesLoading, error: pitchesError } = useOwnerPitches();
  const pitchList: any[] = Array.isArray(pitches) ? pitches : [];
  const selectedPitch = pitchList[selectedPitchIdx] ?? null;

  const loadSlots = useCallback(async () => {
    if (!selectedPitch) return;
    setSlotsLoading(true);
    setSlotsError('');
    try {
      const res = await PITCHES.getSlots(selectedPitch.id, WEEK[selectedDay].iso);
      const raw = (res.data as any)?.data ?? res.data;
      const arr = raw?.slots ?? raw;
      setSlots(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      setSlotsError(err.message || 'Failed to load slots');
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedPitch, selectedDay]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleToggleSlot = async (slot: any) => {
    if (!slot.id) {
      Alert.alert('Not available', 'This slot cannot be modified.');
      return;
    }
    const isAvailable = ['available', 'AVAILABLE'].includes(slot.status);
    const newStatus = isAvailable ? 'UNAVAILABLE' : 'AVAILABLE';
    const label = isAvailable ? 'block' : 'unblock';
    Alert.alert(
      `${isAvailable ? 'Block' : 'Unblock'} slot?`,
      `${slot.startTime} – ${slot.endTime} on ${WEEK[selectedDay].iso}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label.charAt(0).toUpperCase() + label.slice(1),
          style: isAvailable ? 'destructive' : 'default',
          onPress: async () => {
            setTogglingSlot(slot.id);
            try {
              await OWNER.updateSlot(slot.id, { status: newStatus });
              await loadSlots();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not update slot');
            } finally {
              setTogglingSlot(null);
            }
          },
        },
      ],
    );
  };

  const available = slots.filter(s => ['available', 'AVAILABLE'].includes(s.status)).length;
  const booked    = slots.filter(s => ['booked', 'BOOKED', 'held', 'HELD'].includes(s.status)).length;
  const blocked   = slots.filter(s => ['unavailable', 'UNAVAILABLE', 'blocked', 'BLOCKED'].includes(s.status)).length;

  if (pitchesLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (pitchesError || pitchList.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🏟️</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONTS.base, textAlign: 'center' }}>
            {pitchesError ?? 'No pitches found. Add a pitch first.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadSlots}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Pitch selector (if multiple pitches) */}
      {pitchList.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pitchSelectorWrap} contentContainerStyle={styles.pitchSelectorRow}>
          {pitchList.map((p: any, i: number) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.pitchChip, selectedPitchIdx === i && styles.pitchChipActive]}
              onPress={() => setSelectedPitchIdx(i)}
            >
              <Text style={[styles.pitchChipText, selectedPitchIdx === i && styles.pitchChipTextActive]} numberOfLines={1}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Week selector */}
      <View style={styles.weekContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
          {WEEK.map((w, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.weekDay, selectedDay === i && styles.weekDayActive]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[styles.weekDayLabel, selectedDay === i && styles.weekDayLabelActive]}>{w.day}</Text>
              <Text style={[styles.weekDayDate,  selectedDay === i && styles.weekDayDateActive]}>{w.date}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.summaryText}>{available} Available</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.info }]} />
          <Text style={styles.summaryText}>{booked} Booked</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.error }]} />
          <Text style={styles.summaryText}>{blocked} Blocked</Text>
        </View>
      </View>

      {/* Slot list */}
      {slotsLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : slotsError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONTS.sm, textAlign: 'center', marginBottom: 12 }}>{slotsError}</Text>
          <TouchableOpacity onPress={loadSlots} style={{ backgroundColor: COLORS.primaryBg, paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.full }}>
            <Text style={{ color: COLORS.primary, fontWeight: FONT_WEIGHT.semiBold }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : slots.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 36, marginBottom: 10 }}>📅</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONTS.sm, textAlign: 'center' }}>
            No slots available for this date
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.slotList} showsVerticalScrollIndicator={false}>
          {slots.map((slot, i) => {
            const status = (slot.status ?? 'available').toLowerCase();
            const cfg = STATUS_COLORS[slot.status] ?? STATUS_COLORS[status] ?? STATUS_COLORS.available;
            const isAvailable = status === 'available';
            const isBookedOrHeld = status === 'booked' || status === 'held';
            const isToggling = togglingSlot === slot.id;

            return (
              <TouchableOpacity
                key={slot.id ?? i}
                style={styles.slotCard}
                activeOpacity={0.85}
                onPress={() => handleToggleSlot(slot)}
                disabled={isToggling || isBookedOrHeld}
              >
                {/* Time column */}
                <View style={styles.slotTimeBlock}>
                  <Text style={styles.slotTime}>{slot.startTime}</Text>
                  <View style={styles.slotTimeLine} />
                  <Text style={styles.slotTime}>{slot.endTime}</Text>
                </View>

                {/* Content */}
                <View style={styles.slotContent}>
                  {isAvailable ? (
                    <View style={styles.availableBlock}>
                      <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                      <Text style={[styles.availableText, { color: cfg.text }]}>Available</Text>
                      {slot.price && (
                        <Text style={styles.slotPrice}>KES {slot.price.toLocaleString()}</Text>
                      )}
                      <View style={{ flex: 1 }} />
                      <Text style={styles.blockHint}>Tap to block</Text>
                    </View>
                  ) : (
                    <View style={[styles.bookedBlock, { backgroundColor: cfg.bg }]}>
                      <View style={styles.bookedHeader}>
                        {isToggling ? (
                          <ActivityIndicator color={cfg.dot} size="small" />
                        ) : (
                          <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                        )}
                        <Text style={[styles.bookedStatus, { color: cfg.text }]}>
                          {isBookedOrHeld ? 'Booked' : 'Blocked'}
                        </Text>
                      </View>
                      {slot.booking?.user?.name && (
                        <Text style={styles.bookedName}>{slot.booking.user.name}</Text>
                      )}
                      {!isBookedOrHeld && (
                        <Text style={styles.blockHint}>Tap to unblock</Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: SPACING['3xl'] }} />
        </ScrollView>
      )}

      {/* FAB — block a slot by selecting it */}
      <TouchableOpacity style={styles.fab} onPress={loadSlots}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.fabGradient}>
          <Text style={styles.fabIcon}>↻</Text>
          <Text style={styles.fabText}>Refresh</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.base, paddingTop: 56, paddingBottom: SPACING.base, backgroundColor: COLORS.surface },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  refreshBtn: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
  refreshBtnText: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },

  pitchSelectorWrap: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  pitchSelectorRow: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, gap: SPACING.sm },
  pitchChip: { paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border },
  pitchChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  pitchChipText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },
  pitchChipTextActive: { color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },

  weekContainer: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  weekRow: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, gap: SPACING.sm },
  weekDay: { width: 56, height: 72, borderRadius: RADIUS.xl, borderWidth: 1.5, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  weekDayActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  weekDayLabel: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textMuted, letterSpacing: 0.5 },
  weekDayLabelActive: { color: COLORS.primary },
  weekDayDate: { fontSize: FONTS['2xl'], fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary },
  weekDayDateActive: { color: COLORS.primary },

  summaryStrip: { flexDirection: 'row', paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, backgroundColor: COLORS.surface, gap: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryDot: { width: 8, height: 8, borderRadius: RADIUS.full },
  summaryText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.medium },

  slotList: { paddingHorizontal: SPACING.base, paddingTop: SPACING.base, gap: SPACING.sm },
  slotCard: { flexDirection: 'row', gap: SPACING.md, alignItems: 'stretch', minHeight: 70 },
  slotTimeBlock: { width: 58, alignItems: 'center', paddingTop: 4 },
  slotTime: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONT_WEIGHT.medium },
  slotTimeLine: { flex: 1, width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  slotContent: { flex: 1 },
  availableBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.border },
  statusDot: { width: 8, height: 8, borderRadius: RADIUS.full, flexShrink: 0 },
  availableText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.medium },
  slotPrice: { fontSize: FONTS.xs, color: COLORS.textMuted },
  blockHint: { fontSize: FONTS.xs, color: COLORS.textMuted, fontStyle: 'italic' },
  bookedBlock: { flex: 1, borderRadius: RADIUS.xl, paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, gap: 6 },
  bookedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookedStatus: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.3 },
  bookedName: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary },

  fab: { position: 'absolute', bottom: SPACING.xl, right: SPACING.base, borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.green },
  fabGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  fabIcon: { fontSize: FONTS.lg, color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  fabText: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
});
