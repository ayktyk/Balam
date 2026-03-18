import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Hata', 'E-posta ve şifre gerekli.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Kayıt sonrası setup ekranına yönlendir
        router.replace('/(auth)/setup');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        router.replace('/');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Bir hata oluştu.';
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Balam</Text>
        <Text style={styles.subtitle}>Yasemin için zaman kapsülü</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="E-posta"
          placeholderTextColor={COLORS.inkLight}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor={COLORS.inkLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? 'Bekleyin...'
              : isRegister
                ? 'Kayıt Ol'
                : 'Giriş Yap'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsRegister(!isRegister)}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {isRegister
              ? 'Zaten hesabın var mı? Giriş yap'
              : 'Hesabın yok mu? Kayıt ol'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.yaseminButton}
          onPress={() => router.push('/(auth)/yasemin')}
        >
          <Text style={styles.yaseminText}>
            Yasemin misin? Buradan gir
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.ink,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.inkLight,
    marginTop: SPACING.sm,
  },
  form: {
    gap: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.ink,
  },
  button: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.warmWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  switchText: {
    color: COLORS.inkLight,
    textAlign: 'center',
    fontSize: 14,
    marginTop: SPACING.sm,
  },
  yaseminButton: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  yaseminText: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '600',
  },
});
