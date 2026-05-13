import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CORPORATE, TokenStorage, STORAGE_KEYS } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { User } from '../../types';

export default function CorporateSignupScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { handleLoginSuccess } = useAuth();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [company, setCompany]           = useState('');
  const [tradingName, setTradingName]   = useState('');
  const [contactName, setContactName]   = useState('');
  const [phone, setPhone]               = useState('+254');
  const [email, setEmail]               = useState('');
  const [billingAddress, setBilling]    = useState('');
  const [kraPin, setKraPin]             = useState('');
  const [otp, setOtp]                   = useState('');
  const [devOtp, setDevOtp]             = useState('');

  const submitForm = async () => {
    setError('');
    if (company.trim().length < 2) return setError('Company name required.');
    if (contactName.trim().length < 2) return setError('Contact name required.');
    if (!/^\+254\d{9}$/.test(phone)) return setError('Phone must be +254XXXXXXXXX.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email.');
    if (billingAddress.trim().length < 5) return setError('Billing address required.');

    setBusy(true);
    try {
      const { data }: any = await CORPORATE.signup({
        company: company.trim(),
        tradingName: tradingName.trim() || undefined,
        contactName: contactName.trim(),
        phone, email: email.trim(),
        billingAddress: billingAddress.trim(),
        kraPin: kraPin.trim() || undefined,
      });
      if (data?.devOtp) setDevOtp(String(data.devOtp));
      setStep('otp');
    } catch (e: any) {
      setError(e?.message || 'Signup failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    setError('');
    if (otp.length !== 6) return setError('Enter the 6-digit code.');
    setBusy(true);
    try {
      const { data }: any = await CORPORATE.verifySignup(phone, otp);
      const payload = data?.data || data;
      if (!payload?.accessToken || !payload?.user) throw new Error('Backend did not return tokens.');
      await TokenStorage.setTokens(payload.accessToken, payload.refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(payload.user));
      await handleLoginSuccess(payload.user as User, payload.accessToken, payload.refreshToken);
      Alert.alert(
        'Welcome to KAPASH for business!',
        `${company} is now set up. You are the corporate admin and can invite team members from your account.`,
        [{ text: 'Get started', onPress: () => navigation.navigate('Main') }],
      );
    } catch (e: any) {
      setError(e?.message || 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['top']} style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Sign up as a company</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.iconWrap}>
            <Ionicons name="business" size={32} color={colors.primary} />
          </View>
          <Text style={s.title}>
            {step === 'form' ? 'KAPASH for business' : 'Verify your phone'}
          </Text>
          <Text style={s.subtitle}>
            {step === 'form'
              ? 'Book pitches for company events, manage authorized bookers, and pay via invoice.'
              : `We sent a 6-digit code to ${phone}.`}
          </Text>

          {step === 'form' ? (
            <View style={s.form}>
              <Field label="Company name *"   value={company}        onChangeText={setCompany}        placeholder="Acme Industries Ltd" colors={colors} styles={s} />
              <Field label="Trading name"     value={tradingName}    onChangeText={setTradingName}    placeholder="Optional" colors={colors} styles={s} />
              <Field label="Contact name *"   value={contactName}    onChangeText={setContactName}    placeholder="Person we'll talk to" colors={colors} styles={s} />
              <Field label="Phone *"          value={phone}          onChangeText={setPhone}          placeholder="+254712345678" keyboardType="phone-pad" colors={colors} styles={s} />
              <Field label="Email *"          value={email}          onChangeText={setEmail}          placeholder="finance@acme.co.ke" keyboardType="email-address" colors={colors} styles={s} />
              <Field label="Billing address *" value={billingAddress} onChangeText={setBilling}       placeholder="Street, city, postal code" colors={colors} styles={s} multiline />
              <Field label="KRA PIN"          value={kraPin}         onChangeText={setKraPin}         placeholder="Optional — P000000000A" colors={colors} styles={s} autoCapitalize="characters" />

              {error ? <Text style={s.error}>{error}</Text> : null}

              <TouchableOpacity style={[s.submit, busy && { opacity: 0.6 }]} onPress={submitForm} disabled={busy} activeOpacity={0.9}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Send verification code</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.form}>
              <Text style={s.fieldLabel}>OTP code</Text>
              <TextInput
                style={[s.input, s.otpInput]}
                value={otp}
                onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                autoFocus
              />
              {devOtp ? (
                <View style={s.devHint}>
                  <Ionicons name="key" size={14} color={colors.primary} />
                  <Text style={s.devHintTxt}>Dev OTP: {devOtp}</Text>
                </View>
              ) : null}

              {error ? <Text style={s.error}>{error}</Text> : null}

              <TouchableOpacity style={[s.submit, busy && { opacity: 0.6 }]} onPress={submitOtp} disabled={busy} activeOpacity={0.9}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Verify & finish signup</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setStep('form'); setOtp(''); setDevOtp(''); }} style={s.backLink}>
                <Text style={s.backLinkTxt}>← Edit company info</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize, colors, styles,
}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  keyboardType?: any; multiline?: boolean; autoCapitalize?: any;
  colors: ColorPalette; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: FONTS.lg, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
    scroll: { padding: SPACING.base, paddingBottom: SPACING['3xl'] },
    iconWrap: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.primaryMuted,
      alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
      marginVertical: SPACING.md,
    },
    title: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary, textAlign: 'center' },
    subtitle: { fontSize: FONTS.sm, color: colors.textMuted, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xl, lineHeight: 20, paddingHorizontal: SPACING.lg },
    form: { gap: SPACING.md },
    field: { gap: 6 },
    fieldLabel: { fontSize: FONTS.xs, color: colors.textMuted, fontWeight: FONT_WEIGHT.semiBold },
    input: {
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: SPACING.md, paddingVertical: 12,
      color: colors.textPrimary, fontSize: FONTS.sm,
    },
    otpInput: {
      textAlign: 'center', fontSize: 22, letterSpacing: 8, fontFamily: undefined, fontWeight: FONT_WEIGHT.bold,
    },
    error: { color: colors.error, fontSize: FONTS.sm, textAlign: 'center' },
    submit: {
      height: 52, borderRadius: RADIUS.md,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      marginTop: SPACING.md,
    },
    submitTxt: { color: '#fff', fontWeight: FONT_WEIGHT.bold, fontSize: FONTS.base },
    devHint: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: colors.primaryMuted, padding: SPACING.sm,
      borderRadius: RADIUS.sm, alignSelf: 'center',
    },
    devHintTxt: { color: colors.primary, fontSize: FONTS.xs, fontWeight: FONT_WEIGHT.semiBold },
    backLink: { alignItems: 'center', padding: SPACING.md },
    backLinkTxt: { color: colors.textMuted, fontSize: FONTS.sm },
  });
}
