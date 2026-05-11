import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AUTH } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyPhoneScreen({ route, navigation }: any) {
  const { phone: routePhone, isLinking } = route.params || {};
  const { handleLoginSuccess, handlePhoneVerified } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [phone, setPhone] = useState(routePhone || '');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [otpSent, setOtpSent] = useState(!!routePhone);
  const [devOtp, setDevOtp] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // For phone-link flow without preset phone
  const [newPhone, setNewPhone] = useState('');
  const [sendingNew, setSendingNew] = useState(false);
  const [newPhoneErr, setNewPhoneErr] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function sendOtp(targetPhone: string) {
    try {
      if (isLinking) {
        const { data } = await AUTH.sendPhoneLinkOtp(targetPhone);
        if (data.devOtp) setDevOtp(data.devOtp);
      } else {
        const { data } = await AUTH.sendOtp(targetPhone);
        if (data.devOtp) setDevOtp(data.devOtp);
      }
      setOtpSent(true);
      setCountdown(RESEND_SECONDS);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    }
  }

  function handleOtpChange(val: string, idx: number) {
    if (val.length === OTP_LENGTH) {
      const digits = val.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const filled = [...digits, ...Array(OTP_LENGTH - digits.length).fill('')];
      setOtp(filled);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      return;
    }
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  }

  function handleKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
      inputRefs.current[idx - 1]?.focus();
    }
  }

  const fullOtp = otp.join('');
  const isComplete = fullOtp.length === OTP_LENGTH && otp.every(d => d !== '');

  async function handleVerify() {
    if (!isComplete || verifying) return;
    setVerifying(true);
    try {
      if (isLinking) {
        const { data } = await AUTH.verifyPhoneLink(phone, fullOtp);
        const updatedUser = data.data?.user;
        handlePhoneVerified(updatedUser ? {
          phone: updatedUser.phone,
          phoneVerified: true,
          isVerified: true,
        } : undefined);
      } else {
        const { data } = await AUTH.verifyOtp(phone, fullOtp);
        const payload = data.data || data;
        await handleLoginSuccess(payload.user, payload.accessToken, payload.refreshToken);
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Invalid OTP.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      await sendOtp(phone);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      Alert.alert('Sent!', 'A new OTP has been sent to your phone.');
    } catch {
      Alert.alert('Error', 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  }

  // Phone entry screen (for phone-link flow where no phone passed)
  if (isLinking && !otpSent) {
    const formattedNewPhone = () => {
      const p = newPhone.replace(/\s/g, '');
      if (p.startsWith('0')) return '+254' + p.slice(1);
      if (p.startsWith('254')) return '+' + p;
      return p;
    };

    return (
      <View style={s.container}>
        <SafeAreaView edges={['top']}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={s.body}>
          <View style={s.iconWrap}>
            <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
          </View>
          <Text style={s.heading}>Verify Your Phone</Text>
          <Text style={s.subheading}>
            Link your phone number to prevent duplicate accounts and protect your referral earnings.
          </Text>
          <View style={{ width: '100%' }}>
            <View style={s.phoneInputRow}>
              <View style={s.prefix}><Text style={s.prefixTxt}>🇰🇪 +254</Text></View>
              <TextInput
                style={s.phoneField}
                placeholder="712 345 678"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={v => { setNewPhone(v); setNewPhoneErr(''); }}
                autoFocus
              />
            </View>
            {newPhoneErr ? (
              <Text style={{ color: colors.error, marginTop: 6, fontSize: FONTS.xs }}>{newPhoneErr}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={[s.verifyBtn, sendingNew && { opacity: 0.6 }]}
            disabled={sendingNew}
            onPress={async () => {
              const fp = formattedNewPhone();
              if (!/^\+254[0-9]{9}$/.test(fp)) { setNewPhoneErr('Enter a valid number'); return; }
              setSendingNew(true);
              setPhone(fp);
              await sendOtp(fp);
              setSendingNew(false);
            }}
            activeOpacity={0.85}
          >
            {sendingNew ? <ActivityIndicator color="#fff" /> : <Text style={s.verifyBtnText}>Send Code</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        <SafeAreaView edges={['top']}>
          {!isLinking && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
        </SafeAreaView>

        <View style={s.body}>
          <View style={s.iconWrap}>
            <Ionicons name={isLinking ? 'lock-closed-outline' : 'phone-portrait-outline'} size={36} color={colors.primary} />
          </View>

          <Text style={s.heading}>{isLinking ? 'Link Your Phone' : 'Verify Your Number'}</Text>
          <Text style={s.subheading}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={s.phoneHighlight}>{phone}</Text>
          </Text>

          {devOtp ? (
            <View style={s.devBox}>
              <Text style={s.devLabel}>Dev OTP</Text>
              <Text style={s.devCode}>{devOtp}</Text>
            </View>
          ) : null}

          <View style={s.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={r => { inputRefs.current[i] = r; }}
                style={[s.otpInput, digit ? s.otpInputFilled : null]}
                value={digit}
                onChangeText={v => handleOtpChange(v, i)}
                onKeyPress={e => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                selectTextOnFocus
                caretHidden
              />
            ))}
          </View>

          <TouchableOpacity
            style={[s.verifyBtn, (!isComplete || verifying) && s.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={!isComplete || verifying}
            activeOpacity={0.85}
          >
            {verifying
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.verifyBtnText}>{isLinking ? 'Link & Continue' : 'Verify & Continue'}</Text>}
          </TouchableOpacity>

          <View style={s.resendRow}>
            <Text style={s.resendLabel}>Didn't receive it? </Text>
            {countdown > 0 ? (
              <Text style={s.resendCountdown}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending} hitSlop={6}>
                {resending
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <Text style={s.resendLink}>Resend OTP</Text>}
              </TouchableOpacity>
            )}
          </View>

          {isLinking && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.lg }}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
              <Text style={s.linkingNote}>One phone number per account prevents referral abuse</Text>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    backBtn: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, width: 52 },
    body: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, alignItems: 'center' },
    iconWrap: {
      width: 80, height: 80, borderRadius: RADIUS['2xl'],
      backgroundColor: colors.primaryMuted,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    heading: {
      fontSize: FONTS['2xl'],
      fontWeight: FONT_WEIGHT.extraBold,
      color: colors.textPrimary,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    subheading: {
      fontSize: FONTS.base,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: SPACING.xl,
    },
    phoneHighlight: { color: colors.primary, fontWeight: FONT_WEIGHT.bold },

    devBox: {
      backgroundColor: colors.primaryMuted,
      borderRadius: RADIUS.sm, padding: SPACING.md,
      marginBottom: SPACING.lg,
      borderWidth: 1, borderColor: colors.primary,
      alignItems: 'center', width: '100%',
    },
    devLabel: { color: colors.textMuted, fontSize: FONTS.xs, marginBottom: 4 },
    devCode: { color: colors.primary, fontWeight: FONT_WEIGHT.extraBold, fontSize: FONTS['2xl'], letterSpacing: 8 },

    otpRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING['2xl'] },
    otpInput: {
      width: 46, height: 56, borderRadius: RADIUS.md,
      backgroundColor: colors.surface,
      borderWidth: 1.5, borderColor: colors.border,
      color: colors.textPrimary,
      fontSize: 22, fontWeight: FONT_WEIGHT.bold,
      textAlign: 'center',
    },
    otpInputFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },

    verifyBtn: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.base,
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    verifyBtnDisabled: { opacity: 0.4 },
    verifyBtnText: { color: '#fff', fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold },

    resendRow: { flexDirection: 'row', alignItems: 'center' },
    resendLabel: { color: colors.textMuted, fontSize: FONTS.sm },
    resendCountdown: { color: colors.textSecondary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },
    resendLink: { color: colors.primary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold },

    linkingNote: { color: colors.textMuted, fontSize: FONTS.xs, textAlign: 'center' },

    phoneInputRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden',
      width: '100%', marginBottom: SPACING.lg,
    },
    prefix: {
      paddingHorizontal: SPACING.md, paddingVertical: 14,
      borderRightWidth: 1, borderRightColor: colors.border,
    },
    prefixTxt: { color: colors.textSecondary, fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },
    phoneField: { flex: 1, color: colors.textPrimary, fontSize: FONTS.base, paddingHorizontal: SPACING.md, paddingVertical: 14 },
  });
}
