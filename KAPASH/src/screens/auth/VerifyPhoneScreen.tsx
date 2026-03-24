/**
 * VerifyPhoneScreen
 * Place at: src/screens/auth/VerifyPhoneScreen.tsx
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
  const { phone } = route.params || {};
  const { handleLoginSuccess } = useAuth();

  const [otp, setOtp]             = useState(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputRefs                 = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleOtpChange(val: string, idx: number) {
    // Handle full-OTP paste
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

  const fullOtp   = otp.join('');
  const isComplete = fullOtp.length === OTP_LENGTH && otp.every(d => d !== '');

  async function handleVerify() {
    if (!isComplete || verifying) return;
    setVerifying(true);
    try {
      const res = await AUTH.verifyOtp(phone, fullOtp);
      const payload = res.data?.data || res.data || {};
      const { accessToken, refreshToken, user } = payload;

      if (accessToken && user) {
        await handleLoginSuccess(user, accessToken, refreshToken);
      } else {
        Alert.alert('Error', 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid OTP. Please try again.';
      Alert.alert('Verification Failed', msg);
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
      await AUTH.sendOtp(phone);
      setCountdown(RESEND_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      Alert.alert('Sent!', 'A new OTP has been sent to your phone.');
    } catch {
      Alert.alert('Error', 'Could not resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.container}>
        <SafeAreaView>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backArrow}>←</Text>
          </TouchableOpacity>
        </SafeAreaView>

        <View style={s.body}>
          <View style={s.iconWrap}>
            <Text style={s.iconEmoji}>📱</Text>
          </View>

          <Text style={s.heading}>Verify Your Number</Text>
          <Text style={s.subheading}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={s.phoneHighlight}>{phone}</Text>
          </Text>

          {/* OTP boxes */}
          <View style={s.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[s.otpInput, digit ? s.otpInputFilled : null]}
                value={digit}
                onChangeText={(v) => handleOtpChange(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
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
              : <Text style={s.verifyBtnText}>Verify & Continue</Text>
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

          {__DEV__ && (
            <Text style={s.devHint}>Dev mode: check server console for OTP</Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0F1923' },
  backBtn:          { paddingHorizontal: 16, paddingVertical: 12, width: 52 },
  backArrow:        { fontSize: 22, color: '#fff' },
  body:             { flex: 1, paddingHorizontal: 24, paddingTop: 20, alignItems: 'center' },
  iconWrap:         { width: 80, height: 80, borderRadius: 24, backgroundColor: '#1A2535', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  iconEmoji:        { fontSize: 36 },
  heading:          { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 12, textAlign: 'center' },
  subheading:       { fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  phoneHighlight:   { color: '#22C55E', fontWeight: '700' },
  otpRow:           { flexDirection: 'row', gap: 10, marginBottom: 36 },
  otpInput:         { width: 46, height: 56, borderRadius: 12, backgroundColor: '#1A2535', borderWidth: 1.5, borderColor: '#374151', color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  otpInputFilled:   { borderColor: '#22C55E', backgroundColor: '#22C55E22' },
  verifyBtn:        { width: '100%', backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  verifyBtnDisabled:{ opacity: 0.4 },
  verifyBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow:        { flexDirection: 'row', alignItems: 'center' },
  resendLabel:      { color: '#6B7280', fontSize: 14 },
  resendCountdown:  { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  resendLink:       { color: '#22C55E', fontSize: 14, fontWeight: '700' },
  devHint:          { marginTop: 24, color: '#374151', fontSize: 12, textAlign: 'center' },
});