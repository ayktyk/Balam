import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  function showError(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      showError('Hata', 'E-posta ve sifre gerekli.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        router.replace('/(auth)/setup');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        router.replace('/');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Bir hata olustu.';
      showError('Hata', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.cream }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.glowLarge} />
          <View style={styles.glowSmall} />

          <View style={styles.heroCard}>
            <View style={styles.stamp}>
              <Image
                source={require('../../assets/splash-icon.png')}
                style={styles.stampImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>Balam</Text>
            <Text style={styles.subtitle}>Yasemin icin zaman kapsulu</Text>

            <View style={styles.promiseRow}>
              <View style={styles.promisePill}>
                <Text style={styles.promisePillText}>Mektuplar</Text>
              </View>
              <View style={styles.promisePill}>
                <Text style={styles.promisePillText}>Anilar</Text>
              </View>
              <View style={styles.promisePill}>
                <Text style={styles.promisePillText}>Ilkler</Text>
              </View>
            </View>

            <View style={styles.noteCard}>
              <Text style={styles.noteEyebrow}>Aile arsivi</Text>
              <Text style={styles.noteText}>
                Bugunun duygusunu, ilk gulusunu ve gelecege birakmak istedigin her
                seyi tek yerde tut.
              </Text>
            </View>
          </View>
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
            placeholder="Sifre"
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
              {loading ? 'Bekleyin...' : isRegister ? 'Kayit Ol' : 'Giris Yap'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsRegister(!isRegister)}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isRegister
                ? 'Zaten hesabin var mi? Giris yap'
                : 'Hesabin yok mu? Kayit ol'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.yaseminButton}
            onPress={() => router.push('/(auth)/yasemin')}
          >
            <Text style={styles.yaseminText}>Yasemin misin? Buradan gir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.xl,
  },
  hero: {
    position: 'relative',
  },
  glowLarge: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: '#E9D9B4',
    opacity: 0.45,
  },
  glowSmall: {
    position: 'absolute',
    left: -10,
    bottom: 16,
    width: 86,
    height: 86,
    borderRadius: 999,
    backgroundColor: '#E6C7B0',
    opacity: 0.5,
  },
  heroCard: {
    borderRadius: 28,
    padding: SPACING.lg,
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  stamp: {
    alignSelf: 'center',
    width: 124,
    height: 124,
    borderRadius: 999,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stampImage: {
    width: 96,
    height: 96,
  },
  title: {
    fontSize: 46,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: SPACING.sm,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.inkLight,
    textAlign: 'center',
  },
  promiseRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  promisePill: {
    borderRadius: 999,
    backgroundColor: COLORS.creamDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  promisePillText: {
    fontSize: 12,
    fontFamily: FONTS.uiBold,
    color: COLORS.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  noteCard: {
    marginTop: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cream,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noteEyebrow: {
    fontSize: 12,
    color: COLORS.gold,
    fontFamily: FONTS.uiBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.ink,
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.ui,
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
    fontFamily: FONTS.uiBold,
  },
  switchText: {
    color: COLORS.inkLight,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: FONTS.ui,
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
    fontFamily: FONTS.uiMedium,
  },
});
