import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../lib/firebase';
import { uploadImageAsync } from '../../lib/storage';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import {
  getMilestonePreset,
  MILESTONE_PRESETS,
} from '../../constants/milestones';
import { getYaseminAgeLabel } from '../../constants/yasemin';
import { EntryType } from '../../types/entry';

const ENTRY_TYPES: { key: EntryType; label: string; emoji: string }[] = [
  { key: 'letter', label: 'Mektup', emoji: '✉️' },
  { key: 'memory', label: 'Ani', emoji: '📷' },
  { key: 'milestone', label: 'Adim', emoji: '🌟' },
];

type SelectedPhoto = {
  id: string;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function toStartOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function formatDateInput(date: Date) {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  return `${day}.${month}.${year}`;
}

function parseDateInput(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return toStartOfDay(parsedDate);
}

function isEntryType(value: string | undefined): value is EntryType {
  return value === 'letter' || value === 'memory' || value === 'milestone';
}

function toSelectedPhoto(asset: ImagePicker.ImagePickerAsset, index: number): SelectedPhoto {
  return {
    id: asset.assetId ?? `${asset.uri}-${index}`,
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
  };
}

export default function WriteScreen() {
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{
    type?: string;
    milestoneTag?: string;
    title?: string;
  }>();

  const initialType = isEntryType(params.type) ? params.type : 'letter';
  const initialNow = new Date();

  const [type, setType] = useState<EntryType>(initialType);
  const [title, setTitle] = useState(
    typeof params.title === 'string' ? params.title : ''
  );
  const [body, setBody] = useState('');
  const [isCapsule, setIsCapsule] = useState(false);
  const [capsuleAge, setCapsuleAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [selectedMilestoneTag, setSelectedMilestoneTag] = useState(
    typeof params.milestoneTag === 'string' ? params.milestoneTag : ''
  );
  const [milestoneDateInput, setMilestoneDateInput] = useState(
    initialType === 'milestone' ? formatDateInput(initialNow) : ''
  );

  const parsedMilestoneDate = parseDateInput(milestoneDateInput);
  const effectiveEntryDate =
    type === 'milestone' ? parsedMilestoneDate ?? initialNow : initialNow;
  const ageLabel = getYaseminAgeLabel(effectiveEntryDate);
  const selectedMilestonePreset = getMilestonePreset(selectedMilestoneTag);

  useEffect(() => {
    if (isEntryType(params.type)) {
      setType(params.type);
    }

    if (typeof params.title === 'string') {
      setTitle(params.title);
    }

    if (typeof params.milestoneTag === 'string') {
      setSelectedMilestoneTag(params.milestoneTag);
    }

    if (isEntryType(params.type) && params.type === 'milestone') {
      setMilestoneDateInput(
        (currentValue) => currentValue || formatDateInput(new Date())
      );
    }
  }, [params.milestoneTag, params.title, params.type]);

  function handleTypeChange(nextType: EntryType) {
    setType(nextType);

    if (nextType !== 'milestone') {
      setSelectedMilestoneTag('');
      setMilestoneDateInput('');
      return;
    }

    setMilestoneDateInput(
      (currentValue) => currentValue || formatDateInput(new Date())
    );
  }

  function handleSelectMilestone(tag: string) {
    const nextPreset = getMilestonePreset(tag);

    setType('milestone');
    setSelectedMilestoneTag(tag);

    if (!nextPreset) {
      return;
    }

    if (!title.trim() || title === selectedMilestonePreset?.title) {
      setTitle(nextPreset.title);
    }
  }

  function removeSelectedPhoto(photoId: string) {
    setSelectedPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  async function handlePickPhotos() {
    if (Platform.OS !== 'web') {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Izin gerekli',
          'Fotograf eklemek icin galeri izni vermelisin.'
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 5,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    setSelectedPhotos(result.assets.map(toSelectedPhoto));
  }

  async function handleSave() {
    if (!user || !profile) {
      Alert.alert('Hata', 'Oturum bulunamadi.');
      return;
    }

    if (!body.trim()) {
      Alert.alert('Hata', 'Bir seyler yazmalisin.');
      return;
    }

    const now = new Date();
    const nextEntryDate =
      type === 'milestone'
        ? parseDateInput(milestoneDateInput)
        : toStartOfDay(now);

    if (type === 'milestone' && !nextEntryDate) {
      Alert.alert('Hata', 'Milestone tarihi icin GG.AA.YYYY formatini kullan.');
      return;
    }

    if (nextEntryDate && nextEntryDate.getTime() > toStartOfDay(now).getTime()) {
      Alert.alert('Hata', 'Milestone tarihi bugunden ileri olamaz.');
      return;
    }

    setSaving(true);

    try {
      const entryDateDate = nextEntryDate ?? toStartOfDay(now);
      const entryDate = Timestamp.fromDate(entryDateDate);
      const capsuleUnlockAge =
        isCapsule && capsuleAge ? parseInt(capsuleAge, 10) : null;

      const photoUrls = await Promise.all(
        selectedPhotos.map((photo, index) =>
          uploadImageAsync({
            uri: photo.uri,
            mimeType: photo.mimeType,
            path: `entries/${profile.familyId}/${user.uid}/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
          })
        )
      );

      const photoCaptionBase = title.trim()
        || (type === 'milestone' ? 'Milestone' : 'Ani');
      const photoCaptions = photoUrls.map((_, index) =>
        photoUrls.length === 1 ? photoCaptionBase : `${photoCaptionBase} ${index + 1}`
      );

      await addDoc(collection(db, 'entries'), {
        familyId: profile.familyId,
        authorId: user.uid,
        authorName: profile.displayName,
        type,
        title: title.trim() || null,
        body: body.trim(),
        photoUrls,
        photoCaptions,
        voiceUrl: null,
        milestoneTag: type === 'milestone' ? selectedMilestoneTag || null : null,
        yaseminAgeWeeks: null,
        yaseminAgeLabel: getYaseminAgeLabel(entryDateDate),
        entryDate,
        isPrivate: false,
        isCapsule,
        capsuleUnlockDate: null,
        capsuleUnlockAge,
        tags: [],
        createdAt: entryDate,
        updatedAt: entryDate,
      });

      Alert.alert('Kaydedildi', 'Ani Yasemin icin saklandi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);

      setTitle('');
      setBody('');
      setIsCapsule(false);
      setCapsuleAge('');
      setSelectedPhotos([]);
      setSelectedMilestoneTag('');
      setMilestoneDateInput('');
      setType('letter');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Bir hata olustu.';
      Alert.alert('Hata', message);
    } finally {
      setSaving(false);
    }
  }

  const photoCardTitle =
    type === 'milestone' ? 'Milestone fotograflari' : 'Fotograflar';
  const photoCardHint =
    type === 'milestone'
      ? 'Timeline kartinda ilk fotograf gorunur, detay ekraninda tumu galeride listelenir.'
      : 'Feed kartinda ilk fotograf gorunur, detay ekraninda tumu galeride listelenir.';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.typeRow}>
          {ENTRY_TYPES.map((entryType) => (
            <TouchableOpacity
              key={entryType.key}
              style={[
                styles.typeButton,
                type === entryType.key && styles.typeButtonActive,
              ]}
              onPress={() => handleTypeChange(entryType.key)}
            >
              <Text style={styles.typeEmoji}>{entryType.emoji}</Text>
              <Text
                style={[
                  styles.typeLabel,
                  type === entryType.key && styles.typeLabelActive,
                ]}
              >
                {entryType.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.ageLabel}>{ageLabel}</Text>

        {type === 'milestone' && (
          <View style={styles.milestoneSection}>
            <Text style={styles.sectionTitle}>Milestone sec</Text>
            <Text style={styles.sectionHint}>
              Hazir basliklardan birini sec ya da kendi basligini yaz.
            </Text>

            <View style={styles.milestoneGrid}>
              {MILESTONE_PRESETS.map((preset) => {
                const selected = preset.id === selectedMilestoneTag;

                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.milestoneChip,
                      selected && styles.milestoneChipActive,
                    ]}
                    onPress={() => handleSelectMilestone(preset.id)}
                  >
                    <Text
                      style={[
                        styles.milestoneChipText,
                        selected && styles.milestoneChipTextActive,
                      ]}
                    >
                      {preset.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedMilestonePreset && (
              <View style={styles.milestonePromptCard}>
                <Text style={styles.milestonePromptTitle}>Yazi fikri</Text>
                <Text style={styles.milestonePromptText}>
                  {selectedMilestonePreset.prompt}
                </Text>
              </View>
            )}

            <View style={styles.dateCard}>
              <Text style={styles.dateTitle}>Milestone tarihi</Text>
              <Text style={styles.dateHint}>
                GG.AA.YYYY formatinda gir. Yas etiketi bu tarihe gore hesaplanir.
              </Text>
              <TextInput
                style={styles.dateInput}
                placeholder="23.03.2026"
                placeholderTextColor={COLORS.inkLight}
                value={milestoneDateInput}
                onChangeText={setMilestoneDateInput}
                keyboardType="number-pad"
                editable={!saving}
              />
              <View style={styles.dateShortcuts}>
                <TouchableOpacity
                  style={styles.dateShortcut}
                  onPress={() => setMilestoneDateInput(formatDateInput(new Date()))}
                >
                  <Text style={styles.dateShortcutText}>Bugun</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateShortcut}
                  onPress={() => {
                    const shortcutDate = new Date();
                    setMilestoneDateInput(
                      formatDateInput(
                        new Date(
                          shortcutDate.getFullYear(),
                          shortcutDate.getMonth(),
                          shortcutDate.getDate() - 1
                        )
                      )
                    );
                  }}
                >
                  <Text style={styles.dateShortcutText}>Dun</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <View style={styles.photoCard}>
          <View style={styles.photoHeader}>
            <View style={styles.photoCopy}>
              <Text style={styles.dateTitle}>{photoCardTitle}</Text>
              <Text style={styles.dateHint}>{photoCardHint}</Text>
            </View>
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handlePickPhotos}
              disabled={saving}
            >
              <Text style={styles.photoButtonText}>
                {selectedPhotos.length > 0 ? 'Fotolari degistir' : 'Foto sec'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedPhotos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoPreviewRow}
            >
              {selectedPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoPreviewCard}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removeSelectedPhoto(photo.id)}
                    disabled={saving}
                  >
                    <Text style={styles.removePhotoText}>Kaldir</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <TextInput
          style={styles.titleInput}
          placeholder={
            type === 'letter'
              ? 'Canim Yasemin...'
              : type === 'milestone'
                ? 'Ilk adim'
                : 'Baslik (opsiyonel)'
          }
          placeholderTextColor={COLORS.inkLight}
          value={title}
          onChangeText={setTitle}
          editable={!saving}
        />

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

        <View style={styles.capsuleRow}>
          <View style={styles.capsuleInfo}>
            <Text style={styles.capsuleEmoji}>📮</Text>
            <Text style={styles.capsuleLabel}>Zaman kapsulu</Text>
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
              Yasemin kac yasinda okuyabilsin?
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
    fontFamily: FONTS.uiMedium,
  },
  typeLabelActive: {
    color: COLORS.ink,
  },
  ageLabel: {
    fontSize: 13,
    color: COLORS.gold,
    fontFamily: FONTS.uiMedium,
    textAlign: 'center',
  },
  milestoneSection: {
    gap: SPACING.sm,
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.inkLight,
    fontFamily: FONTS.body,
  },
  milestoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  milestoneChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.warmWhite,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  milestoneChipActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldLight,
  },
  milestoneChipText: {
    fontSize: 13,
    color: COLORS.inkLight,
    fontFamily: FONTS.uiMedium,
  },
  milestoneChipTextActive: {
    color: COLORS.ink,
  },
  milestonePromptCard: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  milestonePromptTitle: {
    fontSize: 13,
    color: COLORS.gold,
    fontFamily: FONTS.uiBold,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  milestonePromptText: {
    fontSize: 14,
    color: COLORS.ink,
    fontFamily: FONTS.body,
    lineHeight: 22,
  },
  dateCard: {
    gap: SPACING.sm,
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  dateTitle: {
    fontSize: 14,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
  },
  dateHint: {
    fontSize: 13,
    color: COLORS.inkLight,
    fontFamily: FONTS.body,
    lineHeight: 20,
  },
  dateInput: {
    fontSize: 16,
    color: COLORS.ink,
    fontFamily: FONTS.uiMedium,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dateShortcuts: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dateShortcut: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dateShortcutText: {
    fontSize: 12,
    color: COLORS.inkLight,
    fontFamily: FONTS.uiMedium,
  },
  photoCard: {
    gap: SPACING.sm,
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  photoCopy: {
    flex: 1,
    gap: SPACING.xs,
  },
  photoButton: {
    borderRadius: 999,
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  photoButtonText: {
    color: COLORS.ink,
    fontSize: 13,
    fontFamily: FONTS.uiBold,
  },
  photoPreviewRow: {
    gap: SPACING.sm,
  },
  photoPreviewCard: {
    width: 144,
    gap: SPACING.xs,
  },
  photoPreview: {
    width: 144,
    height: 144,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cream,
  },
  removePhotoButton: {
    alignSelf: 'flex-start',
  },
  removePhotoText: {
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: FONTS.uiMedium,
  },
  titleInput: {
    fontSize: 22,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
  },
  bodyInput: {
    fontSize: 16,
    fontFamily: FONTS.body,
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
    fontFamily: FONTS.uiMedium,
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
    fontFamily: FONTS.body,
    color: COLORS.capsule,
  },
  ageInput: {
    width: 60,
    fontSize: 18,
    fontFamily: FONTS.uiBold,
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
    fontFamily: FONTS.uiBold,
  },
});
