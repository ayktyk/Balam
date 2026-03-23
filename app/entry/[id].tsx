import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { router, useLocalSearchParams } from 'expo-router';
import { deleteDoc, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import {
  COLORS,
  ENTRY_ICONS,
  FONTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { AudioPlayer } from '../../components/AudioPlayer';
import { Entry } from '../../types/entry';

import { isCapsuleUnlocked } from '../../constants/yasemin';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  const isOwner = Boolean(user && entry && user.uid === entry.authorId);
  const isParent = profile?.role !== 'child';

  // Capsule reveal animation
  const revealProgress = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const [revealStarted, setRevealStarted] = useState(false);

  useEffect(() => {
    if (!entry?.isCapsule || revealStarted) return;
    const unlocked = !entry.isCapsule || isCapsuleUnlocked(entry.capsuleUnlockDate?.toDate(), entry.capsuleUnlockAge);
    const canSee = isParent || unlocked;
    if (!canSee || !unlocked) return;

    setRevealStarted(true);

    // Sequence: scale+fade in content, then sparkle the badge
    Animated.sequence([
      Animated.timing(revealProgress, {
        toValue: 1,
        duration: 600,
        delay: 300,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 0.6,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [entry, isParent, revealStarted]);

  useEffect(() => {
    async function fetchEntry() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, 'entries', id));

        if (docSnap.exists()) {
          setEntry({ id: docSnap.id, ...docSnap.data() } as Entry);
        }
      } catch (error) {
        if (__DEV__) {
          const message =
            error instanceof Error ? error.message : 'Bilinmeyen hata';
          // eslint-disable-next-line no-console
          console.log('Kayıt yükleme hatası:', message);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchEntry();
  }, [id]);

  function showMessage(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(message);
      return;
    }

    Alert.alert(title, message);
  }

  function confirmDelete() {
    if (Platform.OS === 'web') {
      return Promise.resolve(
        window.confirm(
          'Bu anıyı silmek istediğinden emin misin? Bu işlem geri alınamaz.'
        )
      );
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Anıyı sil',
        'Bu anı kalıcı olarak silinecek. Devam etmek istiyor musun?',
        [
          {
            text: 'İptal',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ],
        {
          cancelable: true,
          onDismiss: () => resolve(false),
        }
      );
    });
  }

  function startEditing() {
    if (!entry || !isOwner) {
      return;
    }

    setEditTitle(entry.title ?? '');
    setEditBody(entry.body ?? '');
    setEditing(true);
  }

  async function handleSave() {
    if (!entry || !id) {
      return;
    }

    if (!isOwner) {
      showMessage(
        'Yetkisiz işlem',
        'Sadece kendi kaydını düzenleyebilirsin.'
      );
      return;
    }

    if (!editBody.trim() && !entry.voiceUrl) {
      showMessage('Eksik içerik', 'Bir şeyler yazmalısın.');
      return;
    }

    setSaving(true);

    try {
      const updatedAt = Timestamp.now();
      const nextTitle = editTitle.trim() || null;
      const nextBody = editBody.trim() || null;

      await updateDoc(doc(db, 'entries', id), {
        title: nextTitle,
        body: nextBody,
        updatedAt,
      });

      setEntry({
        ...entry,
        title: nextTitle,
        body: nextBody,
        updatedAt,
      });
      setEditing(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oldu.';
      showMessage('Kaydetme hatası', message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) {
      return;
    }

    if (!isOwner) {
      showMessage('Yetkisiz işlem', 'Sadece kendi kaydını silebilirsin.');
      return;
    }

    const confirmed = await confirmDelete();

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'entries', id));
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oldu.';
      showMessage('Silme hatası', message);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Kayıt bulunamadı.</Text>
      </View>
    );
  }

  const entryDate = entry.entryDate.toDate();
  const dateStr = entryDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  const unlocked = !entry.isCapsule || isCapsuleUnlocked(entry.capsuleUnlockDate?.toDate(), entry.capsuleUnlockAge);
  const canSeeContent = isParent || unlocked;

  const icon = entry.isCapsule ? (unlocked ? '🔓' : '🔒') : ENTRY_ICONS[entry.type];
  const hasGallery = entry.photoUrls.length > 1;

  if (editing) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.cream }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={styles.editTitle}
            placeholder="Başlık (opsiyonel)"
            placeholderTextColor={COLORS.inkLight}
            value={editTitle}
            onChangeText={setEditTitle}
            editable={!saving}
          />
          <TextInput
            style={styles.editBody}
            placeholder="Anını yaz..."
            placeholderTextColor={COLORS.inkLight}
            value={editBody}
            onChangeText={setEditBody}
            multiline
            textAlignVertical="top"
            editable={!saving}
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditing(false)}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Iptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.cream }]} contentContainerStyle={styles.content}>
      <View style={styles.meta}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.authorName}>{entry.authorName}</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.ageLabel}>{entry.yaseminAgeLabel}</Text>
      </View>

      <View style={[styles.card, entry.isCapsule && !unlocked && styles.cardLocked]}>
        {/* Unlocked capsule content with reveal animation */}
        {entry.isCapsule && unlocked && canSeeContent ? (
          <Animated.View
            style={{
              opacity: revealProgress,
              transform: [
                {
                  scale: revealProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
            }}
          >
            {entry.photoUrls.length > 0 && (
              <>
                {hasGallery ? (
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryRow}
                  >
                    {entry.photoUrls.map((photoUrl, index) => (
                      <View key={`${photoUrl}-${index}`} style={styles.gallerySlide}>
                        <Image
                          source={{ uri: photoUrl }}
                          style={styles.coverPhoto}
                          resizeMode="cover"
                        />
                        {entry.photoCaptions[index] && (
                          <Text style={styles.photoCaption}>
                            {entry.photoCaptions[index]}
                          </Text>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View>
                    <Image
                      source={{ uri: entry.photoUrls[0] }}
                      style={styles.coverPhoto}
                      resizeMode="cover"
                    />
                    {entry.photoCaptions[0] && (
                      <Text style={styles.photoCaption}>{entry.photoCaptions[0]}</Text>
                    )}
                  </View>
                )}
                {hasGallery && (
                  <Text style={styles.galleryHint}>
                    Galeride {entry.photoUrls.length} fotoğraf var. Yana kaydır.
                  </Text>
                )}
              </>
            )}
            {entry.voiceUrl && (
              <View style={styles.voiceSection}>
                <Text style={styles.voiceLabel}>Sesli mesaj</Text>
                <AudioPlayer
                  uri={entry.voiceUrl}
                  durationMillis={entry.voiceDurationMillis ?? null}
                />
              </View>
            )}
            {entry.title && <Text style={styles.title}>{entry.title}</Text>}
            {entry.body && <Text style={styles.body}>{entry.body}</Text>}
          </Animated.View>
        ) : canSeeContent ? (
          /* Non-capsule content — no animation needed */
          <>
            {entry.photoUrls.length > 0 && (
              <>
                {hasGallery ? (
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryRow}
                  >
                    {entry.photoUrls.map((photoUrl, index) => (
                      <View key={`${photoUrl}-${index}`} style={styles.gallerySlide}>
                        <Image
                          source={{ uri: photoUrl }}
                          style={styles.coverPhoto}
                          resizeMode="cover"
                        />
                        {entry.photoCaptions[index] && (
                          <Text style={styles.photoCaption}>
                            {entry.photoCaptions[index]}
                          </Text>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View>
                    <Image
                      source={{ uri: entry.photoUrls[0] }}
                      style={styles.coverPhoto}
                      resizeMode="cover"
                    />
                    {entry.photoCaptions[0] && (
                      <Text style={styles.photoCaption}>{entry.photoCaptions[0]}</Text>
                    )}
                  </View>
                )}
                {hasGallery && (
                  <Text style={styles.galleryHint}>
                    Galeride {entry.photoUrls.length} fotoğraf var. Yana kaydır.
                  </Text>
                )}
              </>
            )}
            {entry.voiceUrl && (
              <View style={styles.voiceSection}>
                <Text style={styles.voiceLabel}>Sesli mesaj</Text>
                <AudioPlayer
                  uri={entry.voiceUrl}
                  durationMillis={entry.voiceDurationMillis ?? null}
                />
              </View>
            )}
            {entry.title && <Text style={styles.title}>{entry.title}</Text>}
            {entry.body && <Text style={styles.body}>{entry.body}</Text>}
          </>
        ) : (
          <View style={styles.lockedState}>
            <Text style={styles.lockedTitle}>Bu Kapsül Henüz Açılmadı</Text>
            <Text style={styles.lockedText}>
              Ailen senin için buraya özel bir anı bıraktı. {entry.capsuleUnlockAge ? `${entry.capsuleUnlockAge} yaşına geldiğinde` : 'Zamanı geldiğinde'} buradaki sürprizi görebileceksin.
            </Text>
          </View>
        )}
      </View>

      {entry.isCapsule && (
        <Animated.View
          style={[
            styles.capsuleInfo,
            unlocked && styles.capsuleInfoUnlocked,
            unlocked && {
              opacity: sparkleOpacity,
              transform: [
                {
                  scale: sparkleOpacity.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0.95, 1, 1.02],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.capsuleText, unlocked && styles.capsuleTextUnlocked]}>
            {unlocked
              ? 'Bu kapsülün kilidi açıldı!'
              : (entry.capsuleUnlockAge
                ? `Bu kapsül Yasemin ${entry.capsuleUnlockAge} yaşına gelince açılacak.`
                : 'Bu bir zaman kapsülü.')}
          </Text>
        </Animated.View>
      )}

      {isOwner && (
        <View style={styles.ownerActions}>
          <TouchableOpacity style={styles.editButton} onPress={startEditing}>
            <Text style={styles.editButtonText}>Düzenle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  content: {
    padding: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.inkLight,
  },
  meta: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  icon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  authorName: {
    fontSize: 16,
    fontFamily: FONTS.uiBold,
    color: COLORS.ink,
  },
  dateText: {
    fontSize: 14,
    fontFamily: FONTS.ui,
    color: COLORS.inkLight,
    marginTop: SPACING.xs,
  },
  ageLabel: {
    fontSize: 14,
    color: COLORS.gold,
    fontFamily: FONTS.uiMedium,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  cardLocked: {
    backgroundColor: '#F3EFE7',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.capsule,
  },
  lockedState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  lockedTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading,
    color: COLORS.capsule,
    textAlign: 'center',
  },
  lockedText: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.inkLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  coverPhoto: {
    width: '100%',
    height: 240,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.warmWhite,
  },
  galleryRow: {
    gap: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  gallerySlide: {
    width: 280,
  },
  photoCaption: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.inkLight,
    fontFamily: FONTS.body,
    marginBottom: SPACING.md,
  },
  galleryHint: {
    fontSize: 12,
    color: COLORS.gold,
    fontFamily: FONTS.uiMedium,
    marginBottom: SPACING.sm,
  },
  voiceSection: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  voiceLabel: {
    fontSize: 13,
    color: COLORS.gold,
    fontFamily: FONTS.uiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    marginBottom: SPACING.md,
  },
  body: {
    fontSize: 17,
    fontFamily: FONTS.body,
    color: COLORS.ink,
    lineHeight: 28,
  },
  capsuleInfo: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.capsuleBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.capsule,
    borderStyle: 'dashed',
  },
  capsuleInfoUnlocked: {
    backgroundColor: '#E8F5E8',
    borderColor: COLORS.success,
    borderStyle: 'solid',
  },
  capsuleText: {
    fontSize: 14,
    fontFamily: FONTS.bodyBold,
    color: COLORS.capsule,
    textAlign: 'center',
  },
  capsuleTextUnlocked: {
    color: COLORS.success,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.warmWhite,
    fontSize: 15,
    fontFamily: FONTS.uiBold,
  },
  deleteButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  deleteButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontFamily: FONTS.uiMedium,
  },
  editTitle: {
    fontSize: 22,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.md,
  },
  editBody: {
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
  editActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.inkLight,
    fontSize: 15,
    fontFamily: FONTS.uiMedium,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.warmWhite,
    fontSize: 15,
    fontFamily: FONTS.uiBold,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
