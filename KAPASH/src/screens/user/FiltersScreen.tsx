import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, FONT_WEIGHT, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const { width } = Dimensions.get('window');

const PITCH_TYPES = ['Astro Turf', 'Natural Grass', '5-a-side', '7-a-side'];
const AMENITIES_LIST = [
  { id: 'floodlights', name: 'Floodlights', icon: '💡' },
  { id: 'showers', name: 'Showers', icon: '🚿' },
  { id: 'changing', name: 'Changing Rooms', icon: '👕' },
  { id: 'parking', name: 'Parking', icon: '🅿️' },
];
const PITCH_SIZES = ['5-a-side', '7-a-side', '11-a-side'];

interface Props {
  navigation: any;
}

export default function FiltersScreen({ navigation }: Props) {
  const [searchText, setSearchText] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Astro Turf']);
  const [selectedSize, setSelectedSize] = useState('7-a-side');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['floodlights']);
  const [priceMin, setPriceMin] = useState(500);
  const [priceMax, setPriceMax] = useState(5000);
  const [priceValue, setPriceValue] = useState(2500);

  const toggleType = (t: string) => {
    setSelectedTypes(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <View style={styles.container}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity onPress={() => {
          setSelectedTypes([]);
          setSelectedSize('');
          setSelectedAmenities([]);
        }}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search ─────────────────────────────────────── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search location or pitch name..."
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Pitch Type ─────────────────────────────────── */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Pitch Type</Text>
          <View style={styles.typeGrid}>
            {PITCH_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  selectedTypes.includes(type) && styles.typeChipActive,
                ]}
                onPress={() => toggleType(type)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    selectedTypes.includes(type) && styles.typeChipTextActive,
                  ]}
                >
                  {type}
                </Text>
                {selectedTypes.includes(type) && (
                  <Text style={styles.typeChipCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Price Range ────────────────────────────────── */}
        <View style={styles.filterSection}>
          <View style={styles.filterSectionHeader}>
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <Text style={styles.priceRangeLabel}>
              KES {priceMin.toLocaleString()} – {priceMax.toLocaleString()}
            </Text>
          </View>
          <View style={styles.priceCard}>
            <View style={styles.priceInputRow}>
              <View style={styles.priceInputBlock}>
                <Text style={styles.priceInputLabel}>Min</Text>
                <Text style={styles.priceInputValue}>
                  KES {priceMin.toLocaleString()}
                </Text>
              </View>
              <View style={styles.priceDash}>
                <View style={styles.priceDashLine} />
              </View>
              <View style={[styles.priceInputBlock, { alignItems: 'flex-end' }]}>
                <Text style={styles.priceInputLabel}>Max</Text>
                <Text style={styles.priceInputValue}>
                  KES {priceMax.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Slider visual */}
            <View style={styles.sliderTrack}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sliderFill}
              />
              <View style={[styles.sliderThumb, { left: '10%' }]} />
              <View style={[styles.sliderThumb, styles.sliderThumbRight, { left: '60%' }]} />
            </View>

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>KES 500</Text>
              <Text style={styles.sliderLabel}>KES 10,000</Text>
            </View>
          </View>
        </View>

        {/* ── Pitch Size ─────────────────────────────────── */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Pitch Size</Text>
          <View style={styles.sizeGrid}>
            {PITCH_SIZES.map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeCard,
                  selectedSize === size && styles.sizeCardActive,
                ]}
                onPress={() => setSelectedSize(size)}
              >
                {selectedSize === size && (
                  <View style={styles.sizeCheckIcon}>
                    <Text style={styles.sizeCheckText}>✓</Text>
                  </View>
                )}
                <View style={styles.sizeIconContainer}>
                  <Text style={styles.sizeEmoji}>⚽</Text>
                </View>
                <Text style={[styles.sizeLabel, selectedSize === size && styles.sizeLabelActive]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Amenities ──────────────────────────────────── */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGroup}>
            {AMENITIES_LIST.map(amenity => (
              <View key={amenity.id} style={styles.amenityRow}>
                <View style={styles.amenityLeft}>
                  <View style={styles.amenityIconBox}>
                    <Text style={styles.amenityIcon}>{amenity.icon}</Text>
                  </View>
                  <Text style={styles.amenityName}>{amenity.name}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    selectedAmenities.includes(amenity.id) && styles.toggleActive,
                  ]}
                  onPress={() => toggleAmenity(amenity.id)}
                >
                  <View style={[
                    styles.toggleThumb,
                    selectedAmenities.includes(amenity.id) && styles.toggleThumbActive,
                  ]} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: SPACING['5xl'] }} />
      </ScrollView>

      {/* ── Sticky Footer CTA ──────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyBtn} onPress={() => navigation.goBack()}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyGradient}
          >
            <Text style={styles.applyBtnText}>Show Results</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: 56,
    paddingBottom: SPACING.base,
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: FONTS.xl,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  resetText: {
    fontSize: FONTS.base,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semiBold,
  },

  searchContainer: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.base,
    height: 50,
    gap: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  searchIcon: { fontSize: 18 },
  searchInput: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.base, gap: SPACING.base },

  filterSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    ...SHADOWS.xs,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  filterSectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
    marginBottom: SPACING.md,
  },

  // Type chips
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  typeChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
  },
  typeChipText: {
    fontSize: FONTS.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.primaryDark,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  typeChipCheck: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Price
  priceRangeLabel: {
    fontSize: FONTS.sm,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semiBold,
    marginBottom: SPACING.md,
  },
  priceCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  priceInputBlock: {},
  priceInputLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  priceInputValue: {
    fontSize: FONTS.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  priceDash: { alignItems: 'center', justifyContent: 'center' },
  priceDashLine: {
    width: 24,
    height: 1.5,
    backgroundColor: COLORS.border,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    position: 'relative',
    marginBottom: SPACING.md,
  },
  sliderFill: {
    position: 'absolute',
    left: '10%',
    width: '50%',
    height: '100%',
    borderRadius: RADIUS.full,
  },
  sliderThumb: {
    position: 'absolute',
    top: -10,
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    ...SHADOWS.green,
  },
  sliderThumbRight: {},
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
  },

  // Pitch size
  sizeGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sizeCard: {
    flex: 1,
    height: 96,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    position: 'relative',
  },
  sizeCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
  },
  sizeCheckIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeCheckText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.bold,
  },
  sizeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeEmoji: { fontSize: 20 },
  sizeLabel: {
    fontSize: FONTS.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sizeLabelActive: { color: COLORS.primaryDark },

  // Amenities
  amenitiesGroup: { gap: SPACING.xs },
  amenityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  amenityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  amenityIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityIcon: { fontSize: 20 },
  amenityName: {
    fontSize: FONTS.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    padding: 3,
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },

  // Footer
  footer: {
    padding: SPACING.base,
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.lg,
  },
  applyBtn: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.green,
  },
  applyGradient: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: FONTS.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    letterSpacing: 0.2,
  },
});