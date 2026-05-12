import React, { useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { AUTH } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';
import { User } from '../../types';

WebBrowser.maybeCompleteAuthSession();

type Step = 'social' | 'phone' | 'otp';

export default function LoginScreen({ navigation }: any) {
  const { handleLoginSuccess, handleSocialLoginSuccess, devLogin } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState<Step>('social');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const [_request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId:        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
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
        payload.user as User, payload.accessToken, payload.refreshToken,
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
        payload.user as User, payload.accessToken, payload.refreshToken,
        data.requiresPhoneVerification || false,
      );
      if (data.requiresPhoneVerification) {
        navigation.navigate('VerifyPhone', { isLinking: true });
      }
    } catch (err: any) {
      if (err.code !== 'ERR_CANCELED') setError(err.message || 'Apple sign-in failed.');
    } finally {
      setAppleLoading(false);
    }
  }

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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Logo */}
            <View style={s.logoWrap}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.logoBadge}>
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

                  {error ? (
                    <View style={s.errorBox}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                      <Text style={s.errorTxt}>{error}</Text>
                    </View>
                  ) : null}

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
                        <Text style={s.googleG}>G</Text>
                        <Text style={s.socialBtnTxt}>Continue with Google</Text>
                      </>
                    )}
                  </TouchableOpacity>

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
                          <Ionicons name="logo-apple" size={20} color="#fff" />
                          <Text style={[s.socialBtnTxt, { color: '#fff' }]}>Continue with Apple</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <View style={s.divider}>
                    <View style={s.dividerLine} />
                    <Text style={s.dividerTxt}>or use phone number</Text>
                    <View style={s.dividerLine} />
                  </View>

                  <TouchableOpacity style={s.phoneBtn} onPress={() => setStep('phone')} activeOpacity={0.85}>
                    <Ionicons name="call-outline" size={18} color="#D1D5DB" />
                    <Text style={s.phoneBtnTxt}>Sign in with Phone OTP</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === 'phone' && (
                <>
                  <TouchableOpacity onPress={() => { setStep('social'); setError(''); setPhone(''); }} style={s.backRow} hitSlop={8}>
                    <Ionicons name="chevron-back" size={18} color="#9CA3AF" />
                    <Text style={s.backTxt}>Back</Text>
                  </TouchableOpacity>

                  <Text style={s.title}>Phone Sign In</Text>
                  <Text style={s.subtitle}>Enter your Safaricom number</Text>

                  {error ? (
                    <View style={s.errorBox}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                      <Text style={s.errorTxt}>{error}</Text>
                    </View>
                  ) : null}

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
                    <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.btn}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Send OTP</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {step === 'otp' && (
                <>
                  <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); setError(''); }} style={s.backRow} hitSlop={8}>
                    <Ionicons name="chevron-back" size={18} color="#9CA3AF" />
                    <Text style={s.backTxt}>Change number</Text>
                  </TouchableOpacity>

                  <Text style={s.title}>Enter OTP</Text>
                  <Text style={s.subtitle}>Sent to {formattedPhone()}</Text>

                  {devOtp ? (
                    <View style={s.devBox}>
                      <Text style={s.devLabel}>Dev OTP</Text>
                      <Text style={s.devCode}>{devOtp}</Text>
                    </View>
                  ) : null}

                  {error ? (
                    <View style={s.errorBox}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                      <Text style={s.errorTxt}>{error}</Text>
                    </View>
                  ) : null}

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
                    <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.btn}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Verify & Sign In</Text>}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.resendRow} onPress={() => { setStep('phone'); setOtp(''); setDevOtp(''); }} hitSlop={8}>
                    <Text style={s.grayTxt}>Didn't receive it? <Text style={s.greenTxt}>Resend OTP</Text></Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Sign up link */}
              <View style={s.signupRow}>
                <Text style={s.grayTxt}>New to Kapash? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')} hitSlop={6}>
                  <Text style={s.greenTxt}>Create account</Text>
                </TouchableOpacity>
              </View>

              {/* DEV bypass */}
              {__DEV__ && step === 'social' && (
                <View style={s.devBypassWrap}>
                  <Text style={s.devBypassLabel}>🛠 Dev bypass</Text>
                  <View style={s.devBypassRow}>
                    <TouchableOpacity
                      style={[s.devBypassBtn, { backgroundColor: colors.primary }]}
                      onPress={async () => {
                        try { await devLogin('PLAYER'); }
                        catch (e: any) { Alert.alert('Dev login failed', e?.message || 'Unknown error. Is the backend running?'); }
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.devBypassTxt}>Enter as Player</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.devBypassBtn, { backgroundColor: '#3B82F6' }]}
                      onPress={async () => {
                        try { await devLogin('OWNER'); }
                        catch (e: any) { Alert.alert('Dev login failed', e?.message || 'Unknown error. Is the backend running?'); }
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.devBypassTxt}>Enter as Owner</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.devBypassBtn, { backgroundColor: '#A855F7' }]}
                      onPress={async () => {
                        try { await devLogin('ADMIN'); }
                        catch (e: any) { Alert.alert('Dev login failed', e?.message || 'Unknown error. Is the backend running?'); }
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={s.devBypassTxt}>Enter as Admin</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F1923' },
    scroll: { flexGrow: 1, justifyContent: 'flex-end', padding: SPACING.lg },

    logoWrap: { alignItems: 'center', marginBottom: SPACING['2xl'] },
    logoBadge: {
      width: 64, height: 64, borderRadius: RADIUS.xl,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: SPACING.md,
    },
    logoTxt: { fontSize: FONTS['4xl'], fontWeight: FONT_WEIGHT.extraBold, color: '#fff' },
    appName: { fontSize: FONTS['3xl'], fontWeight: FONT_WEIGHT.extraBold, color: '#fff', letterSpacing: 4 },
    tagline: { fontSize: FONTS.sm, color: '#9CA3AF', marginTop: 4 },

    card: {
      backgroundColor: '#1A2535',
      borderRadius: RADIUS['2xl'],
      padding: SPACING.xl,
      marginBottom: SPACING.xl,
      shadowColor: '#000',
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 12,
    },
    title: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: '#fff', marginBottom: 4 },
    subtitle: { fontSize: FONTS.sm, color: '#9CA3AF', marginBottom: SPACING.lg },

    socialBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      backgroundColor: '#fff',
      borderRadius: RADIUS.md,
      height: 52,
      marginBottom: SPACING.md,
    },
    appleBtn: { backgroundColor: '#000' },
    googleG: {
      fontSize: 18,
      fontWeight: FONT_WEIGHT.extraBold,
      color: '#4285F4',
    },
    socialBtnTxt: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: '#111827' },

    divider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: SPACING.base },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#374151' },
    dividerTxt: { color: '#6B7280', fontSize: FONTS.xs },

    phoneBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
      borderWidth: 1.5, borderColor: '#374151', borderRadius: RADIUS.md,
      height: 52,
      marginBottom: SPACING.sm,
    },
    phoneBtnTxt: { color: '#D1D5DB', fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },

    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(239,68,68,0.15)',
      borderRadius: RADIUS.sm,
      padding: SPACING.md,
      marginBottom: SPACING.base,
      borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    },
    errorTxt: { color: colors.error, fontSize: FONTS.xs, flex: 1 },

    devBox: {
      backgroundColor: 'rgba(34,197,94,0.1)',
      borderRadius: RADIUS.sm, padding: SPACING.md,
      marginBottom: SPACING.base,
      borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
      alignItems: 'center',
    },
    devLabel: { color: '#9CA3AF', fontSize: FONTS.xs, marginBottom: 4 },
    devCode: { color: colors.primary, fontWeight: FONT_WEIGHT.extraBold, fontSize: FONTS['3xl'], letterSpacing: 8 },

    field: { marginBottom: SPACING.base },
    label: { fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold, color: '#D1D5DB', marginBottom: 6 },
    inputRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#0F1923',
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#374151',
      overflow: 'hidden',
    },
    prefix: { paddingHorizontal: SPACING.md, paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#374151' },
    prefixTxt: { color: '#D1D5DB', fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.semiBold },
    phoneInput: { flex: 1, color: '#fff', fontSize: FONTS.base, paddingHorizontal: SPACING.md, paddingVertical: 14 },
    otpInput: {
      color: '#fff', fontSize: FONTS['3xl'], fontWeight: FONT_WEIGHT.extraBold,
      letterSpacing: 10, textAlign: 'center',
      backgroundColor: '#0F1923',
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#374151',
      paddingVertical: SPACING.base,
    },

    btn: { height: 52, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.base },
    btnTxt: { color: '#fff', fontSize: FONTS.base, fontWeight: FONT_WEIGHT.bold },

    backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.md },
    backTxt: { color: '#9CA3AF', fontSize: FONTS.sm },

    resendRow: { alignItems: 'center', marginBottom: SPACING.sm },

    signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xs },
    grayTxt: { color: '#9CA3AF', fontSize: FONTS.sm },
    greenTxt: { color: colors.primary, fontWeight: FONT_WEIGHT.semiBold, fontSize: FONTS.sm },

    devBypassWrap: {
      marginTop: SPACING.lg, paddingTop: SPACING.base,
      borderTopWidth: 1, borderTopColor: 'rgba(251,191,36,0.3)',
    },
    devBypassLabel: {
      color: '#FBBF24', fontSize: 11, fontWeight: FONT_WEIGHT.bold,
      textAlign: 'center', marginBottom: SPACING.sm, letterSpacing: 1,
    },
    devBypassRow: { flexDirection: 'row', gap: SPACING.sm },
    devBypassBtn: {
      flex: 1, height: 44, borderRadius: RADIUS.md,
      justifyContent: 'center', alignItems: 'center',
    },
    devBypassTxt: { color: '#fff', fontSize: FONTS.sm, fontWeight: FONT_WEIGHT.bold },
  });
}
