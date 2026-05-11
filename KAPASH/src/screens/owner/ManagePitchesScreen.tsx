import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { useOwnerPitches } from '../../hooks/useData';
import { PITCHES } from '../../services/api';

interface Props { navigation: any; }

export default function ManagePitchesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data: pitches, isLoading, error, refetch } = useOwnerPitches();
  const list: any[] = Array.isArray(pitches) ? pitches : [];

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (pitch: any) => {
    Alert.alert(
      'Delete pitch?',
      `"${pitch.name}" will be removed from your listings. Players won't be able to book it. Past bookings stay intact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(pitch.id);
            try {
              await PITCHES.delete(pitch.id);
              await refetch();
            } catch (err: any) {
              Alert.alert('Could not delete', err?.message || 'Something went wrong.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Pitches</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddPitch')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={refetch} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="business-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No pitches yet</Text>
          <Text style={styles.emptyText}>Add your first pitch to start receiving bookings.</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('AddPitch')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Add Pitch</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: SPACING.base, paddingBottom: SPACING['3xl'], gap: SPACING.md }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
        >
          {list.map(p => (
            <PitchRow
              key={p.id}
              pitch={p}
              colors={colors}
              styles={styles}
              deleting={deletingId === p.id}
              onPress={() => navigation.navigate('PitchDetails', { pitchId: p.id })}
              onSchedulePress={() => navigation.navigate('Main', { screen: 'Schedule' })}
              onEditPress={() => navigation.navigate('EditPitch', { pitchId: p.id })}
              onDeletePress={() => handleDelete(p)}
            />
          ))}

          <TouchableOpacity
            style={styles.addCard}
            onPress={() => navigation.navigate('AddPitch')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addCardText}>Add another pitch</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function PitchRow({
  pitch, colors, styles, deleting, onPress, onSchedulePress, onEditPress, onDeletePress,
}: {
  pitch: any;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  deleting: boolean;
  onPress: () => void;
  onSchedulePress: () => void;
  onEditPress: () => void;
  onDeletePress: () => void;
}) {
  const img = pitch.images?.[0]?.url || 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400';
  const bookingCount = pitch._count?.bookings ?? 0;
  const status = pitch.status;
  const statusColor =
    status === 'ACTIVE'                ? colors.primary :
    status === 'PENDING_VERIFICATION'  ? colors.pending :
                                          colors.textMuted;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardTop} onPress={onPress} activeOpacity={0.92}>
        <Image source={{ uri: img }} style={styles.cardImg} />
        <View style={styles.cardInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.pitchName} numberOfLines={1}>{pitch.name}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {status === 'ACTIVE' ? 'Live' : status === 'PENDING_VERIFICATION' ? 'Pending' : status}
              </Text>
            </View>
          </View>
          <Text style={styles.pitchAddr} numberOfLines={1}>{pitch.address}</Text>
          <View style={styles.cardMetaRow}>
            <Text style={styles.cardMeta}>KSh {pitch.pricePerHour?.toLocaleString()}/hr</Text>
            <Text style={styles.cardMetaDot}>·</Text>
            <Text style={styles.cardMeta}>{bookingCount} booking{bookingCount === 1 ? '' : 's'}</Text>
            {pitch.avgRating ? (
              <>
                <Text style={styles.cardMetaDot}>·</Text>
                <Ionicons name="star" size={11} color="#FBBF24" />
                <Text style={styles.cardMeta}>{Number(pitch.avgRating).toFixed(1)}</Text>
              </>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onSchedulePress} activeOpacity={0.85}>
          <Ionicons name="calendar-outline" size={14} color={colors.textPrimary} />
          <Text style={styles.actionText}>Schedule</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={onEditPress} activeOpacity={0.85}>
          <Ionicons name="create-outline" size={14} color={colors.textPrimary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onDeletePress}
          disabled={deleting}
          activeOpacity={0.85}
        >
          {deleting ? (
            <ActivityIndicator color={colors.error} size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    addBtn: {
      width: 40, height: 40,
      borderRadius: RADIUS.full,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
    errorText: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
    emptyIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.primaryMuted,
      justifyContent: 'center', alignItems: 'center',
    },
    emptyTitle: { color: colors.textPrimary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold },
    emptyText: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      marginTop: SPACING.sm,
    },
    primaryBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.sm },

    card: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden',
    },
    cardTop: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
    cardImg: { width: 90, height: 90, borderRadius: RADIUS.md },
    cardInfo: { flex: 1, gap: 4 },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    pitchName: { flex: 1, fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    pitchAddr: { fontSize: FONTS.xs, color: colors.textMuted },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.xs,
      marginTop: 4,
      flexWrap: 'wrap',
    },
    cardMeta: { fontSize: FONTS.xs, color: colors.textSecondary, fontWeight: FONT_WEIGHT.medium },
    cardMetaDot: { fontSize: FONTS.xs, color: colors.textMuted },

    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      borderRadius: RADIUS.full,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: FONT_WEIGHT.bold },

    cardActions: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: SPACING.md,
    },
    actionDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    actionText: { fontSize: FONTS.xs, color: colors.textPrimary, fontWeight: FONT_WEIGHT.semiBold },

    addCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: RADIUS.lg,
    },
    addCardText: { color: colors.primary, fontWeight: FONT_WEIGHT.semiBold, fontSize: FONTS.sm },
  });
}
