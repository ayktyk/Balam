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
import { doc, setDoc, collection, Timestamp } from 'firebase/firestore';
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

  async function handleSetup() {
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
});
