import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { doc, setDoc, collection, Timestamp } from 'firebase/firestore';
import { hash } from 'bcryptjs';
import { auth, db } from '../../lib/firebase';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const EMOJI_OPTIONS = ['🌿', '🌸', '🦋', '🌙', '⭐', '🌊', '🍂', '🌻'];
const DEFAULT_CHILD_CODE = '2026';

export default function SetupScreen() {
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🌿');
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Hata', 'Oturum bulunamadı.');
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Hata', 'Yasemin sana nasıl hitap etsin?');
      return;
    }

    setLoading(true);
    try {
      // Aile oluştur
      const familyRef = doc(collection(db, 'families'));
      const codeHash = await hash(DEFAULT_CHILD_CODE, 10);

      await setDoc(familyRef, {
        name: 'Bizim Ailemiz',
        childAccessCodeHash: codeHash,
        childAccessEnabled: false,
        childMinAge: 0,
        createdAt: Timestamp.now(),
      });

      // Aile üyesi ekle
      await setDoc(doc(db, 'families', familyRef.id, 'members', user.uid), {
        displayName: displayName.trim(),
        role: 'parent',
        avatarEmoji: selectedEmoji,
        email: user.email,
        createdAt: Timestamp.now(),
      });

      // Kullanıcı profili oluştur
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
        error instanceof Error ? error.message : 'Bir hata oluştu.';
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hoş geldin!</Text>
      <Text style={styles.subtitle}>
        Yasemin sana nasıl hitap etsin?
      </Text>

      <TextInput
        style={styles.input}
        placeholder='Örn: "Baban" veya "Annen"'
        placeholderTextColor={COLORS.inkLight}
        value={displayName}
        onChangeText={setDisplayName}
        editable={!loading}
      />

      <Text style={styles.emojiLabel}>Bir avatar seç:</Text>
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
        onPress={handleSetup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Kuruluyor...' : 'Aileyi Kur'}
        </Text>
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
    fontWeight: '700',
    color: COLORS.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.inkLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  input: {
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.ink,
    marginBottom: SPACING.lg,
  },
  emojiLabel: {
    fontSize: 14,
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
    fontWeight: '700',
  },
});
