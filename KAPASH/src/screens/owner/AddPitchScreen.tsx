/**
 * AddPitchScreen — owner creates a new pitch
 * Place at: src/screens/owner/AddPitchScreen.tsx
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { PITCHES } from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PITCH_TYPES = ['Football', 'Basketball', 'Tennis', 'Futsal', 'Rugby'];

const AMENITY_OPTIONS = [
  { id: 'changing_rooms',  name: 'Changing Rooms',  icon: '🚿' },
  { id: 'parking',         name: 'Parking',         icon: '🅿️' },
  { id: 'floodlights',     name: 'Floodlights',     icon: '💡' },
  { id: 'artificial_turf', name: 'Artificial Turf', icon: '🌿' },
  { id: 'spectator_seats', name: 'Spectator Seats', icon: '💺' },
  { id: 'refreshments',    name: 'Refreshments',    icon: '🍶' },
  { id: 'wifi',            name: 'Wi-Fi',           icon: '📶' },
  { id: 'first_aid',       name: 'First Aid',       icon: '🏥' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AddPitchScreen({ navigation }: any) {
  const [name, setName]               = useState('');
  const [address, setAddress]         = useState('');
  const [city, setCity]               = useState('');
  const [pitchType, setPitchType]     = useState('Football');
  const [size, setSize]               = useState('');
  const [price, setPrice]             = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities]     = useState<string[]>([]);
  const [images, setImages]           = useState<{ uri: string; name: string; type: string }[]>([]);
  const [submitting, setSubmitting]   = useState(false);

  // ─── Image Picker ──────────────────────────────────────────────────────────

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

  // ─── Amenities Toggle ──────────────────────────────────────────────────────

  function toggleAmenity(id: string) {
    setAmenities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!name.trim())    return Alert.alert('Required', 'Please enter a pitch name.');
    if (!address.trim()) return Alert.alert('Required', 'Please enter an address.');
    if (!price.trim() || isNaN(Number(price)) || Number(price) <= 0)
      return Alert.alert('Required', 'Please enter a valid price per hour.');

    setSubmitting(true);
    try {
      const body = {
        name:         name.trim(),
        address:      address.trim(),
        city:         city.trim() || undefined,
        pitchType:    pitchType.toUpperCase(),
        size:         size.trim() || undefined,
        pricePerHour: Number(price),
        description:  description.trim() || undefined,
        amenities:    amenities.length > 0 ? amenities : undefined,
      };

      const result: any = await PITCHES.create(body);
      const pitchId: string = result?.pitch?.id || result?.id;

      if (!pitchId) throw new Error('Pitch created but no ID returned.');

      // Upload images if any
      if (images.length > 0) {
        const fd = new FormData();
        images.forEach(img => {
          fd.append('images', {
            uri: img.uri,
            name: img.name,
            type: img.type,
          } as any);
        });
        await PITCHES.uploadImages(pitchId, fd);
      }

      Alert.alert('Pitch Created!', `"${name}" is now live on KAPASH.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create pitch. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Add New Pitch</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

            {/* Images */}
            <SectionLabel text="Photos (up to 3)" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.imgRow}>
              {images.map((img, i) => (
                <View key={i} style={s.imgThumbWrap}>
                  <Image source={{ uri: img.uri }} style={s.imgThumb} />
                  <TouchableOpacity style={s.imgRemove} onPress={() => removeImage(i)}>
                    <Text style={s.imgRemoveTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 3 && (
                <TouchableOpacity style={s.imgAdd} onPress={pickImage}>
                  <Text style={s.imgAddIcon}>📷</Text>
                  <Text style={s.imgAddTxt}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Basic Info */}
            <SectionLabel text="Basic Info" />
            <Field label="Pitch Name *" value={name} onChangeText={setName} placeholder="e.g. Westlands Arena" />
            <Field label="Address *" value={address} onChangeText={setAddress} placeholder="e.g. Westlands, Nairobi" />
            <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. Nairobi" />
            <Field
              label="Price per Hour (KSh) *"
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 2500"
              keyboardType="numeric"
            />
            <Field
              label="Size"
              value={size}
              onChangeText={setSize}
              placeholder="e.g. 5-a-side, 11-a-side"
            />

            {/* Pitch Type */}
            <SectionLabel text="Pitch Type" />
            <View style={s.typeRow}>
              {PITCH_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[s.typeChip, pitchType === type && s.typeChipActive]}
                  onPress={() => setPitchType(type)}
                >
                  <Text style={[s.typeChipText, pitchType === type && s.typeChipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <SectionLabel text="Description" />
            <TextInput
              style={s.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your pitch — surface type, notable features, nearby landmarks..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Amenities */}
            <SectionLabel text="Amenities" />
            <View style={s.amenityGrid}>
              {AMENITY_OPTIONS.map(a => {
                const active = amenities.includes(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[s.amenityChip, active && s.amenityChipActive]}
                    onPress={() => toggleAmenity(a.id)}
                  >
                    <Text style={s.amenityIcon}>{a.icon}</Text>
                    <Text style={[s.amenityName, active && s.amenityNameActive]}>{a.name}</Text>
                    {active && <Text style={s.amenityCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitTxt}>Create Pitch</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={s.sectionLabel}>{text}</Text>;
}

function Field({
  label, value, onChangeText, placeholder, keyboardType,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: any;
}) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280"
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0F1923' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  backArrow:   { color: '#fff', fontSize: 22 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scroll:      { padding: 16 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },

  // Images
  imgRow:       { marginBottom: 4 },
  imgThumbWrap: { position: 'relative', marginRight: 10 },
  imgThumb:     { width: 100, height: 80, borderRadius: 10 },
  imgRemove:    { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  imgRemoveTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  imgAdd:       { width: 100, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: '#374151', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A2535' },
  imgAddIcon:   { fontSize: 22 },
  imgAddTxt:    { color: '#9CA3AF', fontSize: 11, marginTop: 4 },

  // Fields
  fieldWrap:  { marginBottom: 12 },
  fieldLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
  input:      { backgroundColor: '#1A2535', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  textArea:   { backgroundColor: '#1A2535', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#374151', minHeight: 100, marginBottom: 12 },

  // Type chips
  typeRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#374151' },
  typeChipActive:   { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22C55E' },
  typeChipText:     { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: '#22C55E' },

  // Amenities
  amenityGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  amenityChip:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#374151', gap: 6 },
  amenityChipActive:  { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: '#22C55E' },
  amenityIcon:        { fontSize: 14 },
  amenityName:        { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  amenityNameActive:  { color: '#22C55E' },
  amenityCheck:       { color: '#22C55E', fontSize: 11, fontWeight: '700' },

  // Submit
  submitBtn: { marginTop: 24, height: 54, borderRadius: 14, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
  submitTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
