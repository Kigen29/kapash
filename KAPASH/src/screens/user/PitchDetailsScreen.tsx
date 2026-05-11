import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, FlatList, Image, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePitch, usePitchSlots } from '../../hooks/useData';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

const SCREEN_W = Dimensions.get('window').width;

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDates(count = 14): { label: string; day: string; value: string; weekday: string }[] {
  const result = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    result.push({
      label: i === 0 ? 'Today' : i === 1 ? 'Tom' : d.toLocaleDateString('en-KE', { weekday: 'short' }),
      day: d.getDate().toString(),
      value: formatDate(d),
      weekday: d.toLocaleDateString('en-KE', { weekday: 'short' }),
    });
  }
  return result;
}

const DATES = getDates(14);

export default function PitchDetailsScreen({ route, navigation }: any) {
  const { pitchId } = route.params;
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [selectedDate, setSelectedDate] = useState(DATES[0].value);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [imgIndex, setImgIndex] = useState(0);

  const { data: pitch, isLoading, error, refetch } = usePitch(pitchId);
  const { data: slots, isLoading: slotsLoading } = usePitchSlots(pitchId, selectedDate);

  const MAX_HOURS = 4;

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlots([]);
  };

  const toggleSlot = (startTime: string) => {
    setSelectedSlots(prev => {
      if (prev.includes(startTime)) {
        // Allow removing only the boundary slots so the remaining selection stays contiguous
        const sorted = [...prev].sort();
        if (startTime === sorted[0] || startTime === sorted[sorted.length - 1]) {
          return prev.filter(s => s !== startTime);
        }
        // Removing a middle slot — reset to just that one tap
        return [startTime];
      }
      // Adding: must be adjacent to existing selection (or first selection)
      if (prev.length === 0) return [startTime];
      if (prev.length >= MAX_HOURS) {
        Alert.alert('Limit reached', `You can book up to ${MAX_HOURS} hours at once.`);
        return prev;
      }
      const sorted = [...prev].sort();
      const first = sorted[0];
      const last  = sorted[sorted.length - 1];
      const startHour = parseInt(startTime.slice(0, 2), 10);
      const firstHour = parseInt(first.slice(0, 2), 10);
      const lastHour  = parseInt(last.slice(0, 2),  10);
      if (startHour === firstHour - 1 || startHour === lastHour + 1) {
        return [...prev, startTime];
      }
      // Non-adjacent — start fresh from this slot
      return [startTime];
    });
  };

  // Compute combined startTime / endTime for selected slots
  const selection = useMemo(() => {
    if (selectedSlots.length === 0) return null;
    const sorted = [...selectedSlots].sort();
    const first = sorted[0];
    const last  = sorted[sorted.length - 1];
    const lastSlot = (slots as any[])?.find((sl: any) => sl.startTime === last);
    const endTime = lastSlot?.endTime ?? `${String(parseInt(last.slice(0, 2), 10) + 1).padStart(2, '0')}:00`;
    const hours = sorted.length;
    const total = hours * (pitch?.pricePerHour ?? 0);
    return { startTime: first, endTime, hours, total };
  }, [selectedSlots, slots, pitch]);

  const handleBook = useCallback(() => {
    if (!selection) {
      Alert.alert('Select a slot', 'Please choose at least one available time slot.');
      return;
    }
    navigation.navigate('Checkout', {
      pitchId,
      pitchName: pitch?.name,
      pitchAddress: pitch?.address,
      date: selectedDate,
      startTime: selection.startTime,
      endTime: selection.endTime,
      price: selection.total,
      pitchImage: (pitch as any)?.images?.[0]?.url,
    });
  }, [selection, pitch, selectedDate, pitchId, navigation]);

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !pitch) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
        <Text style={s.errorMsg}>{error || 'Pitch not found'}</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={refetch} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = pitch.images?.length
    ? pitch.images.map((i: any) => i.url)
    : ['https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800'];
  const amenities: any[] = pitch.amenities || [];
  const slotList: any[] = Array.isArray(slots) ? slots : [];
  const rating = pitch.avgRating ?? pitch.rating;
  const location = pitch.location || pitch.address || pitch.city;
  const type = pitch.pitchType || pitch.type;

  return (
    <View style={s.container}>
      {/* Image Carousel */}
      <View style={s.imgWrap}>
        <FlatList
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(_, i) => String(i)}
          showsHorizontalScrollIndicator={false}
          onScroll={(e) =>
            setImgIndex(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width))
          }
          renderItem={({ item }) => <Image source={{ uri: item }} style={s.heroImg} />}
        />
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={s.imgTopGrad} />
        <LinearGradient
          colors={['transparent', `${colors.background}f0`]}
          style={s.imgBotGrad}
        />

        <SafeAreaView edges={['top']} style={s.headerWrap}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <TouchableOpacity style={s.headerBtn} activeOpacity={0.85}>
                <Ionicons name="share-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={s.headerBtn} activeOpacity={0.85}>
                <Ionicons name="heart-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {images.length > 1 && (
          <View style={s.dots}>
            {images.map((_: any, i: number) => (
              <View key={i} style={[s.dot, imgIndex === i && s.dotActive]} />
            ))}
          </View>
        )}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Title & Price */}
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.pitchName}>{pitch.name}</Text>
            {location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={s.pitchLoc}>{location}</Text>
              </View>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.price}>KSh {pitch.pricePerHour?.toLocaleString()}</Text>
            <Text style={s.perHr}>/hour</Text>
          </View>
        </View>

        {/* Badges */}
        <View style={s.badgeRow}>
          {rating ? (
            <View style={s.badge}>
              <Ionicons name="star" size={12} color="#FBBF24" />
              <Text style={s.badgeText}>{Number(rating).toFixed(1)}</Text>
              {pitch.reviewCount ? (
                <Text style={s.badgeMeta}>({pitch.reviewCount})</Text>
              ) : null}
            </View>
          ) : null}
          {type ? (
            <View style={[s.badge, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[s.badgeText, { color: colors.primary }]}>{formatType(type)}</Text>
            </View>
          ) : null}
          {pitch.isVerified && (
            <View style={[s.badge, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
              <Text style={[s.badgeText, { color: colors.primary }]}>Verified</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {pitch.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.bodyText}>{pitch.description}</Text>
          </View>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Amenities</Text>
            <View style={s.amenityGrid}>
              {amenities.map((a: any) => (
                <View key={a.id} style={s.amenityChip}>
                  <Text style={s.amenityIcon}>{a.icon || '⚽'}</Text>
                  <Text style={s.amenityName}>{a.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Date picker */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Choose a date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: SPACING.sm }}>
            {DATES.map(d => {
              const active = selectedDate === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[s.dateChip, active && s.dateChipActive]}
                  onPress={() => handleDateChange(d.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.dateChipLabel, active && s.dateChipLabelActive]}>{d.label}</Text>
                  <Text style={[s.dateChipDay, active && s.dateChipDayActive]}>{d.day}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Slots */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Available time slots</Text>
          {slotsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING.lg }} />
          ) : slotList.length === 0 ? (
            <View style={s.emptySlots}>
              <Ionicons name="time-outline" size={28} color={colors.textMuted} />
              <Text style={s.emptyText}>No slots available for this date</Text>
            </View>
          ) : (
            <>
              <View style={s.slotsGrid}>
                {slotList.map((sl: any) => {
                  const isAvailable = ['available', 'AVAILABLE'].includes(sl.status);
                  const isSelected = selectedSlots.includes(sl.startTime);
                  const isBooked = ['booked', 'BOOKED', 'held', 'HELD'].includes(sl.status);
                  return (
                    <TouchableOpacity
                      key={sl.startTime}
                      style={[
                        s.slotChip,
                        isAvailable && s.slotChipAvailable,
                        isSelected && s.slotChipSelected,
                        isBooked && s.slotChipBooked,
                      ]}
                      onPress={() => isAvailable && toggleSlot(sl.startTime)}
                      disabled={!isAvailable}
                      activeOpacity={0.85}
                    >
                      <Text style={[
                        s.slotText,
                        isSelected && s.slotTextSelected,
                        isBooked && s.slotTextBooked,
                      ]}>
                        {sl.startTime}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedSlots.length > 0 && (
                <Text style={s.slotsHint}>
                  Tap an adjacent hour to extend, or tap the first/last selected hour to remove it.
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <SafeAreaView edges={['bottom']} style={s.ctaWrap}>
        <View style={s.ctaInner}>
          <View style={{ flex: 1 }}>
            <Text style={s.ctaLabel}>
              {selection ? `${selection.hours} ${selection.hours === 1 ? 'hour' : 'hours'} selected` : 'Pick one or more hours'}
            </Text>
            <Text style={s.ctaPrice} numberOfLines={1}>
              {selection
                ? `${selection.startTime} – ${selection.endTime} · KSh ${selection.total.toLocaleString()}`
                : `KSh ${pitch.pricePerHour?.toLocaleString()}/hr`}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.ctaBtn, !selection && s.ctaBtnDisabled]}
            onPress={handleBook}
            disabled={!selection}
            activeOpacity={0.9}
          >
            <Text style={s.ctaBtnText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function formatType(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
    errorMsg: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
    primaryBtn: {
      marginTop: SPACING.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    primaryBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },

    imgWrap: { width: SCREEN_W, height: 320, position: 'relative' },
    heroImg: { width: SCREEN_W, height: 320 },
    imgTopGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
    imgBotGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },

    headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.base,
      paddingTop: SPACING.sm,
    },
    headerBtn: {
      width: 40, height: 40,
      borderRadius: RADIUS.full,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    dots: {
      position: 'absolute', bottom: 12, alignSelf: 'center',
      flexDirection: 'row', gap: 6,
    },
    dot: {
      width: 6, height: 6, borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: { width: 18, backgroundColor: '#fff' },

    scroll: { flex: 1, marginTop: -32 },

    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: SPACING.base,
      paddingTop: SPACING.lg,
      gap: SPACING.md,
    },
    pitchName: {
      fontSize: FONTS['2xl'],
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    pitchLoc: {
      fontSize: FONTS.sm,
      color: colors.textMuted,
      flex: 1,
    },
    price: {
      fontSize: FONTS.xl,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.primary,
    },
    perHr: { fontSize: FONTS.xs, color: colors.textMuted },

    badgeRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.base,
      marginTop: SPACING.md,
      flexWrap: 'wrap',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeText: {
      fontSize: FONTS.xs,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
    },
    badgeMeta: {
      fontSize: FONTS.xs,
      color: colors.textMuted,
      fontWeight: FONT_WEIGHT.medium,
    },

    section: { marginTop: SPACING.xl },
    sectionTitle: {
      fontSize: FONTS.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      paddingHorizontal: SPACING.base,
      marginBottom: SPACING.md,
    },
    bodyText: {
      fontSize: FONTS.sm,
      color: colors.textSecondary,
      lineHeight: 22,
      paddingHorizontal: SPACING.base,
    },

    amenityGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.base,
    },
    amenityChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.full,
      paddingHorizontal: SPACING.md,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    amenityIcon: { fontSize: 14 },
    amenityName: {
      fontSize: FONTS.xs,
      color: colors.textPrimary,
      fontWeight: FONT_WEIGHT.semiBold,
    },

    dateChip: {
      width: 64,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 4,
    },
    dateChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    dateChipLabel: {
      fontSize: FONTS.xs,
      color: colors.textMuted,
      fontWeight: FONT_WEIGHT.semiBold,
    },
    dateChipLabelActive: { color: 'rgba(255,255,255,0.85)' },
    dateChipDay: {
      fontSize: FONTS.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
    },
    dateChipDayActive: { color: '#fff' },

    slotsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.base,
    },
    slotChip: {
      width: (SCREEN_W - SPACING.base * 2 - SPACING.sm * 3) / 4,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    slotChipAvailable: {},
    slotChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    slotChipBooked: {
      backgroundColor: 'transparent',
      borderColor: colors.borderLight,
      opacity: 0.4,
    },
    slotText: {
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.semiBold,
      color: colors.textPrimary,
    },
    slotTextSelected: { color: '#fff' },
    slotTextBooked: { color: colors.textMuted, textDecorationLine: 'line-through' },

    slotsHint: {
      paddingHorizontal: SPACING.base,
      marginTop: SPACING.sm,
      color: colors.textMuted,
      fontSize: FONTS.xs,
      lineHeight: 16,
    },

    emptySlots: {
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.xl,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: FONTS.sm,
    },

    ctaWrap: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    ctaInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.md,
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    ctaLabel: {
      fontSize: FONTS.xs,
      color: colors.textMuted,
      fontWeight: FONT_WEIGHT.semiBold,
    },
    ctaPrice: {
      fontSize: FONTS.md,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      marginTop: 2,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    ctaBtnDisabled: { opacity: 0.5 },
    ctaBtnText: {
      color: '#fff',
      fontWeight: FONT_WEIGHT.bold,
      fontSize: FONTS.sm,
    },
  });
}
