import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { USER } from '../../services/api';

export default function EditProfileScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

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
    if (!name.trim() || name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await USER.updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
      });
      const updated = res.data?.data?.user || res.data?.user || res.data || {};
      updateUser({ name: updated.name ?? name.trim(), email: updated.email ?? email.trim() });
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        <SafeAreaView edges={['top']} style={s.headerSafe}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.title}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn} hitSlop={8}>
              {saving
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={s.avatarSection}>
            <View style={s.avatarRing}>
              <View style={s.avatar}>
                <Text style={s.avatarInitial}>{(name.charAt(0) || '?').toUpperCase()}</Text>
              </View>
            </View>
            <Text style={s.avatarHint}>Profile photo coming soon</Text>
          </View>

          {/* Phone — read only */}
          <View style={s.group}>
            <Text style={s.label}>Phone Number</Text>
            <View style={[s.input, s.inputDisabled, { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }]}>
              <Ionicons name="call-outline" size={16} color={colors.textMuted} />
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
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
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
            <View style={[s.input, s.inputDisabled, { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }]}>
              <Ionicons
                name={user?.role === 'OWNER' ? 'business-outline' : 'football-outline'}
                size={16}
                color={colors.textMuted}
              />
              <Text style={s.inputDisabledText}>
                {user?.role === 'OWNER' ? 'Pitch Owner' : 'Player'}
              </Text>
            </View>
          </View>

          {user?.isVerified && (
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={s.verifiedText}>Verified Account</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.saveFullBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveFullBtnText}>Save Changes</Text>}
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
    title: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    saveBtn: { paddingHorizontal: SPACING.sm, justifyContent: 'center' },
    saveText: { color: colors.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },

    body: { padding: SPACING.lg, paddingBottom: SPACING['3xl'] },

    avatarSection: { alignItems: 'center', marginBottom: SPACING['2xl'] },
    avatarRing: {
      padding: 3,
      borderRadius: RADIUS.full,
      backgroundColor: colors.primaryMuted,
      marginBottom: SPACING.sm,
    },
    avatar: {
      width: 88, height: 88,
      borderRadius: RADIUS.full,
      backgroundColor: colors.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarInitial: { fontSize: FONTS['4xl'], fontWeight: FONT_WEIGHT.extraBold, color: '#fff' },
    avatarHint: { color: colors.textMuted, fontSize: FONTS.xs },

    group: { marginBottom: SPACING.lg },
    label: { color: colors.textSecondary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, marginBottom: SPACING.sm },
    optional: { color: colors.textMuted, fontWeight: FONT_WEIGHT.regular },
    hint: { color: colors.textMuted, fontSize: FONTS.xs, marginTop: 5 },

    input: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.base,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputText: { color: colors.textPrimary, fontSize: FONTS.base },
    inputDisabled: { opacity: 0.65 },
    inputDisabledText: { color: colors.textMuted, fontSize: FONTS.base },
    inputError: { borderColor: colors.error },
    errorText: { color: colors.error, fontSize: FONTS.xs, marginTop: 5 },

    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primaryMuted,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      alignSelf: 'flex-start',
      marginBottom: SPACING.lg,
    },
    verifiedText: { color: colors.primary, fontWeight: FONT_WEIGHT.semiBold, fontSize: FONTS.sm },

    saveFullBtn: {
      backgroundColor: colors.primary,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.base,
      alignItems: 'center',
      marginTop: SPACING.md,
    },
    saveFullBtnText: { color: '#fff', fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold },
  });
}
