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
import { FadeInView } from '../../components/FadeInView';
import { Entry } from '../../types/entry';

function EntryCard({ entry, index }: { entry: Entry; index: number }) {
  const entryDate = entry.entryDate.toDate();
  const dateStr = entryDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  const icon = entry.isCapsule ? ENTRY_ICONS.capsule : ENTRY_ICONS[entry.type];
  const coverPhoto = entry.photoUrls[0];

  return (
    <FadeInView delay={Math.min(index * 70, 280)}>
      <TouchableOpacity
        style={[styles.card, entry.isCapsule && styles.capsuleCard]}
        onPress={() => router.push(`/entry/${entry.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.authorEmoji}>{icon}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.authorName}>{entry.authorName}</Text>
            <Text style={styles.dateText}>
              {dateStr} · {entry.yaseminAgeLabel}
            </Text>
          </View>
        </View>

        {coverPhoto && (
          <Image
            source={{ uri: coverPhoto }}
            style={styles.cardPhoto}
            resizeMode="cover"
          />
        )}

        {entry.title && <Text style={styles.entryTitle}>{entry.title}</Text>}

        {entry.body && (
          <Text style={styles.entryBody} numberOfLines={3}>
            {entry.isCapsule ? '🔒 Bu kapsul henuz acilmadi...' : entry.body}
          </Text>
        )}

        {entry.isCapsule && (
          <View style={styles.capsuleBadge}>
            <Text style={styles.capsuleBadgeText}>
              {entry.capsuleUnlockAge
                ? `${entry.capsuleUnlockAge} yasinda acilacak`
                : 'Zaman kapsulu'}
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

      <Text style={styles.emptyTitle}>Ilk ani icin yer hazir</Text>
      <Text style={styles.emptyText}>
        Yasemin'in bugununden bir parca yaz, gelecekte donup okuyabileceginiz
        sicak bir aile arsivi olussun.
      </Text>

      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => router.push('/(tabs)/write')}
        activeOpacity={0.85}
      >
        <Text style={styles.emptyButtonText}>Ilk mektubu yaz</Text>
      </TouchableOpacity>

      <View style={styles.emptyHints}>
        <View style={styles.emptyHintPill}>
          <Text style={styles.emptyHintText}>Mektup</Text>
        </View>
        <View style={styles.emptyHintPill}>
          <Text style={styles.emptyHintText}>Ani</Text>
        </View>
        <View style={styles.emptyHintPill}>
          <Text style={styles.emptyHintText}>Milestone</Text>
        </View>
      </View>
    </FadeInView>
  );
}

export default function FeedScreen() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
      orderBy('entryDate', 'desc')
    );

    const unsubscribe = onSnapshot(
      entriesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Entry[];

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
        orderBy('entryDate', 'desc')
      );
      const snapshot = await getDocs(entriesQuery);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Entry[];

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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Yukleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <EntryCard entry={item} index={index} />}
        contentContainerStyle={[
          styles.list,
          entries.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
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
