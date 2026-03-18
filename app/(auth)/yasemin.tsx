import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 dakika

export default function YaseminScreen() {
  const [code, setCode] = useState(['', '', '', '']);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  function handleCodeChange(index: number, value: string) {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Sonraki input'a otomatik geç
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // 4 hane tamamlanınca kontrol et
    if (index === 3 && value) {
      const fullCode = newCode.join('');
      verifyCode(fullCode);
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function verifyCode(inputCode: string) {
    // Kilit kontrolü
    if (lockedUntil && Date.now() < lockedUntil) {
      const remainingSec = Math.ceil((lockedUntil - Date.now()) / 1000);
      Alert.alert('Bekle', `${remainingSec} saniye sonra tekrar dene.`);
      setCode(['', '', '', '']);
      return;
    }

    // TODO: Firestore'dan familyId'yi al ve bcrypt ile doğrula
    // Şimdilik basit kontrol
    if (inputCode === '2026') {
      Alert.alert('Hoş geldin Yasemin!', 'Anılarına göz atabilirsin.');
      // TODO: Yasemin feed'ine yönlendir
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setAttempts(0);
        Alert.alert('Çok fazla deneme', '5 dakika beklemen gerekiyor.');
      } else {
        Alert.alert(
          'Yanlış kod',
          `${MAX_ATTEMPTS - newAttempts} deneme hakkın kaldı.`
        );
      }
    }

    setCode(['', '', '', '']);
    inputRefs.current[0]?.focus();
  }

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌸</Text>
      <Text style={styles.title}>Merhaba Yasemin</Text>
      <Text style={styles.subtitle}>
        Sana özel kodunu gir
      </Text>

      <View style={styles.codeRow}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref; }}
            style={[styles.codeInput, isLocked && styles.codeInputLocked]}
            value={digit}
            onChangeText={(value) => handleCodeChange(index, value)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(index, nativeEvent.key)
            }
            keyboardType="number-pad"
            maxLength={1}
            editable={!isLocked}
            selectTextOnFocus
          />
        ))}
      </View>

      {isLocked && (
        <Text style={styles.lockText}>
          Biraz bekle, sonra tekrar dene.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.inkLight,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  codeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  codeInput: {
    width: 56,
    height: 64,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.warmWhite,
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.ink,
    textAlign: 'center',
  },
  codeInputLocked: {
    opacity: 0.4,
  },
  lockText: {
    color: COLORS.danger,
    marginTop: SPACING.lg,
    fontSize: 14,
  },
});
