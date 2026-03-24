/**
 * EditProfileScreen
 * Place at: src/screens/user/EditProfileScreen.tsx
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { USER } from '../../services/api';

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();

  const [name, setName]     = useState(user?.name   || '');
  const [email, setEmail]   = useState(user?.email  || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setName(user.name   || '');
      setEmail(user.email || '');
    }
  }, [user]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2)
      e.name = 'Name must be at least 2 characters';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await USER.updateProfile({
        name:  name.trim(),
        email: email.trim() || undefined,
      });
      // Update context + AsyncStorage via updateUser
      const updated = res.data?.data?.user || res.data?.user || res.data || {};
      updateUser({ name: updated.name ?? name.trim(), email: updated.email ?? email.trim() });

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || err.message || 'Failed to update profile',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.container}>
        <SafeAreaView>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Text style={s.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={s.title}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn}>
              {saving
                ? <ActivityIndicator color="#22C55E" size="small" />
                : <Text style={s.saveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={s.avatarSection}>
            <View style={s.avatar}>
              <Text style={s.avatarInitial}>
                {(name.charAt(0) || '?').toUpperCase()}
              </Text>
            </View>
            <Text style={s.avatarHint}>Profile photo coming soon</Text>
          </View>

          {/* Phone — read only */}
          <View style={s.group}>
            <Text style={s.label}>Phone Number</Text>
            <View style={[s.input, s.inputDisabled]}>
              <Text style={s.inputDisabledText}>{user?.phone || '—'}</Text>
            </View>
            <Text style={s.hint}>Phone number cannot be changed</Text>
          </View>

          {/* Full Name */}
          <View style={s.group}>
            <Text style={s.label}>Full Name</Text>
            <TextInput
              style={[s.input, s.inputText, errors.name ? s.inputError : null]}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor="#6B7280"
              autoCapitalize="words"
              returnKeyType="next"
            />
            {errors.name && <Text style={s.errorText}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View style={s.group}>
            <Text style={s.label}>
              Email Address <Text style={s.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[s.input, s.inputText, errors.email ? s.inputError : null]}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#6B7280"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {errors.email && <Text style={s.errorText}>{errors.email}</Text>}
          </View>

          {/* Account type — read only */}
          <View style={s.group}>
            <Text style={s.label}>Account Type</Text>
            <View style={[s.input, s.inputDisabled, s.inputRow]}>
              <Text style={{ fontSize: 16 }}>
                {user?.role === 'OWNER' ? '🏟️' : '⚽'}
              </Text>
              <Text style={s.inputDisabledText}>
                {user?.role === 'OWNER' ? 'Pitch Owner' : 'Player'}
              </Text>
            </View>
          </View>

          {/* Verification badge */}
          {user?.isVerified && (
            <View style={s.verifiedBadge}>
              <Text style={s.verifiedText}>✅ Verified Account</Text>
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[s.saveFullBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveFullBtnText}>Save Changes</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0F1923' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:            { width: 36, height: 36, justifyContent: 'center' },
  backArrow:          { fontSize: 22, color: '#fff' },
  title:              { fontSize: 18, fontWeight: '700', color: '#fff' },
  saveBtn:            { width: 56, alignItems: 'flex-end', justifyContent: 'center' },
  saveText:           { color: '#22C55E', fontWeight: '700', fontSize: 15 },
  body:               { padding: 20, paddingBottom: 60 },
  avatarSection:      { alignItems: 'center', marginBottom: 32 },
  avatar:             { width: 88, height: 88, borderRadius: 44, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarInitial:      { fontSize: 36, fontWeight: '800', color: '#fff' },
  avatarHint:         { color: '#6B7280', fontSize: 12 },
  group:              { marginBottom: 20 },
  label:              { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  optional:           { color: '#6B7280', fontWeight: '400' },
  hint:               { color: '#6B7280', fontSize: 11, marginTop: 5 },
  input:              { backgroundColor: '#1A2535', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'transparent' },
  inputText:          { color: '#fff', fontSize: 15 },
  inputRow:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputDisabled:      { opacity: 0.5 },
  inputDisabledText:  { color: '#9CA3AF', fontSize: 15 },
  inputError:         { borderColor: '#EF4444' },
  errorText:          { color: '#EF4444', fontSize: 12, marginTop: 5 },
  verifiedBadge:      { backgroundColor: '#22C55E22', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 20 },
  verifiedText:       { color: '#22C55E', fontWeight: '600', fontSize: 14 },
  saveFullBtn:        { backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  saveFullBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
});