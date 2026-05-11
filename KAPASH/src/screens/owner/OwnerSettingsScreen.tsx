import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { USER } from '../../services/api';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props { navigation: any; }

export default function OwnerSettingsScreen({ navigation }: Props) {
  const { user, updateUser, logout } = useAuth();
  const { mode, setMode, colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [name, setName]   = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Local-only toggles for demo (would persist server-side in a real implementation)
  const [bookingNotifs, setBookingNotifs] = useState(true);
  const [payoutNotifs,  setPayoutNotifs]  = useState(true);
  const [marketingNotifs, setMarketingNotifs] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await USER.updateProfile({ name: name.trim(), email: email.trim() || undefined });
      const updated = res.data?.data?.user || res.data?.user || res.data || {};
      updateUser({ name: updated.name ?? name.trim(), email: updated.email ?? email.trim() });
      Alert.alert('Saved', 'Profile updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        <SafeAreaView edges={['top']} style={s.headerSafe}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Settings</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={8}>
              {saving ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.base, paddingBottom: SPACING['3xl'] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile */}
          <Text style={s.sectionLabel}>Profile</Text>
          <View style={s.card}>
            <Text style={s.fieldLabel}>Full name</Text>
            <TextInput
              style={[s.input, errors.name && s.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            {errors.name && <Text style={s.errorText}>{errors.name}</Text>}

            <Text style={[s.fieldLabel, { marginTop: SPACING.md }]}>Email</Text>
            <TextInput
              style={[s.input, errors.email && s.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={s.errorText}>{errors.email}</Text>}

            <Text style={[s.fieldLabel, { marginTop: SPACING.md }]}>Phone</Text>
            <View style={[s.input, s.inputDisabled]}>
              <Text style={s.inputDisabledText}>{user?.phone || '—'}</Text>
            </View>
            <Text style={s.hint}>Phone number cannot be changed</Text>
          </View>

          {/* Appearance */}
          <Text style={s.sectionLabel}>Appearance</Text>
          <View style={[s.card, { flexDirection: 'row', padding: SPACING.xs, gap: SPACING.xs }]}>
            {([
              { value: 'light',  icon: 'sunny-outline'          as IoniconName, label: 'Light' },
              { value: 'dark',   icon: 'moon-outline'           as IoniconName, label: 'Dark' },
              { value: 'system', icon: 'phone-portrait-outline' as IoniconName, label: 'System' },
            ] as { value: ThemeMode; icon: IoniconName; label: string }[]).map(opt => {
              const active = mode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setMode(opt.value)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: SPACING.xs,
                    paddingVertical: SPACING.md,
                    borderRadius: RADIUS.md,
                    backgroundColor: active ? colors.primaryMuted : 'transparent',
                  }}
                >
                  <Ionicons name={opt.icon} size={16} color={active ? colors.primary : colors.textMuted} />
                  <Text style={{
                    fontSize: FONTS.sm,
                    fontWeight: FONT_WEIGHT.semiBold,
                    color: active ? colors.primary : colors.textSecondary,
                  }}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Notifications */}
          <Text style={s.sectionLabel}>Notifications</Text>
          <View style={s.card}>
            <ToggleRow
              icon="calendar-outline"
              title="New bookings"
              subtitle="Push when a player books your pitch"
              value={bookingNotifs}
              onChange={setBookingNotifs}
              colors={colors}
              styles={s}
              isFirst
            />
            <ToggleRow
              icon="cash-outline"
              title="Payout updates"
              subtitle="Push when a payout is processed"
              value={payoutNotifs}
              onChange={setPayoutNotifs}
              colors={colors}
              styles={s}
            />
            <ToggleRow
              icon="megaphone-outline"
              title="Tips & promos"
              subtitle="Occasional product news"
              value={marketingNotifs}
              onChange={setMarketingNotifs}
              colors={colors}
              styles={s}
              isLast
            />
          </View>

          {/* Danger zone */}
          <Text style={s.sectionLabel}>Account</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.dangerRow} onPress={confirmLogout} activeOpacity={0.85}>
              <View style={s.iconWrap}>
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, { color: colors.error }]}>Log out</Text>
                <Text style={s.rowSubtitle}>Sign out of this device</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function ToggleRow({
  icon, title, subtitle, value, onChange, colors, styles, isFirst, isLast,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !isFirst && styles.toggleRowBorder]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
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
    saveText: { color: colors.primary, fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },

    sectionLabel: {
      fontSize: FONTS.xs,
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: colors.border,
      padding: SPACING.base,
      gap: 0,
    },

    fieldLabel: { color: colors.textSecondary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, marginBottom: 6 },
    input: {
      backgroundColor: colors.background,
      borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: SPACING.md,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: FONTS.sm,
    },
    inputDisabled: { opacity: 0.6 },
    inputDisabledText: { color: colors.textMuted, fontSize: FONTS.sm },
    inputError: { borderColor: colors.error },
    errorText: { color: colors.error, fontSize: FONTS.xs, marginTop: 4 },
    hint: { color: colors.textMuted, fontSize: FONTS.xs, marginTop: 4 },

    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      paddingVertical: SPACING.md,
    },
    toggleRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    iconWrap: {
      width: 36, height: 36, borderRadius: RADIUS.sm,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
    },
    rowTitle: { color: colors.textPrimary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },
    rowSubtitle: { color: colors.textMuted, fontSize: FONTS.xs, marginTop: 2 },

    dangerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
  });
}
