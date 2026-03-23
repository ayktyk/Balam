import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import {
  getMilestonePreset,
  MILESTONE_PRESETS,
} from '../../constants/milestones';
import {
  COLORS,
  FONTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { FadeInView } from '../../components/FadeInView';
import { Entry } from '../../types/entry';

export default function MilestonesScreen() {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const [milestones, setMilestones] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.familyId) {
      setMilestones([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const entriesQuery = query(
      collection(db, 'entries'),
      where('familyId', '==', profile.familyId),
      orderBy('entryDate', 'desc')
    );

    const unsubscribe = onSnapshot(
      entriesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Entry[];

        const milestoneEntries = data.filter(
          (entry) => entry.type === 'milestone'
        );

        setMilestones(milestoneEntries);
        setLoading(false);
      },
      (error) => {
        if (__DEV__) {
          const message =
            error instanceof Error ? error.message : 'Bilinmeyen hata';
          // eslint-disable-next-line no-console
          console.log('Milestone yükleme hatası:', message);
        }

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [profile?.familyId]);

  const completedTags = new Set(
    milestones
      .map((entry) => entry.milestoneTag)
      .filter((tag): tag is string => Boolean(tag))
  );

  function openMilestoneWriter(tag?: string) {
    const preset = getMilestonePreset(tag);

    router.push({
      pathname: '/(tabs)/write',
      params: {
        type: 'milestone',
        ...(tag ? { milestoneTag: tag } : {}),
        ...(preset ? { title: preset.title } : {}),
      },
    });
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.cream }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.cream }]} contentContainerStyle={styles.content}>
      <FadeInView style={[styles.heroCard, { backgroundColor: colors.creamDark, borderColor: colors.border }]}>
        <Text style={[styles.heroEyebrow, { color: colors.gold }]}>Milestone günlüğü</Text>
        <Text style={[styles.heroTitle, { color: colors.ink }]}>Büyümenin izlerini bir arada tut</Text>
        <Text style={[styles.heroText, { color: colors.inkLight }]}>
          İlkler, küçük zaferler ve unutmak istemediğiniz anlar burada birikiyor.
        </Text>
        <View style={styles.heroStats}>
          <View style={[styles.statCard, { backgroundColor: colors.warmWhite }]}>
            <Text style={[styles.statValue, { color: colors.ink }]}>{milestones.length}</Text>
            <Text style={[styles.statLabel, { color: colors.inkLight }]}>Kayıtlı adım</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.warmWhite }]}>
            <Text style={[styles.statValue, { color: colors.ink }]}>{completedTags.size}</Text>
            <Text style={[styles.statLabel, { color: colors.inkLight }]}>Etiketli milestone</Text>
          </View>
        </View>
      </FadeInView>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Hazır milestone listesi</Text>
          <TouchableOpacity onPress={() => openMilestoneWriter()}>
            <Text style={[styles.sectionAction, { color: colors.gold }]}>Yeni ekle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.presetList}>
          {MILESTONE_PRESETS.map((preset) => {
            const completed = completedTags.has(preset.id);

            return (
              <FadeInView
                key={preset.id}
                delay={Math.min(MILESTONE_PRESETS.indexOf(preset) * 55, 250)}
              >
                <TouchableOpacity
                  style={[styles.presetCard, { backgroundColor: colors.warmWhite, borderColor: colors.border }]}
                  onPress={() => openMilestoneWriter(preset.id)}
                >
                  <View style={styles.presetCopy}>
                    <Text style={[styles.presetTitle, { color: colors.ink }]}>{preset.title}</Text>
                    <Text style={[styles.presetPrompt, { color: colors.inkLight }]}>{preset.prompt}</Text>
                  </View>
                  <View
                    style={[
                      styles.presetBadge,
                      { backgroundColor: colors.goldLight },
                      completed && { backgroundColor: '#DDEAD8' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetBadgeText,
                        { color: colors.ink },
                        completed && { color: colors.success },
                      ]}
                    >
                      {completed ? 'Kayıtlı' : 'Yaz'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </FadeInView>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.ink }]}>Timeline</Text>

        {milestones.length === 0 ? (
          <FadeInView style={[styles.emptyCard, { backgroundColor: colors.warmWhite, borderColor: colors.border }]} delay={100}>
            <Text style={[styles.emptyTitle, { color: colors.ink }]}>Henüz milestone yok</Text>
            <Text style={[styles.emptyText, { color: colors.inkLight }]}>
              İlk gülüşünü, ilk adımını ya da ilk kelimesini şimdi kaydedebilirsin.
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.gold }]}
              onPress={() => openMilestoneWriter('first-smile')}
            >
              <Text style={[styles.emptyButtonText, { color: colors.warmWhite }]}>İlk milestone'i yaz</Text>
            </TouchableOpacity>
          </FadeInView>
        ) : (
          <View style={styles.timeline}>
            {milestones.map((entry, index) => {
              const preset = getMilestonePreset(entry.milestoneTag);
              const date = entry.entryDate.toDate().toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });
              const coverPhoto = entry.photoUrls[0];

              return (
                <FadeInView key={entry.id} delay={Math.min(index * 80, 320)}>
                  <TouchableOpacity
                    style={styles.timelineCard}
                    onPress={() => router.push(`/entry/${entry.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.timelineDot, { backgroundColor: colors.gold }]} />
                    <View style={[styles.timelineContent, { backgroundColor: colors.warmWhite, borderColor: colors.border }]}>
                      {coverPhoto && (
                        <Image
                          source={{ uri: coverPhoto }}
                          style={styles.timelinePhoto}
                          resizeMode="cover"
                        />
                      )}
                      <Text style={[styles.timelineDate, { color: colors.gold }]}>
                        {date} · {entry.yaseminAgeLabel}
                      </Text>
                      <Text style={[styles.timelineTitle, { color: colors.ink }]}>
                        {entry.title ?? preset?.title ?? 'Milestone'}
                      </Text>
                      {preset && (
                        <Text style={[styles.timelineTag, { backgroundColor: colors.creamDark, color: colors.inkLight }]}>{preset.title}</Text>
                      )}
                      {entry.body && (
                        <Text style={[styles.timelineBody, { color: colors.ink }]} numberOfLines={3}>
                          {entry.body}
                        </Text>
                      )}
                      <Text style={[styles.timelineAuthor, { color: colors.inkLight }]}>
                        {entry.authorName} tarafından yazıldı
                      </Text>
                    </View>
                  </TouchableOpacity>
                </FadeInView>
              );
            })}
          </View>
        )}
      </View>
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
    gap: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
  },
  heroCard: {
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  heroEyebrow: {
    fontSize: 12,
    fontFamily: FONTS.uiBold,
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },
  heroText: {
    marginTop: SPACING.sm,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: FONTS.body,
    color: COLORS.inkLight,
  },
  heroStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  statValue: {
    fontSize: 24,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },
  statLabel: {
    marginTop: SPACING.xs,
    fontSize: 12,
    fontFamily: FONTS.uiMedium,
    color: COLORS.inkLight,
  },
  section: {
    gap: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.uiBold,
    color: COLORS.ink,
  },
  sectionAction: {
    fontSize: 14,
    fontFamily: FONTS.uiBold,
    color: COLORS.gold,
  },
  presetList: {
    gap: SPACING.sm,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  presetCopy: {
    flex: 1,
    gap: SPACING.xs,
  },
  presetTitle: {
    fontSize: 16,
    fontFamily: FONTS.uiBold,
    color: COLORS.ink,
  },
  presetPrompt: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: FONTS.body,
    color: COLORS.inkLight,
  },
  presetBadge: {
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.goldLight,
  },
  presetBadgeDone: {
    backgroundColor: '#DDEAD8',
  },
  presetBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.uiBold,
    color: COLORS.ink,
  },
  presetBadgeTextDone: {
    color: COLORS.success,
  },
  emptyCard: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONTS.body,
    color: COLORS.inkLight,
  },
  emptyButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  emptyButtonText: {
    color: COLORS.warmWhite,
    fontSize: 14,
    fontFamily: FONTS.uiBold,
  },
  timeline: {
    gap: SPACING.md,
  },
  timelineCard: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.gold,
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: COLORS.warmWhite,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  timelinePhoto: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.creamDark,
  },
  timelineDate: {
    fontSize: 12,
    fontFamily: FONTS.uiMedium,
    color: COLORS.gold,
  },
  timelineTitle: {
    marginTop: SPACING.xs,
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
  },
  timelineTag: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    borderRadius: 999,
    backgroundColor: COLORS.creamDark,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: FONTS.uiBold,
    color: COLORS.inkLight,
  },
  timelineBody: {
    marginTop: SPACING.sm,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: FONTS.body,
    color: COLORS.ink,
  },
  timelineAuthor: {
    marginTop: SPACING.sm,
    fontSize: 12,
    fontFamily: FONTS.ui,
    color: COLORS.inkLight,
  },
});
