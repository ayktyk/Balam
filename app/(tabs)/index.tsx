import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, SPACING, RADIUS, SHADOWS, ENTRY_ICONS } from '../../constants/theme';
import { getYaseminAgeLabel } from '../../constants/yasemin';
import { Entry, EntryType } from '../../types/entry';

function EntryCard({ entry }: { entry: Entry }) {
  const entryDate = entry.entryDate.toDate();
  const dateStr = entryDate.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  const icon = entry.isCapsule
    ? ENTRY_ICONS.capsule
    : ENTRY_ICONS[entry.type];

  return (
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

      {entry.title && (
        <Text style={styles.entryTitle}>{entry.title}</Text>
      )}

      {entry.body && (
        <Text style={styles.entryBody} numberOfLines={3}>
          {entry.isCapsule ? '🔒 Bu kapsül henüz açılmadı...' : entry.body}
        </Text>
      )}

      {entry.isCapsule && (
        <View style={styles.capsuleBadge}>
          <Text style={styles.capsuleBadgeText}>
            {entry.capsuleUnlockAge
              ? `${entry.capsuleUnlockAge} yaşında açılacak`
              : 'Zaman kapsülü'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!profile?.familyId) return;

    try {
      const q = query(
        collection(db, 'entries'),
        where('familyId', '==', profile.familyId),
        orderBy('entryDate', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Entry[];
      setEntries(data);
    } catch (error) {
      if (__DEV__) {
        const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
        // eslint-disable-next-line no-console
        console.log('Feed yükleme hatası:', message);
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.familyId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EntryCard entry={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>Henüz bir anı yok</Text>
            <Text style={styles.emptyText}>
              Yasemin için ilk mektubunu yazmaya ne dersin?
            </Text>
          </View>
        }
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
    fontWeight: '700',
    color: COLORS.ink,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.inkLight,
    marginTop: 2,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: SPACING.xs,
  },
  entryBody: {
    fontSize: 15,
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
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ink,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.inkLight,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
