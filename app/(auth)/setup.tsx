import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { doc, setDoc, getDoc, collection, Timestamp } from 'firebase/firestore';
import { hash } from 'bcryptjs';
import { ensureFirebase } from '../../lib/firebase';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';

const EMOJI_OPTIONS = ['🌿', '🌸', '🦋', '🌙', '⭐', '🌊', '🍂', '🌻'];
const DEFAULT_CHILD_CODE = '2026';

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function SetupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🌿');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [familyCode, setFamilyCode] = useState('');

  async function handleCreate() {
    const { auth, db } = ensureFirebase();
    const user = auth.currentUser;
    if (!user) {
      showError('Hata', 'Oturum bulunamadi.');
      return;
    }

    if (!displayName.trim()) {
      showError('Hata', 'Yasemin sana nasil hitap etsin?');
      return;
    }

    setLoading(true);
    try {
      const familyRef = doc(collection(db, 'families'));
      const codeHash = await hash(DEFAULT_CHILD_CODE, 10);

      await setDoc(familyRef, {
        name: 'Bizim Ailemiz',
        childAccessCodeHash: codeHash,
        childAccessEnabled: false,
        childMinAge: 0,
        createdAt: Timestamp.now(),
      });

      await setDoc(doc(db, 'families', familyRef.id, 'members', user.uid), {
        displayName: displayName.trim(),
        role: 'parent',
        avatarEmoji: selectedEmoji,
        email: user.email,
        createdAt: Timestamp.now(),
      });

      await setDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        role: 'parent',
        familyId: familyRef.id,
        avatarEmoji: selectedEmoji,
        email: user.email,
      });

      router.replace('/');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Bir hata olustu.';
      showError('Hata', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    const { auth, db } = ensureFirebase();
    const user = auth.currentUser;
    if (!user) {
      showError('Hata', 'Oturum bulunamadi.');
      return;
    }

    if (!displayName.trim()) {
      showError('Hata', 'Yasemin sana nasil hitap etsin?');
      return;
    }

    if (!familyCode.trim()) {
      showError('Hata', 'Aile kodunu gir.');
      return;
    }

    setLoading(true);
    try {
      // Aile var mi kontrol et
      const familySnap = await getDoc(doc(db, 'families', familyCode.trim()));
      if (!familySnap.exists()) {
        showError('Hata', 'Bu kodla bir aile bulunamadi. Kodu kontrol et.');
        setLoading(false);
        return;
      }

      // Aileye uye olarak ekle
      await setDoc(doc(db, 'families', familyCode.trim(), 'members', user.uid), {
        displayName: displayName.trim(),
        role: 'parent',
        avatarEmoji: selectedEmoji,
        email: user.email,
        createdAt: Timestamp.now(),
      });

      // Kullanici profili olustur
      await setDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        role: 'parent',
        familyId: familyCode.trim(),
        avatarEmoji: selectedEmoji,
        email: user.email,
      });

      router.replace('/');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Bir hata olustu.';
      showError('Hata', message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'choose') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Hos geldin!</Text>
        <Text style={styles.subtitle}>Nasil devam etmek istersin?</Text>

        <TouchableOpacity
          style={styles.choiceCard}
          onPress={() => setMode('create')}
        >
          <Text style={styles.choiceEmoji}>🌱</Text>
          <Text style={styles.choiceTitle}>Yeni Aile Olustur</Text>
          <Text style={styles.choiceHint}>Ilk kez kullaniyorsan buradan basla</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.choiceCard}
          onPress={() => setMode('join')}
        >
          <Text style={styles.choiceEmoji}>🤝</Text>
          <Text style={styles.choiceTitle}>Mevcut Aileye Katil</Text>
          <Text style={styles.choiceHint}>Esinden aile kodunu al ve katil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === 'create' ? 'Aileyi Kur' : 'Aileye Katil'}
      </Text>
      <Text style={styles.subtitle}>Yasemin sana nasil hitap etsin?</Text>

      <TextInput
        style={styles.input}
        placeholder='Orn: "Baban" veya "Annen"'
        placeholderTextColor={COLORS.inkLight}
        value={displayName}
        onChangeText={setDisplayName}
        editable={!loading}
      />

      {mode === 'join' && (
        <TextInput
          style={styles.input}
          placeholder="Aile kodu"
          placeholderTextColor={COLORS.inkLight}
          value={familyCode}
          onChangeText={setFamilyCode}
          editable={!loading}
          autoCapitalize="none"
        />
      )}

      <Text style={styles.emojiLabel}>Bir avatar sec:</Text>
      <View style={styles.emojiRow}>
        {EMOJI_OPTIONS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.emojiButton,
              selectedEmoji === emoji && styles.emojiSelected,
            ]}
            onPress={() => setSelectedEmoji(emoji)}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={mode === 'create' ? handleCreate : handleJoin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? 'Bekleyin...'
            : mode === 'create'
            ? 'Aileyi Kur'
            : 'Aileye Katil'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode('choose')} disabled={loading}>
        <Text style={styles.backText}>Geri don</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.inkLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  choiceCard: {
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  choiceEmoji: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  choiceTitle: {
    fontSize: 18,
    fontFamily: FONTS.uiBold,
    color: COLORS.ink,
  },
  choiceHint: {
    fontSize: 14,
    fontFamily: FONTS.ui,
    color: COLORS.inkLight,
    marginTop: SPACING.xs,
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
    marginBottom: SPACING.lg,
  },
  emojiLabel: {
    fontSize: 14,
    fontFamily: FONTS.ui,
    color: COLORS.inkLight,
    marginBottom: SPACING.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.warmWhite,
  },
  emojiSelected: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldLight,
  },
  emoji: {
    fontSize: 24,
  },
  button: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.warmWhite,
    fontSize: 16,
    fontFamily: FONTS.uiBold,
  },
  backText: {
    color: COLORS.inkLight,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: FONTS.ui,
    marginTop: SPACING.lg,
  },
});
