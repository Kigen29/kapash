/**
 * HomeScreen - Connected to real backend
 * Place at: src/screens/user/HomeScreen.tsx
 */

import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { useFeaturedPitches, usePitches } from '../../hooks/useData';

const PITCH_TYPES = ['All', 'Football', 'Basketball', 'Tennis', 'Futsal', 'Rugby'];

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const featured = useFeaturedPitches();
  const pitches = usePitches({
    search: search || undefined,
    pitchType: activeType === 'All' ? undefined : activeType.toUpperCase(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([featured.refetch(), pitches.refetch()]);
    setRefreshing(false);
  }, [featured.refetch, pitches.refetch]);

  const pitchList: any[] = pitches.data?.pitches || [];
  const featuredList: any[] = featured.data || [];

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Good {getTimeGreeting()} 👋</Text>
            <Text style={s.userName}>{user?.name?.split(' ')[0] || 'Player'}</Text>
          </View>
          <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate('Profile')}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={s.avatarImg} />
            ) : (
              <LinearGradient colors={['#22C55E', '#16A34A']} style={s.avatarGrad}>
                <Text style={s.avatarText}>{(user?.name || 'U')[0].toUpperCase()}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search pitches..."
              placeholderTextColor="#6B7280"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={s.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => navigation.navigate('Filters')}>
            <Text style={s.filterIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {PITCH_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              style={[s.chip, activeType === type && s.chipActive]}
              onPress={() => setActiveType(type)}
            >
              <Text style={[s.chipText, activeType === type && s.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22C55E" />}
      >
        {/* Featured */}
        {!search && featuredList.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>⚡ Featured Pitches</Text>
              <TouchableOpacity><Text style={s.seeAll}>See all</Text></TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={featuredList}
              keyExtractor={i => i.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => <FeaturedCard pitch={item} onPress={() => navigation.navigate('PitchDetails', { pitchId: item.id })} />}
            />
          </View>
        )}

        {/* Nearby / All pitches */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              {search ? `Results for "${search}"` : '📍 Pitches Near You'}
            </Text>
          </View>

          {pitches.isLoading ? (
            <ActivityIndicator color="#22C55E" style={{ marginTop: 40 }} />
          ) : pitches.error ? (
            <ErrorState message={pitches.error} onRetry={pitches.refetch} />
          ) : pitchList.length === 0 ? (
            <EmptyState search={search} />
          ) : (
            pitchList.map(pitch => (
              <PitchCard
                key={pitch.id}
                pitch={pitch}
                onPress={() => navigation.navigate('PitchDetails', { pitchId: pitch.id })}
              />
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────
function FeaturedCard({ pitch, onPress }: { pitch: any; onPress: () => void }) {
  const img = pitch.images?.[0]?.url || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=500';
  return (
    <TouchableOpacity style={s.featCard} onPress={onPress} activeOpacity={0.88}>
      <Image source={{ uri: img }} style={s.featImg} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={s.featGrad} />
      <View style={s.featInfo}>
        <Text style={s.featName} numberOfLines={1}>{pitch.name}</Text>
        <Text style={s.featLocation} numberOfLines={1}>📍 {pitch.location}</Text>
        <View style={s.featBottom}>
          <Text style={s.featPrice}>KSh {pitch.pricePerHour?.toLocaleString()}<Text style={s.perHr}>/hr</Text></Text>
          {pitch.instantBook && (
            <View style={s.instantBadge}><Text style={s.instantText}>⚡ Instant</Text></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PitchCard({ pitch, onPress }: { pitch: any; onPress: () => void }) {
  const img = pitch.images?.[0]?.url || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400';
  return (
    <TouchableOpacity style={s.pitchCard} onPress={onPress} activeOpacity={0.88}>
      <Image source={{ uri: img }} style={s.pitchImg} />
      <View style={s.pitchInfo}>
        <Text style={s.pitchName} numberOfLines={1}>{pitch.name}</Text>
        <Text style={s.pitchLoc} numberOfLines={1}>📍 {pitch.location}</Text>
        <View style={s.pitchMeta}>
          {pitch.rating ? <Text style={s.rating}>⭐ {pitch.rating.toFixed(1)}</Text> : null}
          <Text style={s.pitchType}>{pitch.pitchType}</Text>
        </View>
        <View style={s.pitchBottom}>
          <Text style={s.pitchPrice}>KSh {pitch.pricePerHour?.toLocaleString()}<Text style={s.perHr}>/hr</Text></Text>
          {pitch.instantBook && (
            <View style={s.instantBadge}><Text style={s.instantText}>⚡ Instant Book</Text></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={s.centerBox}>
      <Text style={{ fontSize: 40 }}>😕</Text>
      <Text style={s.errorMsg}>{message}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
        <Text style={s.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <View style={s.centerBox}>
      <Text style={{ fontSize: 48 }}>🏟️</Text>
      <Text style={s.emptyText}>
        {search ? `No pitches found for "${search}"` : 'No pitches available near you'}
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1923' },
  safeTop: { backgroundColor: '#0F1923' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: '#9CA3AF' },
  userName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  avatarImg: { width: 40, height: 40 },
  avatarGrad: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2535',
    borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  clearText: { color: '#6B7280', fontSize: 14 },
  filterBtn: {
    width: 44, height: 44, backgroundColor: '#1A2535',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  filterIcon: { fontSize: 18 },

  chips: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8,
    backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#374151',
  },
  chipActive: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22C55E' },
  chipText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#22C55E' },

  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  seeAll: { color: '#22C55E', fontSize: 13, fontWeight: '600' },

  // Featured cards
  featCard: { width: 220, borderRadius: 16, overflow: 'hidden', marginRight: 12, height: 160 },
  featImg: { width: '100%', height: '100%', position: 'absolute' },
  featGrad: { ...StyleSheet.absoluteFillObject },
  featInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  featName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  featLocation: { fontSize: 11, color: '#D1D5DB', marginTop: 2 },
  featBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  featPrice: { color: '#22C55E', fontWeight: '700', fontSize: 14 },

  // Pitch list cards
  pitchCard: {
    flexDirection: 'row', backgroundColor: '#1A2535', borderRadius: 16,
    overflow: 'hidden', marginHorizontal: 16, marginBottom: 12,
  },
  pitchImg: { width: 100, height: 110 },
  pitchInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  pitchName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  pitchLoc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  pitchMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rating: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  pitchType: {
    fontSize: 11, color: '#22C55E', backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontWeight: '600',
  },
  pitchBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  pitchPrice: { color: '#22C55E', fontWeight: '700', fontSize: 14 },
  perHr: { color: '#9CA3AF', fontWeight: '400', fontSize: 11 },
  instantBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  instantText: { color: '#22C55E', fontSize: 11, fontWeight: '600' },

  // States
  centerBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  errorMsg: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 12 },
  retryBtn: { marginTop: 16, backgroundColor: '#22C55E', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
});