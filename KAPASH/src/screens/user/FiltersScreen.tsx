import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PITCH_TYPES = ['Astro Turf', 'Natural Grass', 'Concrete', 'Hybrid'];
const PITCH_SIZES = ['5-a-side', '7-a-side', '11-a-side'];
const AMENITIES_LIST: { id: string; name: string; icon: IoniconName }[] = [
  { id: 'floodlights', name: 'Floodlights',     icon: 'sunny-outline' },
  { id: 'showers',     name: 'Showers',         icon: 'water-outline' },
  { id: 'changing',    name: 'Changing Rooms',  icon: 'shirt-outline' },
  { id: 'parking',     name: 'Parking',         icon: 'car-outline' },
];

interface Props { navigation: any; }

export default function FiltersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [searchText, setSearchText] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState(500);
  const [priceMax, setPriceMax] = useState(5000);

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };
  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const reset = () => {
    setSelectedTypes([]);
    setSelectedSize('');
    setSelectedAmenities([]);
    setSearchText('');
  };

  const activeCount =
    selectedTypes.length + selectedAmenities.length + (selectedSize ? 1 : 0);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={reset} hitSlop={8}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location or pitch name..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} hitSlop={6}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: SPACING.base, gap: SPACING.base, paddingBottom: 120 }}
      >
        {/* Pitch Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pitch Type</Text>
          <View style={styles.chipGrid}>
            {PITCH_TYPES.map(type => {
              const active = selectedTypes.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => toggleType(type)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{type}</Text>
                  {active && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Price Range</Text>
            <Text style={styles.priceRangeLabel}>
              KES {priceMin.toLocaleString()} – {priceMax.toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceCard}>
            <View style={styles.priceInputRow}>
              <View>
                <Text style={styles.priceInputLabel}>Min</Text>
                <Text style={styles.priceInputValue}>KES {priceMin.toLocaleString()}</Text>
              </View>
              <View style={styles.priceDashLine} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.priceInputLabel}>Max</Text>
                <Text style={styles.priceInputValue}>KES {priceMax.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.sliderTrack}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.sliderFill}
              />
              <View style={[styles.sliderThumb, { left: '5%' }]} />
              <View style={[styles.sliderThumb, { left: '50%' }]} />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>KES 500</Text>
              <Text style={styles.sliderLabel}>KES 10,000</Text>
            </View>
          </View>
        </View>

        {/* Pitch Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pitch Size</Text>
          <View style={styles.sizeGrid}>
            {PITCH_SIZES.map(size => {
              const active = selectedSize === size;
              return (
                <TouchableOpacity
                  key={size}
                  style={[styles.sizeCard, active && styles.sizeCardActive]}
                  onPress={() => setSelectedSize(active ? '' : size)}
                  activeOpacity={0.85}
                >
                  {active && (
                    <View style={styles.sizeCheckIcon}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  )}
                  <View style={styles.sizeIconContainer}>
                    <Ionicons name="football-outline" size={20} color={active ? colors.primary : colors.textMuted} />
                  </View>
                  <Text style={[styles.sizeLabel, active && styles.sizeLabelActive]}>{size}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={{ gap: 0 }}>
            {AMENITIES_LIST.map((amenity, i) => {
              const active = selectedAmenities.includes(amenity.id);
              return (
                <View key={amenity.id} style={[styles.amenityRow, i < AMENITIES_LIST.length - 1 && styles.amenityRowBorder]}>
                  <View style={styles.amenityLeft}>
                    <View style={styles.amenityIconBox}>
                      <Ionicons name={amenity.icon} size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.amenityName}>{amenity.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.toggle, active && styles.toggleActive]}
                    onPress={() => toggleAmenity(amenity.id)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.toggleThumb, active && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.9}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.applyGradient}
          >
            <Text style={styles.applyBtnText}>Show Results</Text>
            {activeCount > 0 && (
              <View style={styles.applyBadge}>
                <Text style={styles.applyBadgeText}>{activeCount}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerSafe: { backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.md,
    },
    iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    resetText: { fontSize: FONTS.sm, color: colors.primary, fontWeight: FONT_WEIGHT.semiBold },

    searchWrap: {
      paddingHorizontal: SPACING.base,
      paddingBottom: SPACING.md,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      height: 48,
      gap: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: FONTS.base, color: colors.textPrimary },

    section: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      fontSize: FONTS.md,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      marginBottom: SPACING.md,
    },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.base,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    typeChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    typeChipText: {
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.textSecondary,
    },
    typeChipTextActive: { color: colors.primary, fontWeight: FONT_WEIGHT.semiBold },

    priceRangeLabel: {
      fontSize: FONTS.sm,
      color: colors.primary,
      fontWeight: FONT_WEIGHT.semiBold,
      marginBottom: SPACING.md,
    },
    priceCard: {
      backgroundColor: colors.background,
      borderRadius: RADIUS.md,
      padding: SPACING.base,
      borderWidth: 1,
      borderColor: colors.border,
    },
    priceInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: SPACING.lg,
      gap: SPACING.md,
    },
    priceInputLabel: { fontSize: FONTS.xs, color: colors.textMuted, marginBottom: 4 },
    priceInputValue: {
      fontSize: FONTS.lg,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
    },
    priceDashLine: { width: 24, height: 1.5, backgroundColor: colors.border },

    sliderTrack: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: RADIUS.full,
      position: 'relative',
      marginBottom: SPACING.md,
    },
    sliderFill: {
      position: 'absolute',
      left: '5%',
      width: '50%',
      height: '100%',
      borderRadius: RADIUS.full,
    },
    sliderThumb: {
      position: 'absolute',
      top: -10,
      width: 24, height: 24, borderRadius: RADIUS.full,
      backgroundColor: colors.surface,
      borderWidth: 2.5,
      borderColor: colors.primary,
    },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    sliderLabel: { fontSize: FONTS.xs, color: colors.textMuted },

    sizeGrid: { flexDirection: 'row', gap: SPACING.sm },
    sizeCard: {
      flex: 1,
      height: 96,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      backgroundColor: colors.background,
      position: 'relative',
    },
    sizeCardActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    sizeCheckIcon: {
      position: 'absolute', top: 6, right: 6,
      width: 18, height: 18, borderRadius: RADIUS.full,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    sizeIconContainer: {
      width: 40, height: 40, borderRadius: RADIUS.full,
      backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    sizeLabel: {
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.semiBold,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    sizeLabelActive: { color: colors.primary },

    amenityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACING.md,
    },
    amenityRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    amenityLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      flex: 1,
    },
    amenityIconBox: {
      width: 40, height: 40, borderRadius: RADIUS.sm,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
    },
    amenityName: {
      fontSize: FONTS.sm,
      fontWeight: FONT_WEIGHT.medium,
      color: colors.textPrimary,
    },
    toggle: {
      width: 46, height: 26, borderRadius: RADIUS.full,
      backgroundColor: colors.border,
      padding: 3,
      justifyContent: 'center',
    },
    toggleActive: { backgroundColor: colors.primary },
    toggleThumb: {
      width: 20, height: 20, borderRadius: RADIUS.full,
      backgroundColor: '#fff',
    },
    toggleThumbActive: { alignSelf: 'flex-end' },

    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: colors.surface,
      paddingHorizontal: SPACING.base,
      paddingTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    applyGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      height: 52,
      borderRadius: RADIUS.md,
    },
    applyBtnText: {
      fontSize: FONTS.base,
      fontWeight: FONT_WEIGHT.bold,
      color: '#fff',
    },
    applyBadge: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: RADIUS.full,
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyBadgeText: {
      color: '#fff',
      fontSize: FONTS.xs,
      fontWeight: FONT_WEIGHT.bold,
    },
  });
}
