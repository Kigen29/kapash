import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PITCHES } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type PitchType = 'ASTRO_TURF' | 'NATURAL_GRASS' | 'CONCRETE' | 'HYBRID';
type PitchSize = 'FIVE_A_SIDE' | 'SEVEN_A_SIDE' | 'ELEVEN_A_SIDE';

const PITCH_TYPES: { value: PitchType; label: string }[] = [
  { value: 'ASTRO_TURF',    label: 'Astro Turf' },
  { value: 'NATURAL_GRASS', label: 'Natural Grass' },
  { value: 'CONCRETE',      label: 'Concrete' },
  { value: 'HYBRID',        label: 'Hybrid' },
];

const PITCH_SIZES: { value: PitchSize; label: string }[] = [
  { value: 'FIVE_A_SIDE',   label: '5-a-side' },
  { value: 'SEVEN_A_SIDE',  label: '7-a-side' },
  { value: 'ELEVEN_A_SIDE', label: '11-a-side' },
];

const AMENITY_OPTIONS: { name: string; icon: IoniconName; emoji: string }[] = [
  { name: 'Changing Rooms',  icon: 'shirt-outline',   emoji: '🚿' },
  { name: 'Parking',         icon: 'car-outline',     emoji: '🅿️' },
  { name: 'Floodlights',     icon: 'sunny-outline',   emoji: '💡' },
  { name: 'Artificial Turf', icon: 'leaf-outline',    emoji: '🌿' },
  { name: 'Spectator Seats', icon: 'people-outline',  emoji: '💺' },
  { name: 'Refreshments',    icon: 'cafe-outline',    emoji: '🍶' },
  { name: 'Wi-Fi',           icon: 'wifi-outline',    emoji: '📶' },
  { name: 'First Aid',       icon: 'medkit-outline',  emoji: '🏥' },
];

// Nairobi default coordinates (Westlands area)
const DEFAULT_LAT = -1.2649;
const DEFAULT_LNG = 36.8025;

