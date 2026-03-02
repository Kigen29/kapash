import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const WEEKS = [
  { day: 'MON', date: '24', active: true },
  { day: 'TUE', date: '25', active: false },
  { day: 'WED', date: '26', active: false },
  { day: 'THU', date: '27', active: false },
  { day: 'FRI', date: '28', active: false },
  { day: 'SAT', date: '29', active: false },
  { day: 'SUN', date: '30', active: false },
];

const SLOTS_DATA = [
  { time: '06:00 – 07:00', status: 'available', name: null },
  { time: '07:00 – 08:00', status: 'booked', name: 'Nairobi Stars FC' },
  { time: '08:00 – 09:00', status: 'booked', name: 'Corporate League' },
  { time: '09:00 – 10:00', status: 'available', name: null },
  { time: '10:00 – 11:00', status: 'blocked', name: 'Maintenance' },
  { time: '11:00 – 12:00', status: 'available', name: null },
  { time: '14:00 – 15:00', status: 'booked', name: 'Kids Training' },
  { time: '15:00 – 16:00', status: 'available', name: null },
  { time: '16:00 – 17:00', status: 'available', name: null },
  { time: '18:00 – 19:00', status: 'booked', name: 'Friday Night League' },
  { time: '19:00 – 20:00', status: 'available', name: null },
  { time: '20:00 – 21:00', status: 'available', name: null },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  available: { bg: COLORS.successBg, text: COLORS.textGreen, dot: COLORS.success },
  booked: { bg: COLORS.infoBg, text: COLORS.info, dot: COLORS.info },
  blocked: { bg: COLORS.errorBg, text: COLORS.error, dot: COLORS.error },
};

interface Props { navigation: any; }

export default function ManageScheduleScreen({ navigation }: Props) {
  const [selectedDate, setSelectedDate] = useState(0);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Text style={styles.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Week selector */}
      <View style={styles.weekContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
          {WEEKS.map((w, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.weekDay, selectedDate === i && styles.weekDayActive]}
              onPress={() => setSelectedDate(i)}
            >
              <Text style={[styles.weekDayLabel, selectedDate === i && styles.weekDayLabelActive]}>
                {w.day}
              </Text>
              <Text style={[styles.weekDayDate, selectedDate === i && styles.weekDayDateActive]}>
                {w.date}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.summaryText}>5 Available</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.info }]} />
          <Text style={styles.summaryText}>4 Booked</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: COLORS.error }]} />
          <Text style={styles.summaryText}>1 Blocked</Text>
        </View>
      </View>

      {/* Slot list */}
      <ScrollView contentContainerStyle={styles.slotList} showsVerticalScrollIndicator={false}>
        {SLOTS_DATA.map((slot, i) => {
          const cfg = STATUS_COLORS[slot.status];
          return (
            <TouchableOpacity key={i} style={styles.slotCard} activeOpacity={0.85}>
              {/* Time column */}
              <View style={styles.slotTimeBlock}>
                <Text style={styles.slotTime}>{slot.time.split(' – ')[0]}</Text>
                <View style={styles.slotTimeLine} />
                <Text style={styles.slotTime}>{slot.time.split(' – ')[1]}</Text>
              </View>

              {/* Content */}
              <View style={styles.slotContent}>
                {slot.status === 'available' ? (
                  <View style={styles.availableBlock}>
                    <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                    <Text style={[styles.availableText, { color: cfg.text }]}>Available</Text>
                    <TouchableOpacity style={styles.bookManualBtn}>
                      <Text style={styles.bookManualBtnText}>+ Book</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.bookedBlock, { backgroundColor: cfg.bg }]}>
                    <View style={styles.bookedHeader}>
                      <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
                      <Text style={[styles.bookedStatus, { color: cfg.text }]}>
                        {slot.status === 'blocked' ? 'Blocked' : 'Booked'}
                      </Text>
                    </View>
                    {slot.name && (
                      <Text style={styles.bookedName}>{slot.name}</Text>
                    )}
                    <View style={styles.bookedActions}>
                      <TouchableOpacity style={styles.bookedActionBtn}>
                        <Text style={styles.bookedActionText}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.bookedActionBtn, styles.bookedActionBtnDanger]}>
                        <Text style={styles.bookedActionTextDanger}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: SPACING['3xl'] }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>＋</Text>
          <Text style={styles.fabText}>Block Slot</Text>
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
  addBtn: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: FONTS.xl, color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },
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
  availableText: { flex: 1, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.medium },
  bookManualBtn: { backgroundColor: COLORS.primaryBg, paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full },
  bookManualBtnText: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.bold, color: COLORS.primary },
  bookedBlock: { flex: 1, borderRadius: RADIUS.xl, paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, gap: 6 },
  bookedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookedStatus: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 0.3 },
  bookedName: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textPrimary },
  bookedActions: { flexDirection: 'row', gap: SPACING.sm },
  bookedActionBtn: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.5)' },
  bookedActionText: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textSecondary },
  bookedActionBtnDanger: {},
  bookedActionTextDanger: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.error },
  fab: { position: 'absolute', bottom: SPACING.xl, right: SPACING.base, borderRadius: RADIUS.full, overflow: 'hidden', ...SHADOWS.green },
  fabGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  fabIcon: { fontSize: FONTS.lg, color: COLORS.white, fontWeight: FONT_WEIGHT.bold },
  fabText: { fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: COLORS.white },
});