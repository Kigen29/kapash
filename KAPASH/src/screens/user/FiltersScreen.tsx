import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { usePitches } from '../../hooks/useData';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type PitchTypeKey = 'ASTRO_TURF' | 'NATURAL_GRASS' | 'CONCRETE' | 'HYBRID';

const PITCH_TYPES: { value: PitchTypeKey; label: string }[] = [
  { value: 'ASTRO_TURF',    label: 'Astro Turf' },
  { value: 'NATURAL_GRASS', label: 'Natural Grass' },
  { value: 'CONCRETE',      label: 'Concrete' },
  { value: 'HYBRID',        label: 'Hybrid' },
];

const AMENITIES_LIST: { name: string; icon: IoniconName }[] = [
  { name: 'Floodlights',     icon: 'sunny-outline' },
  { name: 'Showers',         icon: 'water-outline' },
  { name: 'Changing Rooms',  icon: 'shirt-outline' },
  { name: 'Parking',         icon: 'car-outline' },
];

interface Props { navigation: any; }

export default function FiltersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [showFilters, setShowFilters] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<PitchTypeKey | null>(null);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce text input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(inputValue), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputValue]);

  const pitches = usePitches({
    search: debouncedSearch || undefined,
    pitchType: selectedType || undefined,
    maxPrice: priceMax || undefined,
    amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
  });

  const results: any[] = Array.isArray(pitches.data?.pitches) ? pitches.data.pitches : [];

  const toggleAmenity = (n: string) => {
    setSelectedAmenities(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);
  };
  const reset = () => {
    setInputValue('');
    setDebouncedSearch('');
    setSelectedType(null);
    setSelectedAmenities([]);
    setPriceMax(null);
  };

  const activeCount = (selectedType ? 1 : 0) + selectedAmenities.length + (priceMax ? 1 : 0);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search</Text>
          <TouchableOpacity onPress={reset} hitSlop={8} disabled={activeCount === 0 && !inputValue}>
            <Text style={[styles.resetText, activeCount === 0 && !inputValue && { opacity: 0.4 }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location or pitch name..."
              placeholderTextColor={colors.textMuted}
              value={inputValue}
              onChangeText={setInputValue}
              returnKeyType="search"
            />
            {inputValue.length > 0 && (
              <TouchableOpacity onPress={() => setInputValue('')} hitSlop={6}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
            onPress={() => setShowFilters(v => !v)}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={18} color={showFilters ? colors.primary : colors.textPrimary} />
            {activeCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}
        keyboardShouldPersistTaps="handled"
      >
        {showFilters && (
          <View style={styles.filterPanel}>
            {/* Surface type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Surface</Text>
              <View style={styles.chipGrid}>
                {PITCH_TYPES.map(t => {
                  const active = selectedType === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => setSelectedType(active ? null : t.value)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t.label}</Text>
                      {active && <Ionicons name="checkmark" size={12} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Max price */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Max Price</Text>
                {priceMax && <Text style={styles.priceLabel}>KES {priceMax.toLocaleString()} / hr</Text>}
              </View>
              <View style={styles.chipGrid}>
                {[1000, 2000, 3500, 5000, 10000].map(p => {
                  const active = priceMax === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => setPriceMax(active ? null : p)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        ≤ {p.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Amenities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.chipGrid}>
                {AMENITIES_LIST.map(a => {
                  const active = selectedAmenities.includes(a.name);
                  return (
                    <TouchableOpacity
                      key={a.name}
                      style={[styles.amenityChip, active && styles.amenityChipActive]}
                      onPress={() => toggleAmenity(a.name)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name={a.icon} size={14} color={active ? colors.primary : colors.textMuted} />
                      <Text style={[styles.amenityName, active && styles.amenityNameActive]}>{a.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Results */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {pitches.isLoading ? 'Searching…' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
          </Text>
          {(debouncedSearch || activeCount > 0) && (
            <Text style={styles.resultsMeta}>
              {[
                debouncedSearch ? `"${debouncedSearch}"` : null,
                selectedType ? PITCH_TYPES.find(t => t.value === selectedType)?.label : null,
              ].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>

        {pitches.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING.xl }} />
        ) : pitches.error ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>{pitches.error}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={pitches.refetch} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="search-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptyText}>
              {debouncedSearch ? `No pitches found for "${debouncedSearch}".` : 'Try widening your filters.'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: SPACING.md, paddingHorizontal: SPACING.base }}>
            {results.map((pitch: any) => (
              <ResultCard
                key={pitch.id}
                pitch={pitch}
                colors={colors}
                styles={styles}
                onPress={() => navigation.navigate('PitchDetails', { pitchId: pitch.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ResultCard({
  pitch, colors, styles, onPress,
}: {
  pitch: any;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}) {
  const img = pitch.images?.[0]?.url || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400';
  const rating = pitch.avgRating ?? pitch.rating;
  const location = pitch.location || pitch.address || pitch.city;
  const type = pitch.pitchType || pitch.type;

  return (
    <TouchableOpacity style={styles.resultCard} onPress={onPress} activeOpacity={0.92}>
      <Image source={{ uri: img }} style={styles.resultImg} />
      <View style={styles.resultInfo}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACING.sm }}>
          <Text style={styles.resultName} numberOfLines={1}>{pitch.name}</Text>
          {rating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="star" size={11} color="#FBBF24" />
              <Text style={styles.resultRating}>{Number(rating).toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        {location ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={styles.resultLoc} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
        <View style={styles.resultBottom}>
          {type && <Text style={styles.resultType}>{formatType(type)}</Text>}
          <Text style={styles.resultPrice}>
            KSh {pitch.pricePerHour?.toLocaleString()}<Text style={styles.resultPerHr}> /hr</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatType(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSafe: {
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    headerTitle: {
      fontSize: FONTS['2xl'],
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      letterSpacing: -0.3,
    },
    resetText: { fontSize: FONTS.sm, color: colors.primary, fontWeight: FONT_WEIGHT.semiBold },

    searchWrap: {
      flexDirection: 'row',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.base,
      paddingBottom: SPACING.md,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      height: 48,
      gap: SPACING.sm,
      borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: FONTS.base, color: colors.textPrimary },
    filterToggle: {
      width: 48, height: 48,
      borderRadius: RADIUS.md,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    filterToggleActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    filterBadge: {
      position: 'absolute', top: -4, right: -4,
      minWidth: 16, height: 16, borderRadius: 8,
      paddingHorizontal: 4,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: colors.background,
    },
    filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: FONT_WEIGHT.bold, lineHeight: 11 },

    filterPanel: {
      paddingHorizontal: SPACING.base,
      paddingTop: SPACING.md,
      gap: SPACING.lg,
    },
    section: { gap: SPACING.sm },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    priceLabel: { fontSize: FONTS.xs, color: colors.primary, fontWeight: FONT_WEIGHT.semiBold },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    typeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: SPACING.md, paddingVertical: 8,
      borderRadius: RADIUS.full,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    typeChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    typeChipText: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
    typeChipTextActive: { color: colors.primary, fontWeight: FONT_WEIGHT.semiBold },

    amenityChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: SPACING.md, paddingVertical: 8,
      borderRadius: RADIUS.full,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    amenityChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    amenityName: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.medium, color: colors.textSecondary },
    amenityNameActive: { color: colors.primary, fontWeight: FONT_WEIGHT.semiBold },

    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingHorizontal: SPACING.base,
      marginTop: SPACING.lg,
      marginBottom: SPACING.md,
      gap: SPACING.sm,
    },
    resultsTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    resultsMeta: {
      flex: 1, textAlign: 'right',
      fontSize: FONTS.xs, color: colors.textMuted, fontWeight: FONT_WEIGHT.medium,
    },

    resultCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      borderWidth: 1, borderColor: colors.border,
    },
    resultImg: { width: 110, height: 120 },
    resultInfo: { flex: 1, padding: SPACING.md, justifyContent: 'space-between' },
    resultName: { flex: 1, fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    resultRating: { fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    resultLoc: { fontSize: FONTS.xs, color: colors.textMuted, flex: 1 },
    resultBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    resultType: {
      fontSize: FONTS.xs,
      color: colors.primary,
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
      fontWeight: FONT_WEIGHT.semiBold,
      overflow: 'hidden',
    },
    resultPrice: { color: colors.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },
    resultPerHr: { color: colors.textMuted, fontWeight: FONT_WEIGHT.regular, fontSize: FONTS.xs },

    empty: { alignItems: 'center', paddingVertical: SPACING['2xl'], paddingHorizontal: SPACING.xl, gap: SPACING.sm },
    emptyIconWrap: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: colors.primaryMuted,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    emptyTitle: { color: colors.textPrimary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold },
    emptyText: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
    primaryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      marginTop: SPACING.sm,
    },
    primaryBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },
  });
}
