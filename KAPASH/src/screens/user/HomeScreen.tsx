/**
 * HomeScreen - Pitch Discovery Home
 * Place at: src/screens/user/HomeScreen.tsx
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useFeaturedPitches, useNotifications, usePitches } from '../../hooks/useData';
import { useUserLocation } from '../../hooks/useUserLocation';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

const PITCH_TYPES = ['All', 'Football', 'Basketball', 'Tennis', 'Futsal', 'Rugby'];

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(inputValue), 500);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [inputValue]);

  const { coords: userCoords } = useUserLocation();

  const featured = useFeaturedPitches();
  const pitches = usePitches({
    search: debouncedSearch || undefined,
    pitchType: activeType === 'All' ? undefined : activeType.toUpperCase(),
    latitude: userCoords?.latitude,
    longitude: userCoords?.longitude,
  });
  const { data: notifData } = useNotifications();
  const unreadCount = Array.isArray(notifData) ? notifData.filter((n: any) => !n.isRead).length : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([featured.refetch(), pitches.refetch()]);
    setRefreshing(false);
  }, [featured.refetch, pitches.refetch]);

  const pitchList: any[] = Array.isArray(pitches.data?.pitches) ? pitches.data.pitches : [];
  const featuredList: any[] = Array.isArray(featured.data) ? featured.data : [];

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Good {getTimeGreeting()} 👋</Text>
            <Text style={s.userName}>{user?.name?.split(' ')[0] || 'Player'}</Text>
          </View>
          <TouchableOpacity
            style={s.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={s.notifDot}>
                {unreadCount > 1 && <Text style={s.notifDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>}
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={s.avatarImg} />
            ) : (
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.avatarGrad}>
                <Text style={s.avatarText}>{(user?.name || 'U')[0].toUpperCase()}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: SPACING.sm }} />
            <TextInput
              style={s.searchInput}
              placeholder="Where do you want to play?"
              placeholderTextColor={colors.textMuted}
              value={inputValue}
              onChangeText={setInputValue}
              returnKeyType="search"
            />
            {inputValue.length > 0 && (
              <TouchableOpacity
                onPress={() => { setInputValue(''); setDebouncedSearch(''); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => navigation.navigate('Filters')} activeOpacity={0.85}>
            <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chips}
          contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: SPACING.sm }}
        >
          {PITCH_TYPES.map(type => {
            const active = activeType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setActiveType(type)}
                activeOpacity={0.85}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{type}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Featured */}
        {!inputValue && featuredList.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Featured</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={featuredList}
              keyExtractor={i => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.base, gap: SPACING.md }}
              renderItem={({ item }) => (
                <FeaturedCard
                  pitch={item}
                  styles={s}
                  onPress={() => navigation.navigate('PitchDetails', { pitchId: item.id })}
                />
              )}
            />
          </View>
        )}

        {/* Nearby / All pitches */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              {debouncedSearch ? `Results for "${debouncedSearch}"` : 'Pitches near you'}
            </Text>
            {!debouncedSearch && pitchList.length > 0 && (
              <Text style={s.sectionMeta}>{pitchList.length} {pitchList.length === 1 ? 'pitch' : 'pitches'}</Text>
            )}
          </View>

          {pitches.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: SPACING['3xl'] }} />
          ) : pitches.error ? (
            <ErrorState message={pitches.error} onRetry={pitches.refetch} styles={s} colors={colors} />
          ) : pitchList.length === 0 ? (
            <EmptyState search={debouncedSearch} styles={s} colors={colors} />
          ) : (
            pitchList.map(pitch => (
              <PitchCard
                key={pitch.id}
                pitch={pitch}
                styles={s}
                colors={colors}
                onPress={() => navigation.navigate('PitchDetails', { pitchId: pitch.id })}
              />
            ))
          )}
        </View>

        <View style={{ height: 96 }} />
      </ScrollView>
    </View>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

type Styles = ReturnType<typeof makeStyles>;

