import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { compare } from 'bcryptjs';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 dakika

export default function YaseminScreen() {
  const [code, setCode] = useState(['', '', '', '']);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Kilit süresi dolunca temizle
    if (lockedUntil && Date.now() >= lockedUntil) {
      setLockedUntil(null);
    }
  }, [code]);

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
    if (index === 3 && value && !verifying) {
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

    setVerifying(true);
    try {
      // Şimdilik sistemdeki İLK aileyi alıyoruz (Demo için)
      // Faz 4'te bu QR veya davet linkiyle gelecek
      const familyQuery = query(collection(db, 'families'), limit(1));
      const familySnap = await getDocs(familyQuery);
      
      if (familySnap.empty) {
        throw new Error('Henüz kurulmuş bir aile bulunamadı.');
      }

      const familyDoc = familySnap.docs[0];
      const familyData = familyDoc.data();
      const codeHash = familyData.childAccessCodeHash;

      if (!codeHash) {
        throw new Error('Bu aile için çocuk erişimi henüz ayarlanmamış.');
      }

      const isValid = await compare(inputCode, codeHash);

      if (isValid) {
        Alert.alert('Hoş geldin Yasemin!', 'Senin için saklanan anılara göz atabilirsin.', [
          { text: 'Başla', onPress: () => router.replace('/') }
        ]);
        // TODO: Global state'e "isChildMode: true" setle (Faz 3.2)
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
        setCode(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu.';
      Alert.alert('Hata', message);
      setCode(['', '', '', '']);
    } finally {
      setVerifying(false);
    }
  }

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌸</Text>
      <Text style={styles.title}>Merhaba Yasemin</Text>
      <Text style={styles.subtitle}>
        Sana özel 4 haneli kodunu gir
      </Text>

      <View style={styles.codeRow}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref; }}
            style={[
              styles.codeInput, 
              isLocked && styles.codeInputLocked,
              verifying && styles.codeInputVerifying
            ]}
            value={digit}
            onChangeText={(value) => handleCodeChange(index, value)}
            onKeyPress={({ nativeEvent }) =>
              handleKeyPress(index, nativeEvent.key)
            }
            keyboardType="number-pad"
            maxLength={1}
            editable={!isLocked && !verifying}
            selectTextOnFocus
          />
        ))}
      </View>

      {verifying && (
        <ActivityIndicator size="small" color={COLORS.gold} style={{ marginTop: SPACING.lg }} />
      )}

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
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.uiBold,
    color: COLORS.ink,
    textAlign: 'center',
  },
  codeInputLocked: {
    opacity: 0.4,
    backgroundColor: COLORS.creamDark,
  },
  codeInputVerifying: {
    borderColor: COLORS.goldLight,
  },
  lockText: {
    color: COLORS.danger,
    marginTop: SPACING.lg,
    fontSize: 14,
    fontFamily: FONTS.uiMedium,
  },
});
