import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { deleteEntryMedia } from '../lib/storage';
import { useAuth } from '../hooks/useAuth';
import { FONTS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { Entry } from '../types/entry';

// 30 günü geçen çöpler ekran açılışında kalıcı temizlenir (spec 2c)
const PURGE_DAYS = 30;
const PURGE_MS = PURGE_DAYS * 24 * 60 * 60 * 1000;

function confirmDialog(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'İptal', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Evet', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function byDeletedAtDesc(a: Entry, b: Entry): number {
  return (
    (b.deletedAt?.toDate?.()?.getTime?.() ?? 0) -
    (a.deletedAt?.toDate?.()?.getTime?.() ?? 0)
  );
}

export default function TrashScreen() {
  const { user, profile, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Oturum yoksa (ör. çıkış sonrası derin bağlantı) girişe dön;
  // çocuk modu (Yasemin) çöp kutusunu göremez.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (profile?.role === 'child') {
      router.replace('/(tabs)');
    }
  }, [authLoading, user, profile?.role]);

  const load = useCallback(async () => {
    const uid = user?.uid;
    if (!profile?.familyId || !uid) return;
    setLoading(true);
    setLoadError(false);

    let trashed: Entry[];
    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'entries'),
          where('familyId', '==', profile.familyId)
        )
      );
      const all = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Entry[];
      trashed = all.filter((e) => e.deletedAt);
    } catch (error) {
      if (__DEV__) console.log('Çöp kutusu yükleme hatası:', error);
      // Yükleme hatası "boş" demek değildir — hata ekranı göster,
      // geri alınabilir anılar varken "Çöp kutusu boş" yazma.
      setLoadError(true);
      setLoading(false);
      return;
    }

    // 30 günü geçen ve BANA ait olanlar temizlenecek; gerisi listede kalır.
    // (Kurallar gereği yalnızca yazar silebilir — eşin anısına dokunulmaz.)
    const now = Date.now();
    const expiredMine: Entry[] = [];
    const keep: Entry[] = [];
    for (const e of trashed) {
      const deletedMs = e.deletedAt?.toDate?.()?.getTime?.() ?? now;
      if (now - deletedMs > PURGE_MS && e.authorId === uid) {
        expiredMine.push(e);
      } else {
        keep.push(e);
      }
    }

    keep.sort(byDeletedAtDesc);
    // Liste önce çizilir: temizlik başarısız olsa bile ekran doğru kalır.
    setItems(keep);
    setLoading(false);

    // Çevrimdışıyken temizleme atlanır — Firestore yazmaları bağlantı
    // gelene dek askıda kalır ve akışı sonsuza kadar bekletir.
    if (isOffline()) return;

    // Sessiz kalıcı temizlik. Her kayıt kendi try/catch'inde:
    // tek kayıttaki hata diğerlerini ve listeyi etkilemez.
    for (const e of expiredMine) {
      try {
        // Önce doküman, sonra medya: yetim dosya kabul edilebilir,
        // medyası silinmiş canlı kayıt kabul edilemez.
        await deleteDoc(doc(db, 'entries', e.id));
        await deleteEntryMedia([...(e.photoUrls || []), e.voiceUrl]);
      } catch (error) {
        if (__DEV__) console.log('Çöp temizleme hatası (tek kayıt):', error);
      }
    }
  }, [profile?.familyId, user?.uid]);

  useEffect(() => {
    if (!authLoading && profile?.familyId) load();
  }, [authLoading, profile?.familyId, load]);

  function handleRestore(entry: Entry) {
    // İyimser geri alma: listeden hemen düş, yazma arka planda tamamlanır.
    // Çevrimdışıyken Firestore yazmayı kuyruğa alır, bağlantı gelince işler.
    setItems((prev) => prev.filter((i) => i.id !== entry.id));
    updateDoc(doc(db, 'entries', entry.id), { deletedAt: null }).catch(() => {
      if (Platform.OS === 'web') window.alert('Geri alınamadı, tekrar dene.');
      else Alert.alert('Hata', 'Geri alınamadı, tekrar dene.');
      setItems((prev) => [...prev, entry].sort(byDeletedAtDesc));
    });
  }

  async function handlePermanentDelete(entry: Entry) {
    if (busyId) return;
    if (isOffline()) {
      const message =
        'Çevrimdışısın. Kalıcı silme için internet bağlantısı gerekli.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Hata', message);
      return;
    }
    const first = await confirmDialog(
      'Kalıcı sil',
      'Bu anı SONSUZA DEK silinecek ve geri getirilemeyecek. Emin misin?'
    );
    if (!first) return;
    const second = await confirmDialog(
      'Son kontrol',
      `"${entry.title || entry.body?.slice(0, 40) || 'Bu anı'}" kalıcı olarak silinsin mi?`
    );
    if (!second) return;

    setBusyId(entry.id);
    try {
      // Önce doküman, sonra medya (yetim dosya > medyasız canlı kayıt).
      await deleteDoc(doc(db, 'entries', entry.id));
      await deleteEntryMedia([...(entry.photoUrls || []), entry.voiceUrl]);
      setItems((prev) => prev.filter((i) => i.id !== entry.id));
    } catch {
      if (Platform.OS === 'web') window.alert('Silinemedi, tekrar dene.');
      else Alert.alert('Hata', 'Silinemedi, tekrar dene.');
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.cream }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.cream }]}>
        <Text style={styles.emptyEmoji}>⚠️</Text>
        <Text style={[styles.emptyText, { color: colors.inkLight }]}>
          Çöp kutusu yüklenemedi. Bağlantını kontrol edip tekrar dene.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.gold }]}
          onPress={load}
        >
          <Text style={[styles.retryText, { color: colors.warmWhite }]}>
            Tekrar dene
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🗑️</Text>
            <Text style={[styles.emptyText, { color: colors.inkLight }]}>
              Çöp kutusu boş. Silinen anılar 30 gün burada bekler.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const deletedDate = item.deletedAt?.toDate?.();
          const deletedStr = deletedDate
            ? deletedDate.toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : '';
          const remaining = deletedDate
            ? Math.max(
                0,
                PURGE_DAYS -
                  Math.floor((Date.now() - deletedDate.getTime()) / 86400000)
              )
            : PURGE_DAYS;
          const busy = busyId === item.id;
          // Kurallar gereği yalnızca yazar geri alabilir/silebilir.
          const mine = item.authorId === user?.uid;

          return (
            <View style={[styles.card, { backgroundColor: colors.creamDark }]}>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>
                {item.title || (item.body ? item.body.slice(0, 60) : 'Anı')}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.inkLight }]}>
                {item.authorName} · {deletedStr} tarihinde silindi ·{' '}
                {remaining} gün sonra kalıcı silinir
              </Text>
              {mine ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.restoreButton, { backgroundColor: colors.gold }]}
                    onPress={() => handleRestore(item)}
                    disabled={busy}
                  >
                    <Text style={[styles.restoreText, { color: colors.warmWhite }]}>
                      {busy ? '...' : 'Geri Al'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: colors.danger }]}
                    onPress={() => handlePermanentDelete(item)}
                    disabled={busy}
                  >
                    <Text style={[styles.deleteText, { color: colors.danger }]}>
                      Kalıcı Sil
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[styles.ownerHint, { color: colors.inkLight }]}>
                  Bunu yalnızca yazan yönetebilir.
                </Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  list: { padding: SPACING.md, gap: SPACING.md, flexGrow: 1 },
  emptyEmoji: { fontSize: 40, marginBottom: SPACING.md },
  emptyText: {
    fontSize: 15,
    fontFamily: FONTS.body,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  cardTitle: { fontSize: 16, fontFamily: FONTS.uiBold },
  cardMeta: { fontSize: 12, fontFamily: FONTS.ui, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  restoreButton: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  restoreText: { fontSize: 13, fontFamily: FONTS.uiBold },
  deleteButton: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  deleteText: { fontSize: 13, fontFamily: FONTS.uiMedium },
  retryButton: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  retryText: { fontSize: 13, fontFamily: FONTS.uiBold },
  ownerHint: {
    fontSize: 12,
    fontFamily: FONTS.ui,
    fontStyle: 'italic',
    marginTop: SPACING.md,
  },
});
