import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
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
import type { ThemeColors } from '../../constants/themes';
import { AudioPlayer } from '../../components/AudioPlayer';
import { FadeInView } from '../../components/FadeInView';
import { Entry } from '../../types/entry';

import { isCapsuleUnlocked } from '../../constants/yasemin';

function EntryCard({ entry, index, isParent = true, colors }: { entry: Entry; index: number; isParent?: boolean; colors: ThemeColors }) {
  const entryDate = entry.entryDate.toDate();
  const dateStr = entryDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  const unlocked = !entry.isCapsule || isCapsuleUnlocked(entry.capsuleUnlockDate?.toDate(), entry.capsuleUnlockAge);
  const canSeeContent = isParent || unlocked;

  const icon = entry.isPrivate ? '🔒' : entry.isCapsule ? (unlocked ? '🔓' : '🔒') : ENTRY_ICONS[entry.type];
  const coverPhoto = entry.photoUrls[0];

  return (
    <FadeInView delay={Math.min(index * 70, 280)}>
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.creamDark },
          entry.isCapsule && [styles.capsuleCard, { backgroundColor: colors.capsuleBg, borderColor: colors.capsule }],
          entry.isCapsule && !unlocked && styles.capsuleCardLocked
        ]}
        onPress={() => router.push(`/entry/${entry.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.authorEmoji}>{icon}</Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.authorName, { color: colors.ink }]}>{entry.authorName}</Text>
            <Text style={[styles.dateText, { color: colors.inkLight }]}>
              {dateStr} · {entry.yaseminAgeLabel}
            </Text>
          </View>
        </View>

        {coverPhoto && canSeeContent && (
          <Image
            source={{ uri: coverPhoto }}
            style={styles.cardPhoto}
            resizeMode="cover"
          />
        )}

        {entry.voiceUrl && !entry.isCapsule && canSeeContent && (
          <View style={styles.audioWrap}>
            <AudioPlayer
              uri={entry.voiceUrl}
              durationMillis={entry.voiceDurationMillis ?? null}
              compact
            />
          </View>
        )}

        {entry.title && <Text style={[styles.entryTitle, { color: colors.ink }]}>{entry.title}</Text>}

        <Text style={[styles.entryBody, { color: colors.ink }]} numberOfLines={3}>
          {canSeeContent ? entry.body : 'Bu kapsül henüz açılmadı. Yasemin için gelecekte bir sürpriz olarak saklanıyor.'}
        </Text>

        {entry.isCapsule && (
          <View style={[styles.capsuleBadge, { backgroundColor: colors.capsule }, unlocked && { backgroundColor: colors.success }]}>
            <Text style={[styles.capsuleBadgeText, { color: colors.warmWhite }]}>
              {unlocked 
                ? 'Kapsül Açıldı' 
                : (entry.capsuleUnlockAge ? `${entry.capsuleUnlockAge} yaşında açılacak` : 'Zaman kapsülü')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </FadeInView>
  );
}

function EmptyFeedState() {
  return (
    <FadeInView style={styles.emptyContainer} duration={420}>
      <View style={styles.emptyArtWrap}>
        <View style={styles.emptyGlowLarge} />
        <View style={styles.emptyGlowSmall} />
        <View style={styles.emptyArtCard}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={styles.emptyImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <Text style={styles.emptyTitle}>İlk anı için yer hazır</Text>
      <Text style={styles.emptyText}>
        Yasemin'in bugününden bir parça yaz, gelecekte dönüp okuyabileceğiniz
        sıcak bir aile arşivi oluşsun.
      </Text>

      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/(tabs)/write')}
        activeOpacity={0.85}
      >
        <Text style={styles.emptyButtonText}>İlk mektubu yaz</Text>
      </TouchableOpacity>

      <View style={styles.emptyHints}>
        <View style={styles.emptyHintPill}>
          <Text style={styles.emptyHintText}>Mektup</Text>
        </View>
        <View style={styles.emptyHintPill}>
          <Text style={styles.emptyHintText}>Anı</Text>
        </View>
        <View style={styles.emptyHintPill}>
          <Text style={styles.emptyHintText}>Milestone</Text>
        </View>
      </View>
    </FadeInView>
  );
}

export default function FeedScreen() {
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  // Yasemin (çocuk) girişi yapıldığında isParent false olur.
  const isParent = profile?.role !== 'child';
  const isChild = profile?.role === 'child';

  // Sıralama tercihini AsyncStorage'dan yükle
  useEffect(() => {
    AsyncStorage.getItem('balam_sort_order').then((val) => {
      if (val === 'oldest') setSortNewestFirst(false);
    });
  }, []);

  function toggleSort() {
    const next = !sortNewestFirst;
    setSortNewestFirst(next);
    AsyncStorage.setItem('balam_sort_order', next ? 'newest' : 'oldest');
  }

  useEffect(() => {
    if (!profile?.familyId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const entriesQuery = query(
      collection(db, 'entries'),
      where('familyId', '==', profile.familyId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      entriesQuery,
      (snapshot) => {
        const allData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Entry[];

        // Private entry'leri filtrele: yazar kendisi gorebilir, Yasemin hepsini gorebilir
        const data = allData.filter((entry) => {
          if (!entry.isPrivate) return true;
          if (isChild) return true; // Yasemin hepsini gorebilir
          return entry.authorId === user?.uid; // Ebeveyn sadece kendisininkini gorur
        });

        setEntries(data);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        if (__DEV__) {
          const message =
            error instanceof Error ? error.message : 'Bilinmeyen hata';
          // eslint-disable-next-line no-console
          console.log('Feed dinleme hatasi:', message);
        }

        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [profile?.familyId]);

  async function onRefresh() {
    if (!profile?.familyId) {
      return;
    }

    setRefreshing(true);

    try {
      const entriesQuery = query(
        collection(db, 'entries'),
        where('familyId', '==', profile.familyId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(entriesQuery);
      const allData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Entry[];

      // Private entry'leri filtrele: yazar kendisi gorebilir, Yasemin hepsini gorebilir
      const data = allData.filter((entry) => {
        if (!entry.isPrivate) return true;
        if (isChild) return true;
        return entry.authorId === user?.uid;
      });

      setEntries(data);
    } catch (error) {
      if (__DEV__) {
        const message =
          error instanceof Error ? error.message : 'Bilinmeyen hata';
        // eslint-disable-next-line no-console
        console.log('Feed yenileme hatasi:', message);
      }
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.cream }]}>
        <Text style={[styles.emptyText, { color: colors.inkLight }]}>Yükleniyor...</Text>
      </View>
    );
  }

  const sortedEntries = sortNewestFirst ? entries : [...entries].reverse();

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
      {entries.length > 0 && (
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.creamDark, borderColor: colors.border }]}
          onPress={toggleSort}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortButtonText, { color: colors.inkLight }]}>
            {sortNewestFirst ? '⬇ En yeni önce' : '⬆ En eski önce'}
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={sortedEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <EntryCard entry={item} index={index} isParent={isParent} colors={colors} />
        )}
        contentContainerStyle={[
          styles.list,
          entries.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={<EmptyFeedState />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  sortButton: {
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: -SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 12,
    fontFamily: FONTS.uiMedium,
  },
  list: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  capsuleCard: {
    backgroundColor: COLORS.capsuleBg,
    borderWidth: 1,
    borderColor: COLORS.capsule,
    borderStyle: 'dashed',
  },
  capsuleCardLocked: {
    opacity: 0.9,
    backgroundColor: '#F3EFE7',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  authorEmoji: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  cardMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontFamily: FONTS.uiBold,
    color: COLORS.ink,
  },
  dateText: {
    fontSize: 12,
    fontFamily: FONTS.ui,
    color: COLORS.inkLight,
    marginTop: 2,
  },
  entryTitle: {
    fontSize: 18,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    marginBottom: SPACING.xs,
  },
  cardPhoto: {
    width: '100%',
    height: 176,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.warmWhite,
  },
  audioWrap: {
    marginBottom: SPACING.sm,
  },
  entryBody: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.ink,
    lineHeight: 22,
  },
  capsuleBadge: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.capsule,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  capsuleBadgeUnlocked: {
    backgroundColor: COLORS.success,
  },
  capsuleBadgeText: {
    color: COLORS.warmWhite,
    fontSize: 12,
    fontFamily: FONTS.uiMedium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyArtWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyGlowLarge: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 999,
    backgroundColor: '#EBDCB8',
    opacity: 0.55,
    top: 8,
  },
  emptyGlowSmall: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 999,
    backgroundColor: '#E7C8AF',
    opacity: 0.55,
    bottom: 20,
    left: 18,
  },
  emptyArtCard: {
    width: 150,
    height: 150,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.warmWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  emptyImage: {
    width: 112,
    height: 112,
  },
  emptyTitle: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    color: COLORS.ink,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.inkLight,
    marginTop: SPACING.sm,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  emptyButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  emptyButtonText: {
    color: COLORS.warmWhite,
    fontSize: 15,
    fontFamily: FONTS.uiBold,
  },
  emptyHints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  emptyHintPill: {
    borderRadius: 999,
    backgroundColor: COLORS.creamDark,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  emptyHintText: {
    fontSize: 12,
    color: COLORS.inkLight,
    fontFamily: FONTS.uiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
