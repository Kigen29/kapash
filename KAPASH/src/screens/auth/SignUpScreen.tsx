/**
 * SignUpScreen - OTP flow for new users
 * Place at: src/screens/auth/SignUpScreen.tsx
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AUTH } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

type Step = 'details' | 'otp';

export default function SignUpScreen({ navigation }: any) {
  const { handleLoginSuccess } = useAuth();
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
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // verifyOtpWithName passes name in body so backend can create the user
      const { data } = await AUTH.verifyOtpWithName(formattedPhone(), otp, name.trim());
      await handleLoginSuccess(
        data.data.user,
        data.data.accessToken,
        data.data.refreshToken,
      );
      // RootNavigator auto-switches to app stack
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
            >
              <Text style={s.backTxt}>← Back</Text>
            </TouchableOpacity>

            <View style={s.card}>
              {step === 'details' ? (
                <>
                  <Text style={s.title}>Create account</Text>
                  <Text style={s.subtitle}>Join Kapash and start booking pitches</Text>

                  {error ? <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View> : null}

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
                    <LinearGradient colors={['#22C55E', '#16A34A']} style={s.btn}>
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
                      <Text style={s.devLabel}>🔑 Dev OTP (also in backend terminal):</Text>
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
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Create Account</Text>}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.resendRow} onPress={() => setStep('details')}>
                    <Text style={s.grayTxt}>Wrong number? <Text style={s.greenTxt}>Go back</Text></Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={s.loginRow}>
                <Text style={s.grayTxt}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1923' },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 16 },
  backBtn: { marginBottom: 16 },
  backTxt: { color: '#9CA3AF', fontSize: 14 },
  card: { backgroundColor: '#1A2535', borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 20 },
  errorBox: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  errorTxt: { color: '#EF4444', fontSize: 13 },
  devBox: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center' },
  devLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
  devCode: { color: '#22C55E', fontWeight: '800', fontSize: 28, letterSpacing: 8 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#D1D5DB', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F1923', borderRadius: 12, borderWidth: 1, borderColor: '#374151', overflow: 'hidden' },
  prefix: { paddingHorizontal: 12, paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#374151' },
  prefixTxt: { color: '#D1D5DB', fontSize: 13, fontWeight: '600' },
  phoneInput: { flex: 1, color: '#fff', fontSize: 15, paddingHorizontal: 14, paddingVertical: 14 },
  input: { color: '#fff', fontSize: 15, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#0F1923', borderRadius: 12, borderWidth: 1, borderColor: '#374151' },
  otpInput: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 10, textAlign: 'center', backgroundColor: '#0F1923', borderRadius: 12, borderWidth: 1, borderColor: '#374151', paddingVertical: 16 },
  btn: { height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendRow: { alignItems: 'center', marginBottom: 8 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  grayTxt: { color: '#9CA3AF', fontSize: 13 },
  greenTxt: { color: '#22C55E', fontWeight: '600', fontSize: 13 },
});