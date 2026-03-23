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
import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { AudioPlayer } from '../../components/AudioPlayer';
import { db } from '../../lib/firebase';
import { uploadAudioAsync, uploadImageAsync } from '../../lib/storage';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
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
  { key: 'voice', label: 'Ses', emoji: '🎙️' },
];

type SelectedPhoto = {
  id: string;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type RecordedVoice = {
  uri: string;
  durationMillis: number;
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
  return (
    value === 'letter'
    || value === 'memory'
    || value === 'milestone'
    || value === 'voice'
  );
}

function toSelectedPhoto(asset: ImagePicker.ImagePickerAsset, index: number): SelectedPhoto {
  return {
    id: asset.assetId ?? `${asset.uri}-${index}`,
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
  };
}

function formatAudioDuration(durationMillis: number) {
  if (!durationMillis) {
    return '0:00';
  }

  const totalSeconds = Math.floor(durationMillis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
}

function getVoiceMimeType(uri: string) {
  if (uri.includes('.webm')) {
    return 'audio/webm';
  }

  if (uri.includes('.wav')) {
    return 'audio/wav';
  }

  if (uri.includes('.mp3')) {
    return 'audio/mpeg';
  }

  return 'audio/mp4';
}

export default function WriteScreen() {
  const { user, profile } = useAuth();
  const { colors } = useTheme();
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
  const [isPrivate, setIsPrivate] = useState(type === 'letter');
  const [isCapsule, setIsCapsule] = useState(false);
  const [capsuleAge, setCapsuleAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDurationMillis, setRecordingDurationMillis] = useState(0);
  const [recordedVoice, setRecordedVoice] = useState<RecordedVoice | null>(
    null
  );
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

  useEffect(() => {
    return () => {
      if (!recording) {
        return;
      }

      recording.stopAndUnloadAsync().catch(() => undefined);
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      }).catch(() => undefined);
    };
  }, [recording]);

  async function setPlaybackModeAsync() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
  }

  function handleTypeChange(nextType: EntryType) {
    if (recording && nextType !== type) {
      Alert.alert(
        'Kayit suruyor',
        'Tur degistirmeden once mevcut ses kaydini durdur.'
      );
      return;
    }

    setType(nextType);
    // Mektuplar otomatik gizli, diger turler acik
    setIsPrivate(nextType === 'letter');

    // Sekme degisince icerik alanlarini temizle (sekmeler arasi sizinti onlenir)
    setTitle('');
    setBody('');

    if (nextType === 'voice') {
      setSelectedPhotos([]);
    }

    if (nextType !== 'voice') {
      setRecordedVoice(null);
      setRecordingDurationMillis(0);
    }

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
    if (recording) {
      Alert.alert(
        'Kayit suruyor',
        'Milestone secmeden once mevcut ses kaydini durdur.'
      );
      return;
    }

    const nextPreset = getMilestonePreset(tag);

    setType('milestone');
    setRecordedVoice(null);
    setRecordingDurationMillis(0);
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

  function removeRecordedVoice() {
    setRecordedVoice(null);
    setRecordingDurationMillis(0);
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

  async function handleStartRecording() {
    if (saving) {
      return;
    }

    const permission = await Audio.requestPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Izin gerekli',
        'Ses kaydetmek icin mikrofon izni vermelisin.'
      );
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const { recording: nextRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.isRecording) {
            setRecordingDurationMillis(status.durationMillis ?? 0);
          }
        },
        250
      );

      setRecordedVoice(null);
      setRecordingDurationMillis(0);
      setRecording(nextRecording);
    } catch (error: unknown) {
      await setPlaybackModeAsync();

      const message =
        error instanceof Error ? error.message : 'Ses kaydi baslatilamadi.';
      Alert.alert('Hata', message);
    }
  }

  async function handleStopRecording() {
    if (!recording) {
      return;
    }

    const activeRecording = recording;
    setRecording(null);

    try {
      const status = await activeRecording.stopAndUnloadAsync();
      await setPlaybackModeAsync();
      const uri = activeRecording.getURI();

      if (!uri) {
        throw new Error('Kayit dosyasi bulunamadi.');
      }

      setRecordedVoice({
        uri,
        durationMillis: status.durationMillis ?? recordingDurationMillis,
        mimeType: getVoiceMimeType(uri),
      });
      setRecordingDurationMillis(0);
    } catch (error: unknown) {
      await setPlaybackModeAsync();
      setRecordingDurationMillis(0);

      const message =
        error instanceof Error ? error.message : 'Ses kaydi durdurulamadi.';
      Alert.alert('Hata', message);
    }
  }

  async function handleSave() {
    if (!user || !profile) {
      Alert.alert('Hata', 'Oturum bulunamadi.');
      return;
    }

    if (recording) {
      Alert.alert('Hata', 'Kaydetmeden once ses kaydini durdurmalisin.');
      return;
    }

    if (type !== 'voice' && !body.trim()) {
      Alert.alert('Hata', 'Bir seyler yazmalisin.');
      return;
    }

    if (type === 'voice' && !recordedVoice) {
      Alert.alert('Hata', 'Sesli mesaj kaydetmeden bu girisi kaydedemezsin.');
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
      const mediaTimestamp = Date.now();
      const entryDateDate = nextEntryDate ?? toStartOfDay(now);
      const entryDate = Timestamp.fromDate(entryDateDate);
      const capsuleUnlockAge =
        isCapsule && capsuleAge ? parseInt(capsuleAge, 10) : null;
      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();

      const photoUrls =
        type === 'voice'
          ? []
          : await Promise.all(
            selectedPhotos.map((photo, index) =>
              uploadImageAsync({
                uri: photo.uri,
                mimeType: photo.mimeType,
                path: `entries/${profile.familyId}/${user.uid}/${mediaTimestamp}-${index}-${Math.random().toString(36).slice(2)}`,
              })
            )
          );

      const voiceUrl = recordedVoice
        ? await uploadAudioAsync({
          uri: recordedVoice.uri,
          mimeType: recordedVoice.mimeType,
          path: `entries/${profile.familyId}/${user.uid}/${mediaTimestamp}-voice`,
        })
        : null;

      const photoCaptionBase = trimmedTitle
        || (type === 'milestone' ? 'Milestone' : 'Ani');
      const photoCaptions = photoUrls.map((_, index) =>
        photoUrls.length === 1 ? photoCaptionBase : `${photoCaptionBase} ${index + 1}`
      );

      await addDoc(collection(db, 'entries'), {
        familyId: profile.familyId,
        authorId: user.uid,
        authorName: profile.displayName,
        type,
        title: trimmedTitle || null,
        body: trimmedBody || null,
        photoUrls,
        photoCaptions,
        voiceUrl,
        voiceDurationMillis: recordedVoice?.durationMillis ?? null,
        milestoneTag: type === 'milestone' ? selectedMilestoneTag || null : null,
        yaseminAgeWeeks: null,
        yaseminAgeLabel: getYaseminAgeLabel(entryDateDate),
        entryDate,
        isPrivate,
        isCapsule,
        capsuleUnlockDate: null,
        capsuleUnlockAge,
        tags: [],
        createdAt: entryDate,
        updatedAt: entryDate,
      });

      Alert.alert('Kaydedildi', 'Kayit Yasemin icin saklandi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);

      setTitle('');
      setBody('');
      setIsPrivate(false);
      setIsCapsule(false);
      setCapsuleAge('');
      setSelectedPhotos([]);
      setRecordedVoice(null);
      setRecordingDurationMillis(0);
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
      style={[styles.container, { backgroundColor: colors.cream }]}
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

        {type === 'voice' ? (
          <View style={styles.voiceCard}>
            <View style={styles.voiceHeader}>
              <View style={styles.voiceCopy}>
                <Text style={styles.dateTitle}>Ses kaydi</Text>
                <Text style={styles.dateHint}>
                  Yasemin icin kisa bir sesli mesaj birak. Kayittan sonra
                  istersen kisa bir not da ekleyebilirsin.
                </Text>
              </View>

              <View
                style={[
                  styles.voiceStatusPill,
                  (recording || recordedVoice) && styles.voiceStatusPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.voiceStatusText,
                    (recording || recordedVoice) && styles.voiceStatusTextActive,
                  ]}
                >
                  {recording
                    ? `Kayit ${formatAudioDuration(recordingDurationMillis)}`
                    : recordedVoice
                      ? `Hazir ${formatAudioDuration(recordedVoice.durationMillis)}`
                      : 'Hazir degil'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.voiceRecordButton,
                recording && styles.voiceRecordButtonActive,
              ]}
              onPress={recording ? handleStopRecording : handleStartRecording}
              disabled={saving}
            >
              <Text style={styles.voiceRecordButtonText}>
                {recording
                  ? 'Kaydi durdur'
                  : recordedVoice
                    ? 'Tekrar kaydet'
                    : 'Kayda basla'}
              </Text>
            </TouchableOpacity>

            {recordedVoice && !recording && (
              <View style={styles.voicePreview}>
                <AudioPlayer
                  uri={recordedVoice.uri}
                  durationMillis={recordedVoice.durationMillis}
                />
                <TouchableOpacity
                  style={styles.removeVoiceButton}
                  onPress={removeRecordedVoice}
                  disabled={saving}
                >
                  <Text style={styles.removeVoiceText}>Kaydi sil</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
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
        )}

        <TextInput
          style={styles.titleInput}
          placeholder={
            type === 'letter'
              ? 'Canim Yasemin...'
              : type === 'milestone'
                ? 'Ilk adim'
                : type === 'voice'
                  ? 'Sesli mesaj basligi (opsiyonel)'
                  : 'Baslik (opsiyonel)'
          }
          placeholderTextColor={COLORS.inkLight}
          value={title}
          onChangeText={setTitle}
          editable={!saving}
        />

        <TextInput
          style={styles.bodyInput}
          placeholder={
            type === 'voice'
              ? 'Istersen sesli mesajina kisa bir not ekleyebilirsin.'
              : "Yasemin'e ne anlatmak istersin?"
          }
          placeholderTextColor={COLORS.inkLight}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          editable={!saving}
        />

        {isPrivate && (
          <View style={styles.privateBanner}>
            <Text style={styles.privateBannerEmoji}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.privateBannerTitle}>Gizli mektup</Text>
              <Text style={styles.privateBannerText}>Bu mektubu sadece sen ve Yasemin gorebilecek.</Text>
            </View>
            <TouchableOpacity onPress={() => setIsPrivate(false)}>
              <Text style={styles.privateBannerToggle}>Acik yap</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPrivate && type === 'letter' && (
          <TouchableOpacity style={styles.privateLink} onPress={() => setIsPrivate(true)}>
            <Text style={styles.privateLinkText}>🔒 Gizli mektup olarak yaz</Text>
          </TouchableOpacity>
        )}

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
          style={[
            styles.saveButton,
            (saving || Boolean(recording)) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || Boolean(recording)}
        >
          <Text style={styles.saveButtonText}>
            {saving
              ? 'Kaydediliyor...'
              : recording
                ? 'Once kaydi durdur'
                : 'Kaydet'}
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
  voiceCard: {
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
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  voiceCopy: {
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
  voiceStatusPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cream,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  voiceStatusPillActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldLight,
  },
  voiceStatusText: {
    color: COLORS.inkLight,
    fontSize: 12,
    fontFamily: FONTS.uiMedium,
  },
  voiceStatusTextActive: {
    color: COLORS.ink,
  },
  voiceRecordButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gold,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  voiceRecordButtonActive: {
    backgroundColor: COLORS.danger,
  },
  voiceRecordButtonText: {
    color: COLORS.warmWhite,
    fontSize: 15,
    fontFamily: FONTS.uiBold,
  },
  voicePreview: {
    gap: SPACING.sm,
  },
  removeVoiceButton: {
    alignSelf: 'flex-start',
  },
  removeVoiceText: {
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: FONTS.uiMedium,
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
  privateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#FFF8E1',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  privateBannerEmoji: {
    fontSize: 20,
  },
  privateBannerTitle: {
    fontSize: 14,
    fontFamily: FONTS.uiBold,
    color: COLORS.ink,
  },
  privateBannerText: {
    fontSize: 12,
    fontFamily: FONTS.ui,
    color: COLORS.inkLight,
    marginTop: 2,
  },
  privateBannerToggle: {
    fontSize: 13,
    fontFamily: FONTS.uiMedium,
    color: COLORS.gold,
  },
  privateLink: {
    marginBottom: SPACING.md,
    padding: SPACING.sm,
  },
  privateLinkText: {
    fontSize: 13,
    fontFamily: FONTS.uiMedium,
    color: COLORS.inkLight,
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
