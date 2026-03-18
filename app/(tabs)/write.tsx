import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { getYaseminAgeLabel } from '../../constants/yasemin';
import { EntryType } from '../../types/entry';

const ENTRY_TYPES: { key: EntryType; label: string; emoji: string }[] = [
  { key: 'letter', label: 'Mektup', emoji: '✉️' },
  { key: 'memory', label: 'Anı', emoji: '📷' },
  { key: 'milestone', label: 'Adım', emoji: '🌟' },
];

export default function WriteScreen() {
  const { user, profile } = useAuth();
  const [type, setType] = useState<EntryType>('letter');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isCapsule, setIsCapsule] = useState(false);
  const [capsuleAge, setCapsuleAge] = useState('');
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const ageLabel = getYaseminAgeLabel(now);

  async function handleSave() {
    if (!user || !profile) {
      Alert.alert('Hata', 'Oturum bulunamadı.');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Hata', 'Bir şeyler yazmalısın.');
      return;
    }

    setSaving(true);
    try {
      const entryDate = Timestamp.now();
      const capsuleUnlockAge = isCapsule && capsuleAge
        ? parseInt(capsuleAge, 10)
        : null;

      await addDoc(collection(db, 'entries'), {
        familyId: profile.familyId,
        authorId: user.uid,
        authorName: profile.displayName,
        type,
        title: title.trim() || null,
        body: body.trim(),
        photoUrls: [],
        photoCaptions: [],
        voiceUrl: null,
        milestoneTag: null,
        yaseminAgeWeeks: null,
        yaseminAgeLabel: ageLabel,
        entryDate,
        isPrivate: false,
        isCapsule,
        capsuleUnlockDate: null,
        capsuleUnlockAge,
        tags: [],
        createdAt: entryDate,
        updatedAt: entryDate,
      });

      Alert.alert('Kaydedildi', 'Anın Yasemin için saklandı.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);

      setTitle('');
      setBody('');
      setIsCapsule(false);
      setCapsuleAge('');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Bir hata oluştu.';
      Alert.alert('Hata', message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Kayıt türü seçimi */}
        <View style={styles.typeRow}>
          {ENTRY_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.typeButton,
                type === t.key && styles.typeButtonActive,
              ]}
              onPress={() => setType(t.key)}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  type === t.key && styles.typeLabelActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Yasemin yaşı */}
        <Text style={styles.ageLabel}>{ageLabel}</Text>

        {/* Başlık */}
        <TextInput
          style={styles.titleInput}
          placeholder={
            type === 'letter'
              ? 'Canım Yasemin...'
              : 'Başlık (opsiyonel)'
          }
          placeholderTextColor={COLORS.inkLight}
          value={title}
          onChangeText={setTitle}
          editable={!saving}
        />

        {/* İçerik */}
        <TextInput
          style={styles.bodyInput}
          placeholder="Yasemin'e ne anlatmak istersin?"
          placeholderTextColor={COLORS.inkLight}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          editable={!saving}
        />

        {/* Zaman Kapsülü */}
        <View style={styles.capsuleRow}>
          <View style={styles.capsuleInfo}>
            <Text style={styles.capsuleEmoji}>📮</Text>
            <Text style={styles.capsuleLabel}>Zaman Kapsülü</Text>
          </View>
          <Switch
            value={isCapsule}
            onValueChange={setIsCapsule}
            trackColor={{ false: COLORS.border, true: COLORS.goldLight }}
            thumbColor={isCapsule ? COLORS.gold : COLORS.creamDark}
          />
        </View>

        {isCapsule && (
          <View style={styles.capsuleOptions}>
            <Text style={styles.capsuleHint}>
              Yasemin kaç yaşında okuyabilsin?
            </Text>
            <TextInput
              style={styles.ageInput}
              placeholder="18"
              placeholderTextColor={COLORS.inkLight}
              value={capsuleAge}
              onChangeText={setCapsuleAge}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        )}

        {/* Kaydet */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Text>
        </TouchableOpacity>
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
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.warmWhite,
  },
  typeButtonActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldLight,
  },
  typeEmoji: {
    fontSize: 18,
  },
  typeLabel: {
    fontSize: 13,
    color: COLORS.inkLight,
    fontWeight: '600',
  },
  typeLabelActive: {
    color: COLORS.ink,
  },
  ageLabel: {
    fontSize: 13,
    color: COLORS.gold,
    fontWeight: '600',
    textAlign: 'center',
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.ink,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
  },
  bodyInput: {
    fontSize: 16,
    color: COLORS.ink,
    lineHeight: 24,
    minHeight: 200,
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  capsuleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.capsuleBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  capsuleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  capsuleEmoji: {
    fontSize: 20,
  },
  capsuleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.capsule,
  },
  capsuleOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.capsuleBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  capsuleHint: {
    flex: 1,
    fontSize: 14,
    color: COLORS.capsule,
  },
  ageInput: {
    width: 60,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    textAlign: 'center',
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  saveButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.warmWhite,
    fontSize: 16,
    fontWeight: '700',
  },
});
