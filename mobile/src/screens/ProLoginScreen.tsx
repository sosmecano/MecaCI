import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadow } from '../constants/theme';
import Button from '../components/Button';
import Input from '../components/Input';
import { api } from '../services/api';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'refresh_token';
const USER_TYPE_KEY = 'userType';

export default function ProLoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('+225 ');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpCode, setOtpCode] = useState('');
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); };
  }, []);

  const sendOtp = async () => {
    setLoading(true);
    try {
      const data = await api.auth.sendOtp(phone);
      if (data.code) setOtpCode(data.code);
      setStep('otp');
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
      cooldownTimer.current = timer;
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    try {
      const res = await api.professionals.verifyOtp(phone, code);
      await SecureStore.setItemAsync(TOKEN_KEY, res.token);
      await SecureStore.setItemAsync(REFRESH_KEY, res.refreshToken);
      await SecureStore.setItemAsync(USER_TYPE_KEY, 'pro');
      navigation.replace('ProTabs');
    } catch (e: any) {
      alert('Identifiants invalides');
      navigation.navigate('ProRegister');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="build" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Espace pro</Text>
          <Text style={styles.subtitle}>Mécanicien, remorqueur ou garage</Text>
        </View>

        {step === 'phone' ? (
          <>
            <Input
              label="Numéro de téléphone"
              placeholder="+225 01 01 01 01 01"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={20}
              leftIcon="call-outline"
            />
            <Button title="Continuer" onPress={sendOtp} loading={loading} disabled={phone.replace(/\s/g, '').length < 10} />
          </>
        ) : (
          <>
            <View style={styles.otpInfo}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.onSurfaceVariant} />
              <Text style={styles.info}>Code envoyé au {phone}</Text>
            </View>
            {otpCode ? (
              <View style={styles.otpDisplay}>
                <Text style={styles.otpCode}>{otpCode}</Text>
              </View>
            ) : null}
            <Input
              label="Code de vérification"
              placeholder="123456"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              leftIcon="keypad-outline"
            />
            {cooldown > 0 && <Text style={styles.cooldown}>Renvoyer dans {cooldown}s</Text>}
            <Button title="Se connecter" onPress={verifyOtp} loading={loading} disabled={code.length < 6} />
          </>
        )}

        <Button title="Créer un compte" onPress={() => navigation.navigate('ProRegister')} variant="outline" style={{ marginTop: Spacing.lg }} />
        <Button title="Application client" onPress={() => navigation.goBack()} variant="secondary" style={{ marginTop: Spacing.sm }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flex: 1, justifyContent: 'center', padding: Spacing.xl,
  },
  brandSection: {
    alignItems: 'center', marginBottom: Spacing.xxl,
  },
  logoContainer: {
    width: 72, height: 72, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.headlineLg, color: Colors.onSurface, marginBottom: Spacing.xs },
  subtitle: { ...Typography.bodyBase, color: Colors.onSurfaceVariant },
  otpInfo: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    justifyContent: 'center', marginBottom: Spacing.lg,
  },
  info: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  otpDisplay: {
    backgroundColor: Colors.primaryContainer,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg, marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  otpCode: { ...Typography.titleMd, color: Colors.onPrimaryContainer, letterSpacing: 6 },
  cooldown: { ...Typography.caption, color: Colors.onSurfaceVariant, textAlign: 'center', marginBottom: Spacing.sm },
});
