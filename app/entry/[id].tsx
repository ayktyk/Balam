import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { COLORS, SPACING, RADIUS, SHADOWS, ENTRY_ICONS } from '../../constants/theme';
import { Entry } from '../../types/entry';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEntry() {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'entries', id));
        if (docSnap.exists()) {
          setEntry({ id: docSnap.id, ...docSnap.data() } as Entry);
        }
      } catch (error) {
        if (__DEV__) {
          const message = error instanceof Error ? error.message : 'Bilinmeyen hata';
          // eslint-disable-next-line no-console
          console.log('Kayıt yükleme hatası:', message);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchEntry();
  }, [id]);

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

  const icon = entry.isCapsule
    ? ENTRY_ICONS.capsule
    : ENTRY_ICONS[entry.type];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Üst bilgi */}
      <View style={styles.meta}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.authorName}>{entry.authorName}</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.ageLabel}>{entry.yaseminAgeLabel}</Text>
      </View>

      {/* İçerik */}
      <View style={styles.card}>
        {entry.title && (
          <Text style={styles.title}>{entry.title}</Text>
        )}
        {entry.body && (
          <Text style={styles.body}>{entry.body}</Text>
        )}
      </View>

      {/* Kapsül bilgisi */}
      {entry.isCapsule && (
        <View style={styles.capsuleInfo}>
          <Text style={styles.capsuleText}>
            {entry.capsuleUnlockAge
              ? `Bu kapsül Yasemin ${entry.capsuleUnlockAge} yaşına gelince açılacak.`
              : 'Bu bir zaman kapsülü.'}
          </Text>
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
    fontWeight: '700',
    color: COLORS.ink,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.inkLight,
    marginTop: SPACING.xs,
  },
  ageLabel: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: SPACING.md,
  },
  body: {
    fontSize: 17,
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
  capsuleText: {
    fontSize: 14,
    color: COLORS.capsule,
    textAlign: 'center',
    fontWeight: '600',
  },
});