const DAYS: { key: string; label: string }[] = [
  { key: 'monday',    label: 'Mon' },
  { key: 'tuesday',   label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday',  label: 'Thu' },
  { key: 'friday',    label: 'Fri' },
  { key: 'saturday',  label: 'Sat' },
  { key: 'sunday',    label: 'Sun' },
];

// Whole-hour selection 0-23
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

export default function AddPitchScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [name, setName]               = useState('');
  const [address, setAddress]         = useState('');
  const [city, setCity]               = useState('Nairobi');
  const [type, setType]               = useState<PitchType>('ASTRO_TURF');
  const [size, setSize]               = useState<PitchSize>('SEVEN_A_SIDE');
  const [price, setPrice]             = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities]     = useState<string[]>([]);
  const [images, setImages]           = useState<{ uri: string; name: string; type: string }[]>([]);
  const [submitting, setSubmitting]   = useState(false);

  // Operating hours
  const [openTime, setOpenTime]   = useState('06:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [openDays, setOpenDays]   = useState<string[]>(DAYS.map(d => d.key)); // all 7 days by default
  const [showOpenPicker, setShowOpenPicker]   = useState(false);
  const [showClosePicker, setShowClosePicker] = useState(false);

  const toggleDay = (key: string) => {
    setOpenDays(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  };

  async function pickImage() {
    if (images.length >= 3) {
      Alert.alert('Maximum Images', 'You can upload up to 3 images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() || `pitch_${Date.now()}.jpg`;
      const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
      setImages(prev => [...prev, { uri: asset.uri, name: fileName, type: fileType }]);
    }
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  function toggleAmenity(name: string) {
    setAmenities(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  }

  async function handleSubmit() {
    if (!name.trim() || name.trim().length < 3) return Alert.alert('Required', 'Pitch name must be at least 3 characters.');
    if (!address.trim() || address.trim().length < 5) return Alert.alert('Required', 'Please enter a full address (5+ characters).');
    const priceNum = Number(price);
    if (!price.trim() || isNaN(priceNum) || priceNum < 500 || priceNum > 20000) {
      return Alert.alert('Invalid price', 'Price must be between KSh 500 and KSh 20,000 per hour.');
    }
    if (openDays.length === 0) {
      return Alert.alert('Required', 'Please select at least one day the pitch is open.');
    }
    if (openTime >= closeTime) {
      return Alert.alert('Invalid hours', 'Closing time must be after opening time.');
    }

    setSubmitting(true);
    try {
      const operatingHours = openDays.reduce((acc, day) => {
        acc[day] = { open: openTime, close: closeTime };
        return acc;
      }, {} as Record<string, { open: string; close: string }>);

      const body = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || 'Nairobi',
        county: city.trim() || 'Nairobi',
        latitude: DEFAULT_LAT,
        longitude: DEFAULT_LNG,
        type,
        size,
        pricePerHour: priceNum,
        description: description.trim() || undefined,
        operatingHours,
        amenities: amenities.length > 0
          ? amenities.map(n => {
              const a = AMENITY_OPTIONS.find(o => o.name === n);
              return { name: n, icon: a?.emoji || '⚽' };
            })
          : undefined,
      };

      const res: any = await PITCHES.create(body);
      const payload = res?.data?.data ?? res?.data ?? res;
      const pitchId: string = payload?.pitch?.id || payload?.id;
      if (!pitchId) throw new Error('Pitch created but no ID returned.');

      let imageWarning: string | null = null;
      if (images.length > 0) {
        try {
          const fd = new FormData();
          images.forEach(img => {
            fd.append('images', { uri: img.uri, name: img.name, type: img.type } as any);
          });
          await PITCHES.uploadImages(pitchId, fd);
        } catch (uploadErr: any) {
          imageWarning = uploadErr?.message || 'Image upload failed.';
        }
      }

      const message = imageWarning
        ? `"${name}" was created, but images couldn't be uploaded: ${imageWarning} You can add photos later from Manage Pitches.`
        : `"${name}" is now live on KAPASH.`;
      Alert.alert(imageWarning ? 'Pitch Created (no images)' : 'Pitch Created!', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const message = err?.message || 'Failed to create pitch. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={s.container}>
      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Add New Pitch</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Photos */}
          <Text style={s.sectionLabel}>Photos (up to 3)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imgRow}>
            {images.map((img, i) => (
              <View key={i} style={s.imgThumbWrap}>
                <Image source={{ uri: img.uri }} style={s.imgThumb} />
                <TouchableOpacity style={s.imgRemove} onPress={() => removeImage(i)} hitSlop={6}>
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 3 && (
              <TouchableOpacity style={s.imgAdd} onPress={pickImage} activeOpacity={0.85}>
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
                <Text style={s.imgAddTxt}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Basic Info */}
          <Text style={s.sectionLabel}>Basic Info</Text>
          <Field colors={colors} styles={s} label="Pitch Name *" value={name} onChangeText={setName} placeholder="e.g. Westlands Arena" />
          <Field colors={colors} styles={s} label="Address *" value={address} onChangeText={setAddress} placeholder="e.g. Westlands Road, Nairobi" />
          <Field colors={colors} styles={s} label="City" value={city} onChangeText={setCity} placeholder="e.g. Nairobi" />
          <Field colors={colors} styles={s} label="Price per Hour (KSh) *" value={price} onChangeText={setPrice} placeholder="500 – 20,000" keyboardType="numeric" />

          {/* Pitch Type (surface) */}
          <Text style={s.sectionLabel}>Surface Type</Text>
          <View style={s.typeRow}>
            {PITCH_TYPES.map(opt => {
              const active = type === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.typeChip, active && s.typeChipActive]}
                  onPress={() => setType(opt.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Size */}
          <Text style={s.sectionLabel}>Pitch Size</Text>
          <View style={s.typeRow}>
            {PITCH_SIZES.map(opt => {
              const active = size === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.typeChip, active && s.typeChipActive]}
                  onPress={() => setSize(opt.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description */}
          <Text style={s.sectionLabel}>Description</Text>
          <TextInput
            style={s.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your pitch — surface type, notable features, nearby landmarks..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Amenities */}
          <Text style={s.sectionLabel}>Amenities</Text>
          <View style={s.amenityGrid}>
            {AMENITY_OPTIONS.map(a => {
              const active = amenities.includes(a.name);
              return (
                <TouchableOpacity
                  key={a.name}
                  style={[s.amenityChip, active && s.amenityChipActive]}
                  onPress={() => toggleAmenity(a.name)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={a.icon} size={14} color={active ? colors.primary : colors.textMuted} />
                  <Text style={[s.amenityName, active && s.amenityNameActive]}>{a.name}</Text>
                  {active && <Ionicons name="checkmark" size={12} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Operating Hours */}
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

          <Text style={[s.fieldLabel, { marginTop: SPACING.sm }]}>Open on</Text>
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

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.9}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Create Pitch</Text>}
          </TouchableOpacity>

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, colors, styles,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: any;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType || 'default'}
      />
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

    scroll: { padding: SPACING.base },

    sectionLabel: {
      fontSize: FONTS.xs,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },

    imgRow: { marginBottom: SPACING.xs },
    imgThumbWrap: { position: 'relative', marginRight: SPACING.sm },
    imgThumb: { width: 100, height: 80, borderRadius: RADIUS.md },
    imgRemove: {
      position: 'absolute', top: -6, right: -6,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: colors.error,
      alignItems: 'center', justifyContent: 'center',
    },
    imgAdd: {
      width: 100, height: 80, borderRadius: RADIUS.md,
      borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.surface,
      gap: 4,
    },
    imgAddTxt: { color: colors.textMuted, fontSize: FONTS.xs },

    fieldWrap: { marginBottom: SPACING.md },
    fieldLabel: { color: colors.textMuted, fontSize: FONTS.xs, marginBottom: 6 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: FONTS.sm,
      borderWidth: 1, borderColor: colors.border,
    },
    textArea: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      color: colors.textPrimary,
      fontSize: FONTS.sm,
      borderWidth: 1, borderColor: colors.border,
      minHeight: 100,
      marginBottom: SPACING.md,
    },

    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xs },
    typeChip: {
      paddingHorizontal: SPACING.base, paddingVertical: 8,
      borderRadius: RADIUS.full,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    typeChipActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    typeChipText: { color: colors.textMuted, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },
    typeChipTextActive: { color: colors.primary },

    amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xs },
    amenityChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: SPACING.md, paddingVertical: 8,
      borderRadius: RADIUS.md,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    amenityChipActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    amenityName: { color: colors.textMuted, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.medium },
    amenityNameActive: { color: colors.primary },

    submitBtn: {
      marginTop: SPACING.xl,
      height: 54,
      borderRadius: RADIUS.md,
      backgroundColor: colors.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    submitTxt: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },

    hoursRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      marginBottom: SPACING.sm,
    },
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
    timeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.xs,
      marginBottom: SPACING.sm,
    },
    timeChip: {
      paddingHorizontal: SPACING.md,
      paddingVertical: 6,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
    },
    timeChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    timeChipText: { color: colors.textMuted, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold },
    timeChipTextActive: { color: colors.primary },

    daysRow: {
      flexDirection: 'row',
      gap: SPACING.xs,
      marginBottom: SPACING.xs,
    },
    dayChip: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.sm,
      backgroundColor: colors.surface,
      borderWidth: 1, borderColor: colors.border,
      alignItems: 'center',
    },
    dayChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
    dayChipText: { color: colors.textMuted, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold },
    dayChipTextActive: { color: colors.primary },
  });
}
