import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { useOwnerPitches } from '../../hooks/useData';
import { PITCHES, OWNER } from '../../services/api';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

interface Props { navigation: any; }

export default function ManageScheduleScreen({ navigation }: Props) {
  const { colors, resolvedScheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [selectedPitchIdx, setSelectedPitchIdx] = useState(0);
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [togglingSlot, setTogglingSlot] = useState<string | null>(null);

  const { data: pitches, isLoading: pitchesLoading, error: pitchesError } = useOwnerPitches();
  const pitchList: any[] = Array.isArray(pitches) ? pitches : [];
  const selectedPitch = pitchList[selectedPitchIdx] ?? null;

  const loadSlots = useCallback(async () => {
    if (!selectedPitch) return;
    setSlotsLoading(true);
    setSlotsError('');
    try {
      const res = await PITCHES.getSlots(selectedPitch.id, selectedDate);
      const raw = (res.data as any)?.data ?? res.data;
      const arr = raw?.slots ?? raw;
      setSlots(Array.isArray(arr) ? arr : []);
    } catch (err: any) {
      setSlotsError(err.message || 'Failed to load slots');
    } finally {
      setSlotsLoading(false);
    }
  }, [selectedPitch, selectedDate]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const handleToggleSlot = async (slot: any) => {
    if (!slot.id) {
      Alert.alert('Not available', 'This slot cannot be modified.');
      return;
    }
    const isAvailable = ['available', 'AVAILABLE'].includes(slot.status);
    const newStatus = isAvailable ? 'UNAVAILABLE' : 'AVAILABLE';
    const verb = isAvailable ? 'Block' : 'Unblock';
    Alert.alert(
      `${verb} slot?`,
      `${slot.startTime} – ${slot.endTime} on ${selectedDate}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: verb,
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

  const stats = useMemo(() => {
    const available = slots.filter(s => ['available', 'AVAILABLE'].includes(s.status)).length;
    const booked    = slots.filter(s => ['booked', 'BOOKED', 'held', 'HELD'].includes(s.status)).length;
    const blocked   = slots.filter(s => ['unavailable', 'UNAVAILABLE', 'blocked', 'BLOCKED'].includes(s.status)).length;
    return { available, booked, blocked };
  }, [slots]);

  const calendarTheme = useMemo(() => ({
    backgroundColor: colors.background,
    calendarBackground: colors.surface,
    textSectionTitleColor: colors.textMuted,
    selectedDayBackgroundColor: colors.primary,
    selectedDayTextColor: '#fff',
    todayTextColor: colors.primary,
    dayTextColor: colors.textPrimary,
    textDisabledColor: colors.textMuted,
    arrowColor: colors.primary,
    monthTextColor: colors.textPrimary,
    indicatorColor: colors.primary,
    dotColor: colors.primary,
    selectedDotColor: '#fff',
    textDayFontWeight: '500' as const,
    textMonthFontWeight: '700' as const,
    textDayHeaderFontWeight: '600' as const,
  }), [colors]);

  if (pitchesLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (pitchesError || pitchList.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Schedule</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No pitches yet</Text>
          <Text style={styles.emptyText}>{pitchesError ?? 'Add a pitch first to start managing its schedule.'}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('AddPitch')} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Add a pitch</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={loadSlots} hitSlop={8}>
            <Ionicons name="refresh" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}>
        {/* Pitch selector */}
        {pitchList.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pitchSelectorRow}
          >
            {pitchList.map((p: any, i: number) => {
              const active = selectedPitchIdx === i;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pitchChip, active && styles.pitchChipActive]}
                  onPress={() => setSelectedPitchIdx(i)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.pitchChipText, active && styles.pitchChipTextActive]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Calendar */}
        <View style={styles.calendarWrap}>
          <Calendar
            key={resolvedScheme}
            current={selectedDate}
            minDate={todayISO()}
            onDayPress={(d: DateData) => setSelectedDate(d.dateString)}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: colors.primary },
            }}
            theme={calendarTheme}
            enableSwipeMonths
          />
        </View>

        {/* Summary strip */}
        <View style={styles.summaryStrip}>
          <SummaryItem dot={colors.primary} label={`${stats.available} Available`} colors={colors} />
          <SummaryItem dot={colors.info}    label={`${stats.booked} Booked`}    colors={colors} />
          <SummaryItem dot={colors.error}   label={`${stats.blocked} Blocked`}  colors={colors} />
        </View>

        {/* Slot list */}
        {slotsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING.xl }} />
        ) : slotsError ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{slotsError}</Text>
            <TouchableOpacity onPress={loadSlots} style={styles.primaryBtn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="time-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No slots</Text>
            <Text style={styles.emptyText}>No slots are configured for this date yet.</Text>
          </View>
        ) : (
          <View style={styles.slotList}>
            {slots.map((slot, i) => (
              <SlotCard
                key={slot.id ?? i}
                slot={slot}
                colors={colors}
                styles={styles}
                toggling={togglingSlot === slot.id}
                onPress={() => handleToggleSlot(slot)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryItem({ dot, label, colors }: { dot: string; label: string; colors: ColorPalette }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      <Text style={{ color: colors.textSecondary, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold }}>{label}</Text>
    </View>
  );
}

function SlotCard({
  slot, colors, styles, toggling, onPress,
}: {
  slot: any;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  toggling: boolean;
  onPress: () => void;
}) {
  const status = (slot.status ?? 'AVAILABLE').toUpperCase();
  const isAvailable = status === 'AVAILABLE';
  const isBookedOrHeld = status === 'BOOKED' || status === 'HELD';

  const fg =
    status === 'BOOKED' || status === 'HELD' ? colors.info :
    status === 'AVAILABLE' ? colors.primary :
    colors.error;
  const bg =
    status === 'BOOKED' || status === 'HELD' ? 'rgba(59,130,246,0.12)' :
    status === 'AVAILABLE' ? colors.primaryMuted :
    'rgba(239,68,68,0.12)';

  return (
    <TouchableOpacity
      style={styles.slotCard}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={toggling || isBookedOrHeld}
    >
      <View style={styles.slotTimeBlock}>
        <Text style={styles.slotTime}>{slot.startTime}</Text>
        <View style={styles.slotTimeLine} />
        <Text style={styles.slotTime}>{slot.endTime}</Text>
      </View>
      <View style={[styles.slotBody, { backgroundColor: bg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
          {toggling ? (
            <ActivityIndicator color={fg} size="small" />
          ) : (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: fg }} />
          )}
          <Text style={[styles.slotStatus, { color: fg }]}>
            {isAvailable ? 'Available' : isBookedOrHeld ? 'Booked' : 'Blocked'}
          </Text>
        </View>
        {slot.booking?.user?.name && (
          <Text style={styles.slotMeta}>{slot.booking.user.name}</Text>
        )}
        {slot.price && isAvailable && (
          <Text style={styles.slotPrice}>KSh {slot.price.toLocaleString()}</Text>
        )}
        <Text style={styles.slotHint}>
          {isBookedOrHeld ? 'Locked by booking' : isAvailable ? 'Tap to block' : 'Tap to unblock'}
        </Text>
      </View>
    </TouchableOpacity>
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

    pitchSelectorRow: {
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
    },
    pitchChip: {
      paddingHorizontal: SPACING.base,
      height: 36,
      borderRadius: RADIUS.full,
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pitchChipActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    pitchChipText: {
      color: colors.textMuted,
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.semiBold,
      maxWidth: 180,
    },
    pitchChipTextActive: { color: colors.primary },

    calendarWrap: {
      marginHorizontal: SPACING.base,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },

    summaryStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
      marginTop: SPACING.sm,
    },

    slotList: { paddingHorizontal: SPACING.base, gap: SPACING.sm, marginTop: SPACING.xs },

    slotCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    slotTimeBlock: {
      width: 84,
      paddingVertical: SPACING.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
    },
    slotTime: {
      color: colors.textPrimary,
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.bold,
    },
    slotTimeLine: {
      width: 2,
      height: 8,
      borderRadius: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    slotBody: {
      flex: 1,
      padding: SPACING.md,
      gap: 4,
    },
    slotStatus: {
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.bold,
    },
    slotMeta: {
      color: colors.textSecondary,
      fontSize: FONTS.xs,
    },
    slotPrice: {
      color: colors.primary,
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.bold,
    },
    slotHint: {
      color: colors.textMuted,
      fontSize: FONTS.xs,
      fontStyle: 'italic',
    },

    emptyWrap: {
      alignItems: 'center',
      paddingVertical: SPACING['3xl'],
      paddingHorizontal: SPACING.xl,
      gap: SPACING.sm,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primaryMuted,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: FONTS.lg,
      fontWeight: FONT_WEIGHT.bold,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: FONTS.sm,
      textAlign: 'center',
    },
    primaryBtn: {
      marginTop: SPACING.md,
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: FONT_WEIGHT.bold,
      fontSize: FONTS.sm,
    },
  });
}
