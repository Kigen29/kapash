import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AUTH } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ColorPalette, FONTS, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

type Step = 'details' | 'otp';

export default function SignUpScreen({ navigation }: any) {
  const { handleLoginSuccess } = useAuth();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const formattedPhone = () => {
    const p = phone.replace(/\s/g, '');
    if (p.startsWith('0')) return '+254' + p.slice(1);
    if (p.startsWith('254')) return '+' + p;
    return p;
  };

  const handleSendOtp = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('Enter your full name');
      return;
    }
    const fp = formattedPhone();
    if (!/^\+254[0-9]{9}$/.test(fp)) {
      setError('Enter a valid Safaricom number e.g. 0712345678');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await AUTH.sendOtp(fp, name.trim());
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
      const { data } = await AUTH.verifyOtp(formattedPhone(), otp, name.trim());
      await handleLoginSuccess(data.data.user, data.data.accessToken, data.data.refreshToken);
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
        colors={['rgba(0,0,0,0.3)', 'rgba(15,25,35,0.9)', '#0F1923']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => step === 'otp' ? setStep('details') : navigation.goBack()}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
              <Text style={s.backTxt}>Back</Text>
            </TouchableOpacity>

            <View style={s.card}>
              {step === 'details' ? (
                <>
                  <Text style={s.title}>Create account</Text>
                  <Text style={s.subtitle}>Join Kapash and start booking pitches</Text>

                  {error ? (
                    <View style={s.errorBox}>
                      <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                      <Text style={s.errorTxt}>{error}</Text>
                    </View>
                  ) : null}

                  <View style={s.field}>
                    <Text style={s.label}>Full Name</Text>
                    <TextInput
                      style={s.input}
                      placeholder="John Doe"
                      placeholderTextColor="#6B7280"
                      value={name}
                      onChangeText={t => { setError(''); setName(t); }}
                      returnKeyType="next"
                    />
                  </View>

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
                      />
                    </View>
                  </View>

                  <TouchableOpacity onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
                    <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.btn}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Send OTP</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.title}>Verify number</Text>
                  <Text style={s.subtitle}>OTP sent to {formattedPhone()}</Text>

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
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Create Account</Text>}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.resendRow} onPress={() => setStep('details')} hitSlop={8}>
                    <Text style={s.grayTxt}>Wrong number? <Text style={s.greenTxt}>Go back</Text></Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={s.loginRow}>
                <Text style={s.grayTxt}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={6}>
                  <Text style={s.greenTxt}>Sign in</Text>
                </TouchableOpacity>
              </View>
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
    scroll: { flexGrow: 1, padding: SPACING.lg, paddingTop: SPACING.base },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: SPACING.base },
    backTxt: { color: '#9CA3AF', fontSize: FONTS.sm },

    card: {
      backgroundColor: '#1A2535',
      borderRadius: RADIUS['2xl'],
      padding: SPACING.xl,
      marginBottom: SPACING.xl,
      shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
    },
    title: { fontSize: FONTS.xl, fontWeight: FONT_WEIGHT.bold, color: '#fff', marginBottom: 4 },
    subtitle: { fontSize: FONTS.sm, color: '#9CA3AF', marginBottom: SPACING.lg },

    errorBox: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: 'rgba(239,68,68,0.15)',
      borderRadius: RADIUS.sm, padding: SPACING.md,
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
    input: {
      color: '#fff', fontSize: FONTS.base,
      paddingHorizontal: SPACING.md, paddingVertical: 14,
      backgroundColor: '#0F1923',
      borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#374151',
    },
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

    resendRow: { alignItems: 'center', marginBottom: SPACING.sm },
    loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xs },
    grayTxt: { color: '#9CA3AF', fontSize: FONTS.sm },
    greenTxt: { color: colors.primary, fontWeight: FONT_WEIGHT.semiBold, fontSize: FONTS.sm },
  });
}
