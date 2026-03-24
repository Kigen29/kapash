/**
 * LoginScreen - Social Login + OTP fallback
 * Place at: src/screens/auth/LoginScreen.tsx
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { AUTH } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';

WebBrowser.maybeCompleteAuthSession();

type Step = 'social' | 'phone' | 'otp';

export default function LoginScreen({ navigation }: any) {
  const { handleLoginSuccess, handleSocialLoginSuccess } = useAuth();
  const [step, setStep] = useState<Step>('social');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  // ── Google Auth ──────────────────────────────────────────────────────────
  const [_request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: 'YOUR_GOOGLE_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleToken(id_token);
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      setError('Google sign-in failed. Please try again.');
    }
  }, [response]);

  async function handleGoogleToken(idToken: string) {
    setGoogleLoading(true);
    setError('');
    try {
      const { data } = await AUTH.socialLogin('google', idToken);
      const payload = data.data || data;
      await handleSocialLoginSuccess(
        payload.user as User,
        payload.accessToken,
        payload.refreshToken,
        data.requiresPhoneVerification || false,
      );
      if (data.requiresPhoneVerification) {
        navigation.navigate('VerifyPhone', { isLinking: true });
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  }

  // ── Apple Auth ───────────────────────────────────────────────────────────
  async function handleAppleSignIn() {
    setAppleLoading(true);
    setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { data } = await AUTH.socialLogin('apple', credential.identityToken!, {
        givenName:  credential.fullName?.givenName  || undefined,
        familyName: credential.fullName?.familyName || undefined,
      });
      const payload = data.data || data;
      await handleSocialLoginSuccess(
        payload.user as User,
        payload.accessToken,
        payload.refreshToken,
        data.requiresPhoneVerification || false,
      );
      if (data.requiresPhoneVerification) {
        navigation.navigate('VerifyPhone', { isLinking: true });
      }
    } catch (err: any) {
      if (err.code !== 'ERR_CANCELED') {
        setError(err.message || 'Apple sign-in failed.');
      }
    } finally {
      setAppleLoading(false);
    }
  }

  // ── Phone OTP ────────────────────────────────────────────────────────────
  const formattedPhone = () => {
    const p = phone.replace(/\s/g, '');
    if (p.startsWith('0')) return '+254' + p.slice(1);
    if (p.startsWith('254')) return '+' + p;
    return p;
  };

  const handleSendOtp = async () => {
    const fp = formattedPhone();
    if (!/^\+254[0-9]{9}$/.test(fp)) {
      setError('Enter a valid Safaricom number e.g. 0712345678');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await AUTH.sendOtp(fp);
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await AUTH.verifyOtp(formattedPhone(), otp);
      const payload = data.data || data;
      await handleLoginSuccess(payload.user as User, payload.accessToken, payload.refreshToken);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800' }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(15,25,35,0.88)', '#0F1923']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={s.logoWrap}>
              <LinearGradient colors={['#22C55E', '#16A34A']} style={s.logoBadge}>
                <Text style={s.logoTxt}>K</Text>
              </LinearGradient>
              <Text style={s.appName}>KAPASH</Text>
              <Text style={s.tagline}>Book your pitch, play your game</Text>
            </View>

            <View style={s.card}>
              {step === 'social' && (
                <>
                  <Text style={s.title}>Welcome back</Text>
                  <Text style={s.subtitle}>Sign in to your account</Text>

                  {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

                  {/* Google */}
                  <TouchableOpacity
                    style={s.socialBtn}
                    onPress={() => { setGoogleLoading(true); setError(''); promptAsync(); }}
                    disabled={googleLoading || appleLoading}
                    activeOpacity={0.85}
                  >
                    {googleLoading ? (
                      <ActivityIndicator color="#111827" />
                    ) : (
                      <>
                        <Text style={s.socialBtnIcon}>G</Text>
                        <Text style={s.socialBtnTxt}>Continue with Google</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Apple (iOS only) */}
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={[s.socialBtn, s.appleBtn]}
                      onPress={handleAppleSignIn}
                      disabled={googleLoading || appleLoading}
                      activeOpacity={0.85}
                    >
                      {appleLoading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Text style={[s.socialBtnIcon, { color: '#fff' }]}>🍎</Text>
                          <Text style={[s.socialBtnTxt, { color: '#fff' }]}>Continue with Apple</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Divider */}
                  <View style={s.divider}>
                    <View style={s.dividerLine} />
                    <Text style={s.dividerTxt}>or use phone number</Text>
                    <View style={s.dividerLine} />
                  </View>

                  {/* Phone OTP option */}
                  <TouchableOpacity
                    style={s.phoneBtn}
                    onPress={() => setStep('phone')}
                    activeOpacity={0.85}
                  >
                    <Text style={s.phoneBtnTxt}>📱 Sign in with Phone OTP</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'phone' && (
                <>
                  <TouchableOpacity
                    onPress={() => { setStep('social'); setError(''); setPhone(''); }}
                    style={s.backRow}
                  >
                    <Text style={s.backTxt}>← Back</Text>
                  </TouchableOpacity>

                  <Text style={s.title}>Phone Sign In</Text>
                  <Text style={s.subtitle}>Enter your Safaricom number</Text>

                  {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

                  <View style={s.field}>
                    <Text style={s.label}>Phone Number</Text>
                    <View style={s.inputRow}>
                      <View style={s.prefix}><Text style={s.prefixTxt}>🇰🇪 +254</Text></View>
                      <TextInput
                        style={s.phoneInput}
                        placeholder="712 345 678"
                        placeholderTextColor="#6B7280"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={t => { setError(''); setPhone(t); }}
                        returnKeyType="done"
                        onSubmitEditing={handleSendOtp}
                        autoFocus
                      />
                    </View>
                  </View>

                  <TouchableOpacity onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
                    <LinearGradient colors={['#22C55E', '#16A34A']} style={s.btn}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Send OTP</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {step === 'otp' && (
                <>
                  <TouchableOpacity
                    onPress={() => { setStep('phone'); setOtp(''); setError(''); }}
                    style={s.backRow}
                  >
                    <Text style={s.backTxt}>← Change number</Text>
                  </TouchableOpacity>

                  <Text style={s.title}>Enter OTP</Text>
                  <Text style={s.subtitle}>Sent to {formattedPhone()}</Text>

                  {devOtp ? (
                    <View style={s.devBox}>
                      <Text style={s.devLabel}>🔑 Dev OTP:</Text>
                      <Text style={s.devCode}>{devOtp}</Text>
                    </View>
                  ) : null}

                  {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

                  <View style={s.field}>
                    <Text style={s.label}>6-Digit Code</Text>
                    <TextInput
                      style={s.otpInput}
                      placeholder="000000"
                      placeholderTextColor="#6B7280"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otp}
                      onChangeText={t => { setError(''); setOtp(t); }}
                      returnKeyType="done"
                      onSubmitEditing={handleVerifyOtp}
                      autoFocus
                    />
                  </View>

                  <TouchableOpacity onPress={handleVerifyOtp} disabled={loading} activeOpacity={0.85}>
                    <LinearGradient colors={['#22C55E', '#16A34A']} style={s.btn}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Verify & Sign In</Text>}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.resendRow}
                    onPress={() => { setStep('phone'); setOtp(''); setDevOtp(''); }}
                  >
                    <Text style={s.grayTxt}>Didn't receive it? <Text style={s.greenTxt}>Resend OTP</Text></Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Sign up link */}
              <View style={s.signupRow}>
                <Text style={s.grayTxt}>New to Kapash? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={s.greenTxt}>Create account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1923' },
  scroll: { flexGrow: 1, justifyContent: 'flex-end', padding: 20 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoBadge: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoTxt: { fontSize: 32, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: 4 },
  tagline: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  card: {
    backgroundColor: '#1A2535', borderRadius: 24, padding: 24, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 20 },

  // Social buttons
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, height: 52, marginBottom: 12,
  },
  appleBtn: { backgroundColor: '#000' },
  socialBtnIcon: { fontSize: 18, fontWeight: '800', color: '#111827' },
  socialBtnTxt: { fontSize: 15, fontWeight: '600', color: '#111827' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#374151' },
  dividerTxt: { color: '#6B7280', fontSize: 12 },

  phoneBtn: {
    borderWidth: 1.5, borderColor: '#374151', borderRadius: 14,
    height: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  phoneBtnTxt: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  errorTxt: { color: '#EF4444', fontSize: 13 },
  devBox: {
    backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center',
  },
  devLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
  devCode: { color: '#22C55E', fontWeight: '800', fontSize: 28, letterSpacing: 8 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#D1D5DB', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1923',
    borderRadius: 12, borderWidth: 1, borderColor: '#374151', overflow: 'hidden',
  },
  prefix: { paddingHorizontal: 12, paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#374151' },
  prefixTxt: { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },
  phoneInput: { flex: 1, color: '#fff', fontSize: 15, paddingHorizontal: 14, paddingVertical: 14 },
  otpInput: {
    color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 10, textAlign: 'center',
    backgroundColor: '#0F1923', borderRadius: 12, borderWidth: 1, borderColor: '#374151', paddingVertical: 16,
  },

  btn: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backRow: { marginBottom: 12 },
  backTxt: { color: '#9CA3AF', fontSize: 13 },
  resendRow: { alignItems: 'center', marginBottom: 8 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  grayTxt: { color: '#9CA3AF', fontSize: 13 },
  greenTxt: { color: '#22C55E', fontWeight: '600', fontSize: 13 },
});