function FeaturedCard({ pitch, onPress, styles: s }: { pitch: any; onPress: () => void; styles: Styles }) {
  const img = pitch.images?.[0]?.url || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=600';
  const rating = pitch.avgRating ?? pitch.rating;
  const location = pitch.location || pitch.address || pitch.city;
  return (
    <TouchableOpacity style={s.featCard} onPress={onPress} activeOpacity={0.92}>
      <Image source={{ uri: img }} style={s.featImg} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.55, 1]}
        style={s.featGrad}
      />
      {rating ? (
        <View style={s.featRatingPill}>
          <Text style={s.featRatingTxt}>★ {Number(rating).toFixed(1)}</Text>
        </View>
      ) : null}
      <View style={s.featInfo}>
        <Text style={s.featName} numberOfLines={1}>{pitch.name}</Text>
        {location ? <Text style={s.featLocation} numberOfLines={1}>📍 {location}</Text> : null}
        <View style={s.featBottom}>
          <Text style={s.featPrice}>
            KSh {pitch.pricePerHour?.toLocaleString()}
            <Text style={s.perHr}> /hr</Text>
          </Text>
          {pitch.instantBook && (
            <View style={s.instantBadge}>
              <Text style={s.instantText}>⚡ Instant</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PitchCard({ pitch, onPress, styles: s, colors }: { pitch: any; onPress: () => void; styles: Styles; colors: ColorPalette }) {
  const img = pitch.images?.[0]?.url || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400';
  const rating = pitch.avgRating ?? pitch.rating;
  const location = pitch.location || pitch.address || pitch.city;
  const type = pitch.pitchType || pitch.type;
  return (
    <TouchableOpacity style={s.pitchCard} onPress={onPress} activeOpacity={0.92}>
      <Image source={{ uri: img }} style={s.pitchImg} />
      <View style={s.pitchInfo}>
        <View style={s.pitchTopRow}>
          <Text style={s.pitchName} numberOfLines={1}>{pitch.name}</Text>
          {rating ? <Text style={s.rating}>★ {Number(rating).toFixed(1)}</Text> : null}
        </View>
        {location ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={s.pitchLoc} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
        <View style={s.pitchMeta}>
          {type ? <Text style={s.pitchType}>{formatType(type)}</Text> : null}
          {pitch.distance !== undefined && pitch.distance !== null ? (
            <Text style={s.pitchDistance}>
              {typeof pitch.distance === 'number'
                ? `${pitch.distance.toFixed(1)} km away`
                : pitch.distance}
            </Text>
          ) : null}
        </View>
        <View style={s.pitchBottom}>
          <Text style={s.pitchPrice}>
            KSh {pitch.pricePerHour?.toLocaleString()}
            <Text style={s.perHr}> /hr</Text>
          </Text>
          {pitch.instantBook && (
            <View style={s.instantBadge}>
              <Text style={s.instantText}>⚡ Instant</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ErrorState({ message, onRetry, styles: s, colors }: { message: string; onRetry: () => void; styles: Styles; colors: ColorPalette }) {
  return (
    <View style={s.centerBox}>
      <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
      <Text style={s.errorMsg}>{message}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.85}>
        <Text style={s.retryText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ search, styles: s, colors }: { search: string; styles: Styles; colors: ColorPalette }) {
  return (
    <View style={s.centerBox}>
      <Ionicons name="football-outline" size={52} color={colors.primary} />
      <Text style={s.emptyTitle}>
        {search ? 'Nothing matched' : 'No pitches yet'}
      </Text>
      <Text style={s.emptyText}>
        {search ? `We couldn't find pitches for "${search}". Try a different search.` : 'Check back soon — new pitches are added often.'}
      </Text>
    </View>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatType(type: string) {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ─── STYLES ────────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safeTop: { backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  greeting: { fontSize: FONTS.sm, color: colors.textMuted },
  userName: {
    fontSize: FONTS['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },

  notifBtn: {
    width: 40, height: 40,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  notifIcon: { fontSize: 18 },
  notifDot: {
    position: 'absolute',
    top: 6, right: 6,
    minWidth: 12, height: 12, borderRadius: 6,
    paddingHorizontal: 3,
    backgroundColor: colors.primary,
    borderWidth: 1.5, borderColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  notifDotText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 9,
  },

  avatar: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    overflow: 'hidden',
    borderWidth: 2, borderColor: colors.primary,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: {
    fontSize: FONTS.md,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textInverse,
  },

  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 15, marginRight: SPACING.sm },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONTS.base,
  },
  clearText: { color: colors.textMuted, fontSize: 14, paddingHorizontal: 4 },
  filterBtn: {
    width: 48, height: 48,
    backgroundColor: colors.surface,
    borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  filterIcon: { fontSize: 20 },

  chips: { marginBottom: SPACING.xs, flexGrow: 0 },
  chip: {
    paddingHorizontal: SPACING.base,
    height: 36,
    borderRadius: RADIUS.full,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: FONTS.sm,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  chipTextActive: { color: colors.primary },

  section: { marginTop: SPACING.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: FONTS.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  seeAll: {
    color: colors.primary,
    fontSize: FONTS.sm,
    fontWeight: FONT_WEIGHT.semiBold,
  },

  // Featured cards
  featCard: {
    width: 260,
    height: 180,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  featImg: { width: '100%', height: '100%', position: 'absolute' },
  featGrad: { ...StyleSheet.absoluteFillObject },
  featRatingPill: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  featRatingTxt: {
    color: '#FBBF24',
    fontSize: FONTS.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  featInfo: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: SPACING.md,
  },
  featName: {
    fontSize: FONTS.md,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textInverse,
  },
  featLocation: {
    fontSize: FONTS.xs,
    color: '#D1D5DB',
    marginTop: 3,
  },
  featBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  featPrice: {
    color: colors.primary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONTS.base,
  },

  // Pitch list cards
  pitchCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pitchImg: { width: 116, height: 130 },
  pitchInfo: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  pitchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pitchName: {
    flex: 1,
    fontSize: FONTS.base,
    fontWeight: FONT_WEIGHT.bold,
    color: colors.textPrimary,
  },
  pitchLoc: {
    fontSize: FONTS.xs,
    color: colors.textMuted,
    marginTop: 3,
  },
  pitchMeta: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    alignItems: 'center',
  },
  rating: {
    fontSize: FONTS.xs,
    color: '#FBBF24',
    fontWeight: FONT_WEIGHT.bold,
  },
  pitchType: {
    fontSize: FONTS.xs,
    color: colors.primary,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    fontWeight: FONT_WEIGHT.semiBold,
    overflow: 'hidden',
  },
  pitchDistance: {
    fontSize: FONTS.xs,
    color: colors.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
  pitchBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  pitchPrice: {
    color: colors.primary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONTS.base,
  },
  perHr: {
    color: colors.textMuted,
    fontWeight: FONT_WEIGHT.regular,
    fontSize: FONTS.xs,
  },
  instantBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  instantText: {
    color: colors.primary,
    fontSize: FONTS.xs,
    fontWeight: FONT_WEIGHT.semiBold,
  },

  // States
  centerBox: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: SPACING.xl,
  },
  errorMsg: {
    color: colors.textMuted,
    fontSize: FONTS.sm,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: FONTS.md,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: SPACING.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: FONTS.sm,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: SPACING.base,
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.green,
  },
  retryText: {
    color: '#fff',
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONTS.sm,
  },
  });
}
