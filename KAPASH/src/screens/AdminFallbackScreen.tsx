import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../constants/theme';

const ADMIN_URL = 'http://localhost:5173';

export default function AdminFallbackScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const openAdmin = () => {
    Linking.openURL(ADMIN_URL).catch(() => {
      Alert.alert('Admin panel', `Open ${ADMIN_URL} in a browser on a computer.`);
    });
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.iconWrap}>
        <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
      </View>
      <Text style={s.title}>Admin panel is web-only</Text>
      <Text style={s.subtitle}>
        Hi {user?.name?.split(' ')[0] || 'Admin'} — the KAPASH admin tools live on the web for better tables and bulk actions.
      </Text>

      <TouchableOpacity style={s.primaryBtn} onPress={openAdmin} activeOpacity={0.85}>
        <Ionicons name="open-outline" size={18} color="#fff" />
        <Text style={s.primaryBtnText}>Open admin panel</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.secondaryBtn} onPress={logout} activeOpacity={0.85}>
        <Text style={s.secondaryBtnText}>Log out</Text>
      </TouchableOpacity>

      <Text style={s.urlHint}>{ADMIN_URL}</Text>
    </SafeAreaView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: SPACING.xl,
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.md,
    },
    iconWrap: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: SPACING.md,
    },
    title: {
      fontSize: FONTS['2xl'],
      fontWeight: FONT_WEIGHT.bold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: FONTS.sm,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
    },
    primaryBtnText: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },
    secondaryBtn: {
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.sm,
    },
    secondaryBtnText: { color: colors.textMuted, fontSize: FONTS.sm },
    urlHint: { color: colors.textMuted, fontSize: FONTS.xs, marginTop: SPACING.lg, fontFamily: undefined },
  });
}
