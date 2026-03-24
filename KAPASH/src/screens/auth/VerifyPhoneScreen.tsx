/**
 * VerifyPhoneScreen
 * Used for: new phone OTP users AND social auth users linking their phone
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AUTH } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyPhoneScreen({ route, navigation }: any) {
  const { phone: routePhone, isLinking } = route.params || {};
  const { handleLoginSuccess, handlePhoneVerified } = useAuth();

  const [phone, setPhone] = useState(routePhone || '');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [otpSent, setOtpSent] = useState(!!routePhone); // Auto-sent if phone passed in
  const [devOtp, setDevOtp] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // If this is a phone-link flow (social auth), send link OTP instead
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
        // Linking phone to social account
        const { data } = await AUTH.verifyPhoneLink(phone, fullOtp);
        const updatedUser = data.data?.user;
        handlePhoneVerified(updatedUser ? {
          phone: updatedUser.phone,
          phoneVerified: true,
          isVerified: true,
        } : undefined);
        // Navigation handled by RootNavigator (requiresPhoneVerification becomes false)
      } else {
        // Standard phone OTP login
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

  // ── Phone entry screen (for phone-link flow where no phone passed) ──────
  if (isLinking && !otpSent) {
    const [newPhone, setNewPhone] = useState('');
    const [sending, setSending] = useState(false);
    const [err, setErr] = useState('');

    const formattedNewPhone = () => {
      const p = newPhone.replace(/\s/g, '');
      if (p.startsWith('0')) return '+254' + p.slice(1);
      if (p.startsWith('254')) return '+' + p;
      return p;
    };

    return (
      <View style={s.container}>
        <SafeAreaView>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
        </SafeAreaView>
        <View style={s.body}>
          <View style={s.iconWrap}><Text style={s.iconEmoji}>🔒</Text></View>
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
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={v => { setNewPhone(v); setErr(''); }}
                autoFocus
              />
            </View>
            {err ? <Text style={{ color: '#EF4444', marginTop: 6, fontSize: 12 }}>{err}</Text> : null}
          </View>
          <TouchableOpacity
            style={[s.verifyBtn, sending && { opacity: 0.6 }]}
            disabled={sending}
            onPress={async () => {
              const fp = formattedNewPhone();
              if (!/^\+254[0-9]{9}$/.test(fp)) { setErr('Enter a valid number'); return; }
              setSending(true);
              setPhone(fp);
              await sendOtp(fp);
              setSending(false);
            }}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.verifyBtnText}>Send Code</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        <SafeAreaView>
          {!isLinking && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Text style={s.backArrow}>←</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>

        <View style={s.body}>
          <View style={s.iconWrap}>
            <Text style={s.iconEmoji}>{isLinking ? '🔒' : '📱'}</Text>
          </View>

          <Text style={s.heading}>
            {isLinking ? 'Link Your Phone' : 'Verify Your Number'}
          </Text>
          <Text style={s.subheading}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={s.phoneHighlight}>{phone}</Text>
          </Text>

          {devOtp ? (
            <View style={s.devBox}>
              <Text style={s.devLabel}>🔑 Dev OTP:</Text>
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
              : <Text style={s.verifyBtnText}>{isLinking ? 'Link & Continue' : 'Verify & Continue'}</Text>
            }
          </TouchableOpacity>

          <View style={s.resendRow}>
            <Text style={s.resendLabel}>Didn't receive it? </Text>
            {countdown > 0 ? (
              <Text style={s.resendCountdown}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                {resending
                  ? <ActivityIndicator color="#22C55E" size="small" />
                  : <Text style={s.resendLink}>Resend OTP</Text>
                }
              </TouchableOpacity>
            )}
          </View>

          {isLinking && (
            <Text style={s.linkingNote}>
              🛡️ One phone number per account prevents referral abuse
            </Text>
          )}

          {__DEV__ && <Text style={s.devHint}>Dev: check console for OTP</Text>}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#0F1923' },
  backBtn:           { paddingHorizontal: 16, paddingVertical: 12, width: 52 },
  backArrow:         { fontSize: 22, color: '#fff' },
  body:              { flex: 1, paddingHorizontal: 24, paddingTop: 20, alignItems: 'center' },
  iconWrap:          { width: 80, height: 80, borderRadius: 24, backgroundColor: '#1A2535', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  iconEmoji:         { fontSize: 36 },
  heading:           { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 12, textAlign: 'center' },
  subheading:        { fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  phoneHighlight:    { color: '#22C55E', fontWeight: '700' },
  devBox:            { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center', width: '100%' },
  devLabel:          { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
  devCode:           { color: '#22C55E', fontWeight: '800', fontSize: 24, letterSpacing: 8 },
  otpRow:            { flexDirection: 'row', gap: 10, marginBottom: 32 },
  otpInput:          { width: 46, height: 56, borderRadius: 12, backgroundColor: '#1A2535', borderWidth: 1.5, borderColor: '#374151', color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  otpInputFilled:    { borderColor: '#22C55E', backgroundColor: '#22C55E22' },
  verifyBtn:         { width: '100%', backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  verifyBtnDisabled: { opacity: 0.4 },
  verifyBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow:         { flexDirection: 'row', alignItems: 'center' },
  resendLabel:       { color: '#6B7280', fontSize: 14 },
  resendCountdown:   { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  resendLink:        { color: '#22C55E', fontSize: 14, fontWeight: '700' },
  linkingNote:       { marginTop: 20, color: '#6B7280', fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
  devHint:           { marginTop: 16, color: '#374151', fontSize: 12 },
  // Phone entry fields
  phoneInputRow:     { flexDirection: 'row', backgroundColor: '#1A2535', borderRadius: 12, borderWidth: 1, borderColor: '#374151', overflow: 'hidden', width: '100%', marginBottom: 20 },
  prefix:            { paddingHorizontal: 12, paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#374151' },
  prefixTxt:         { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },
  phoneField:        { flex: 1, color: '#fff', fontSize: 15, paddingHorizontal: 14, paddingVertical: 14 },
});