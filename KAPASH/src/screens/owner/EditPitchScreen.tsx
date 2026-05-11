import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { usePitch } from '../../hooks/useData';
import { PITCHES } from '../../services/api';

const DAYS: { key: string; label: string }[] = [
  { key: 'monday',    label: 'Mon' },
  { key: 'tuesday',   label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday',  label: 'Thu' },
  { key: 'friday',    label: 'Fri' },
  { key: 'saturday',  label: 'Sat' },
  { key: 'sunday',    label: 'Sun' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

interface Props { route: any; navigation: any; }

export default function EditPitchScreen({ route, navigation }: Props) {
  const { pitchId } = route.params;
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { data: pitch, isLoading, error, refetch } = usePitch(pitchId);

  const [name, setName]     = useState('');
  const [price, setPrice]   = useState('');
  const [openTime, setOpenTime]   = useState('06:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [openDays, setOpenDays]   = useState<string[]>(DAYS.map(d => d.key));
  const [showOpenPicker, setShowOpenPicker]   = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate from fetched pitch
  useEffect(() => {
    if (!pitch) return;
    setName(pitch.name || '');
    setPrice(String(pitch.pricePerHour ?? ''));

    const oh: any = pitch.operatingHours || {};
    // Pick first available day to seed open/close (works for old `mon` and new `monday` keys)
    const sample = DAYS.map(d => oh[d.key] || oh[d.key.slice(0, 3)]).find(Boolean);
    if (sample) {
      setOpenTime(sample.open || '06:00');
      setCloseTime(sample.close || '22:00');
    }
    const days = DAYS.filter(d => oh[d.key] || oh[d.key.slice(0, 3)]).map(d => d.key);
    setOpenDays(days.length > 0 ? days : DAYS.map(d => d.key));
  }, [pitch]);

  const toggleDay = (key: string) => {
    setOpenDays(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  };

  const handleSave = async () => {
    const priceNum = Number(price);
    if (!name.trim() || name.trim().length < 3) return Alert.alert('Required', 'Pitch name must be at least 3 characters.');
    if (isNaN(priceNum) || priceNum < 500 || priceNum > 20000) {
      return Alert.alert('Invalid price', 'Price must be between KSh 500 and KSh 20,000 per hour.');
    }
    if (openDays.length === 0) return Alert.alert('Required', 'Select at least one day.');
    if (openTime >= closeTime) return Alert.alert('Invalid hours', 'Closing time must be after opening time.');

    setSaving(true);
    try {
      const operatingHours = openDays.reduce((acc, day) => {
        acc[day] = { open: openTime, close: closeTime };
        return acc;
      }, {} as Record<string, { open: string; close: string }>);

      await PITCHES.update(pitchId, {
        name: name.trim(),
        pricePerHour: priceNum,
        operatingHours,
      });
      await refetch();
      Alert.alert('Saved', 'Pitch updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update pitch.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !pitch) {
    return (
      <View style={s.container}>
        <SafeAreaView edges={['top']}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Edit Pitch</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
          <Text style={s.errorText}>{error || 'Pitch not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        <SafeAreaView edges={['top']} style={s.headerSafe}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Edit Pitch</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={8}>
              {saving
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <Text style={s.fieldLabel}>Name</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Pitch name"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={s.fieldLabel}>Price per Hour (KSh)</Text>
          <TextInput
            style={s.input}
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 2500"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={s.sectionLabel}>Operating Hours</Text>
          <View style={s.hoursRow}>
            <TouchableOpacity
              style={s.hoursPicker}
              onPress={() => { setShowOpenPicker(v => !v); setShowClosePicker(false); }}
              activeOpacity={0.85}
            >
              <Text style={s.hoursLabel}>Opens</Text>
              <Text style={s.hoursValue}>{openTime}</Text>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
            <TouchableOpacity
              style={s.hoursPicker}
              onPress={() => { setShowClosePicker(v => !v); setShowOpenPicker(false); }}
              activeOpacity={0.85}
            >
              <Text style={s.hoursLabel}>Closes</Text>
              <Text style={s.hoursValue}>{closeTime}</Text>
            </TouchableOpacity>
          </View>

          {showOpenPicker && (
            <View style={s.timeGrid}>
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[s.timeChip, openTime === h && s.timeChipActive]}
                  onPress={() => { setOpenTime(h); setShowOpenPicker(false); }}
                  activeOpacity={0.85}
                >
                  <Text style={[s.timeChipText, openTime === h && s.timeChipTextActive]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showClosePicker && (
            <View style={s.timeGrid}>
              {HOURS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[s.timeChip, closeTime === h && s.timeChipActive]}
                  onPress={() => { setCloseTime(h); setShowClosePicker(false); }}
                  activeOpacity={0.85}
                >
                  <Text style={[s.timeChipText, closeTime === h && s.timeChipTextActive]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s.sectionLabel}>Open on</Text>
          <View style={s.daysRow}>
            {DAYS.map(d => {
              const active = openDays.includes(d.key);
              return (
                <TouchableOpacity
                  key={d.key}
                  style={[s.dayChip, active && s.dayChipActive]}
                  onPress={() => toggleDay(d.key)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.dayChipText, active && s.dayChipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[s.saveFullBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveFullBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    saveText: { color: colors.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },

    body: { padding: SPACING.base, paddingBottom: SPACING['3xl'] },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
    errorText: { color: colors.textMuted, fontSize: FONTS.sm, textAlign: 'center' },

    fieldLabel: { color: colors.textSecondary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, marginTop: SPACING.md, marginBottom: SPACING.sm },
    sectionLabel: {
      fontSize: FONTS.xs,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      color: colors.textPrimary,
      fontSize: FONTS.base,
      borderWidth: 1, borderColor: colors.border,
    },

    hoursRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.sm },
    hoursPicker: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    hoursLabel: { color: colors.textMuted, fontSize: FONTS.xs },
    hoursValue: { color: colors.textPrimary, fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, marginTop: 2 },

    timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.sm },
    timeChip: {
      paddingHorizontal: SPACING.md, paddingVertical: 6,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    timeChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    timeChipText: { color: colors.textMuted, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold },
    timeChipTextActive: { color: colors.primary },

    daysRow: { flexDirection: 'row', gap: SPACING.xs },
    dayChip: {
      flex: 1, paddingVertical: SPACING.sm,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center',
    },
    dayChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    dayChipText: { color: colors.textMuted, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold },
    dayChipTextActive: { color: colors.primary },

    saveFullBtn: {
      marginTop: SPACING.xl,
      height: 54,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    saveFullBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },
  });
}
