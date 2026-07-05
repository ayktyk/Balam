# Açılış Sorunu + Veri Güvenliği Paketi — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yeniden açılışta yanlış "İlk anı" boş ekranını ortadan kaldırmak, anıları cihaz önbelleğinden anında göstermek ve tam yedek + şifre kurtarma + çöp kutusu ile veri kaybı risklerini kapatmak.

**Architecture:** Firestore kalıcı önbellek (IndexedDB) açılır; `useAuth` profil dinlemeye geçer; feed üç durumu (yükleniyor / gerçekten boş / dolu) ayırt eder. Silme yumuşak silmeye (`deletedAt` alanı) dönüşür, yeni `trash` ekranı geri alma sağlar. `lib/backup.ts` tüm veri + medyayı JSZip ile tek ZIP'e paketler. Firestore/Storage kurallarına ve mevcut verilere DOKUNULMAZ.

**Tech Stack:** Expo 55 (expo-router), React Native Web, Firebase JS SDK 12 (Auth/Firestore/Storage), JSZip (yeni bağımlılık), Vercel (git push → otomatik deploy).

**Spec:** `docs/superpowers/specs/2026-07-05-acilis-ve-veri-guvenligi-design.md`

**Test stratejisi:** Projede test altyapısı yok (jest kurulmamış). Onaylı spec gereği her task `npx tsc --noEmit` tip kontrolü + tarayıcıda elle senaryo doğrulamasıyla kapanır. Elle doğrulama için: `npm run web` (http://localhost:8081).

**KRİTİK KURAL:** Hiçbir adımda Firestore verisi silinmez/taşınmaz, `firestore.rules` ve `storage.rules` değiştirilmez. Üretime çıkmadan önce Aykut canlı uygulamadan bir kez "Tüm Anıları Dışa Aktar" ile HTML yedeği alır (Task 10, sigorta adımı).

---

### Task 1: Firestore kalıcı önbellek

**Files:**
- Modify: `lib/firebase.ts:1-31`

- [ ] **Step 1: Import satırını ve init() gövdesini güncelle**

`lib/firebase.ts` dosyasında 2. satırdaki Firestore import'unu şununla değiştir:

```ts
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
```

Sonra `init()` içindeki `_db = getFirestore(app);` satırını (satır 23) şu blokla değiştir:

```ts
  try {
    // Kalıcı önbellek: anılar cihazda saklanır, açılışta anında gelir,
    // çevrimdışıyken de okunur. Çoklu sekme yöneticisi: Safari sekmesi +
    // ana ekran PWA'sı aynı anda açıkken çakışmayı önler.
    _db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // IndexedDB açılamazsa (ör. gizli mod) eski davranışa sessizce dön.
    _db = getFirestore(app);
  }
```

Dosyanın geri kalanı (auth persistence, storage retry ayarları, export'lar) AYNEN kalır.

- [ ] **Step 2: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok (çıktı boş).

- [ ] **Step 3: Elle doğrulama**

Run: `npm run web` → tarayıcıda http://localhost:8081 aç, giriş yap.
Beklenen: Feed normal yükleniyor; tarayıcı konsolunda Firestore hatası yok. DevTools → Application → IndexedDB altında `firestore/...` veritabanı oluşmuş.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase.ts
git commit -m "feat: firestore kalici onbellek (IndexedDB) - acilista anilar aninda gelsin"
```

---

### Task 2: useAuth profili canlı ve önbellekten okusun

**Files:**
- Modify: `hooks/useAuth.ts` (dosyanın tamamı aşağıdaki içerikle değişir)

- [ ] **Step 1: Dosyayı şu içerikle değiştir**

`getDoc` (ağ öncelikli, bloklayıcı) yerine `onSnapshot`: kalıcı önbellek sayesinde ilk snapshot cihazdan anında gelir, sunucu güncellemesi arkadan otomatik düşer.

```ts
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  displayName: string;
  role: 'parent' | 'child';
  familyId: string;
  avatarEmoji: string;
  email: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Önceki kullanıcının profil dinleyicisini kapat
      unsubProfile?.();
      unsubProfile = undefined;

      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }

      // Önbellekten anında gelir, sunucudan güncellenir
      unsubProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          const profile = snap.exists()
            ? (snap.data() as UserProfile)
            : null;
          setState({ user, profile, loading: false });
        },
        () => {
          setState({ user, profile: null, loading: false });
        }
      );
    });

    return () => {
      unsubProfile?.();
      unsubAuth();
    };
  }, []);

  return state;
}
```

- [ ] **Step 2: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok.

- [ ] **Step 3: Elle doğrulama**

Tarayıcıda sayfayı yenile (Cmd/Ctrl+Shift+R).
Beklenen: Giriş açık kalıyor, profil adı/emoji ayarlarda görünüyor. İkinci yenilemede profil beklemesi hissedilmiyor (önbellekten).

- [ ] **Step 4: Commit**

```bash
git add hooks/useAuth.ts
git commit -m "feat: useAuth profili onSnapshot ile dinlesin - onbellekten aninda profil"
```

---

### Task 3: Feed durum ayrımı — ASIL HATA DÜZELTMESİ

**Files:**
- Modify: `app/(tabs)/index.tsx:158-278`

- [ ] **Step 1: authLoading'i al**

Satır 159'daki destructure'ı değiştir:

```ts
// ESKİ:
const { profile, user } = useAuth();
// YENİ:
const { profile, user, loading: authLoading } = useAuth();
```

- [ ] **Step 2: Feed effect'ine auth bekleme koşulu ekle**

Satır 183-188'deki effect başlangıcını değiştir. HATANIN KÖKÜ BURASI: auth henüz yüklenirken `profile` boş olduğu için kod "anı yok" sanıp `loading`'i kapatıyordu.

```ts
// ESKİ:
  useEffect(() => {
    if (!profile?.familyId) {
      setEntries([]);
      setLoading(false);
      return;
    }
// YENİ:
  useEffect(() => {
    if (authLoading) {
      // Auth çözülmeden feed hakkında karar verme — loading true kalır,
      // "İlk anı" boş ekranı asla erken görünmez.
      return;
    }

    if (!profile?.familyId) {
      setEntries([]);
      setLoading(false);
      return;
    }
```

Aynı effect'in bağımlılık dizisini de güncelle (satır 231):

```ts
// ESKİ:
  }, [profile?.familyId]);
// YENİ:
  }, [authLoading, profile?.familyId]);
```

- [ ] **Step 3: Yükleme görünümünü güncelle**

`ActivityIndicator`'ı react-native import'una ekle (satır 2-10 arasındaki import bloğuna, alfabetik olarak `FlatList`'ten önce):

```ts
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
```

Satır 272-278'deki loading bloğunu değiştir:

```tsx
// ESKİ:
  if (loading) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.cream }]}>
        <Text style={[styles.emptyText, { color: colors.inkLight }]}>Yükleniyor...</Text>
      </View>
    );
  }
// YENİ:
  if (authLoading || loading) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.cream, flex: 1 }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={[styles.emptyText, { color: colors.inkLight }]}>
          Anılar yükleniyor...
        </Text>
      </View>
    );
  }
```

- [ ] **Step 4: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok.

- [ ] **Step 5: Elle doğrulama — asıl şikayet senaryosu**

1. Tarayıcıda sert yenile (Cmd/Ctrl+Shift+R) → Beklenen: önce spinner ("Anılar yükleniyor..."), sonra DOĞRUDAN anı listesi. "İlk anı için yer hazır" ekranı HİÇ görünmüyor.
2. DevTools → Network → "Offline" işaretle → sayfayı yenile → Beklenen: anılar önbellekten geliyor (uygulama kabuğu tarayıcı önbelleğinden açılırsa). Not: internetsiz tam soğuk açılış service worker ister — kapsam dışı (spec "Hedef Olmayanlar"); burada beklenen, uygulama açıkken/yenilendiğinde eski anıların internetsiz okunabilmesi.
3. Yeni bir anı yaz → feed'de görünüyor.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "fix: acilista yanlis 'ilk ani' bos ekrani - auth yuklenmeden feed karari verilmez"
```

---

### Task 4: "Şifremi unuttum" (giriş ekranı)

**Files:**
- Modify: `app/(auth)/login.tsx`

- [ ] **Step 1: Import'a sendPasswordResetEmail ekle**

Satır 15-18'deki firebase/auth import'unu değiştir:

```ts
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
```

- [ ] **Step 2: showInfo yardımcısını ve handleForgotPassword'u ekle**

`showError` fonksiyonunun (satır 30-36) hemen altına ekle:

```ts
  function showInfo(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed) {
      showError(
        'Şifre sıfırlama',
        'Önce yukarıya e-posta adresini yaz, sonra tekrar "Şifremi unuttum"a dokun.'
      );
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed);
      showInfo(
        'E-posta gönderildi',
        'Şifre sıfırlama bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.'
      );
    } catch (error) {
      const code = (error as { code?: string }).code ?? '';
      const messages: Record<string, string> = {
        'auth/user-not-found': 'Bu e-posta ile kayıtlı hesap bulunamadı.',
        'auth/invalid-email': 'E-posta adresi geçersiz görünüyor.',
        'auth/too-many-requests':
          'Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.',
      };
      showError(
        'Şifre sıfırlama',
        messages[code] ?? 'Bağlantı gönderilemedi. İnternetini kontrol edip tekrar dene.'
      );
    } finally {
      setLoading(false);
    }
  }
```

- [ ] **Step 3: Bağlantıyı arayüze ekle**

Şifre `TextInput`'unun kapanışından hemen sonra (satır 128'deki `/>` sonrası), giriş butonundan önce ekle:

```tsx
          {!isRegister && (
            <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.forgotText}>Şifremi unuttum</Text>
            </TouchableOpacity>
          )}
```

`styles` içine (örneğin `switchText`'ten sonra) ekle:

```ts
  forgotText: {
    color: COLORS.inkLight,
    fontSize: 13,
    fontFamily: FONTS.ui,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
```

- [ ] **Step 4: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok.

- [ ] **Step 5: Elle doğrulama**

1. Çıkış yap → giriş ekranında "Şifremi unuttum" görünüyor (kayıt modunda görünmüyor).
2. E-posta boşken dokun → "Önce yukarıya e-posta adresini yaz..." uyarısı.
3. Kendi e-postanla dene → "E-posta gönderildi" mesajı + gerçek e-posta geliyor, bağlantıdan şifre değiştirilebiliyor.

- [ ] **Step 6: Commit**

```bash
git add "app/(auth)/login.tsx"
git commit -m "feat: sifremi unuttum - e-posta ile sifre sifirlama"
```

---

### Task 5: Yumuşak silme (deletedAt) — silme artık geri alınabilir

**Files:**
- Modify: `types/entry.ts:27`
- Modify: `app/entry/[id].tsx:18,128-150,217-240`
- Modify: `app/(tabs)/index.tsx:207-211,253-257` (feed filtreleri)
- Modify: `app/(tabs)/milestones.tsx:54-57`

- [ ] **Step 1: Entry tipine deletedAt ekle**

`types/entry.ts` içinde `updatedAt: Timestamp;` satırının (satır 27) altına ekle:

```ts
  // Çöp kutusu: doluysa anı silinmiş sayılır, 30 gün geri alınabilir.
  // Eski kayıtlarda alan yoktur — yokluk "aktif" demektir. Migration YOK.
  deletedAt?: Timestamp | null;
```

- [ ] **Step 2: entry/[id].tsx silmeyi yumuşak silmeye çevir**

Satır 18'deki import'tan `deleteDoc`'u çıkar:

```ts
import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
```

`confirmDelete` fonksiyonunu (satır 128'den başlayan) tamamen şununla değiştir:

```ts
  function confirmDelete() {
    if (Platform.OS === 'web') {
      return Promise.resolve(
        window.confirm(
          'Bu anı çöp kutusuna taşınacak. 30 gün içinde Ayarlar → Çöp Kutusu bölümünden geri alabilirsin. Devam edilsin mi?'
        )
      );
    }

    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Çöp kutusuna taşı',
        'Bu anı çöp kutusuna taşınacak. 30 gün içinde geri alabilirsin.',
        [
          {
            text: 'İptal',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Taşı',
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }
```

`handleDelete` içindeki try bloğunu (satır 233-235) değiştir:

```ts
// ESKİ:
    try {
      await deleteDoc(doc(db, 'entries', id));
      router.back();
// YENİ:
    try {
      // KALICI SİLME YOK: çöp kutusuna taşı (deletedAt işaretle)
      await updateDoc(doc(db, 'entries', id), { deletedAt: Timestamp.now() });
      router.back();
```

- [ ] **Step 3: Feed filtrelerine çöp kontrolü ekle**

`app/(tabs)/index.tsx` içinde İKİ yerde (onSnapshot içi satır ~207 ve onRefresh içi satır ~253) aynı filtre bloğu var. İkisini de güncelle:

```ts
// ESKİ (iki yerde):
        const data = allData.filter((entry) => {
          if (!entry.isPrivate) return true;
          if (isChild) return true;
          return entry.authorId === user?.uid;
        });
// YENİ (iki yerde):
        const data = allData.filter((entry) => {
          if (entry.deletedAt) return false; // çöp kutusundakiler feed'de gizli
          if (!entry.isPrivate) return true;
          if (isChild) return true;
          return entry.authorId === user?.uid;
        });
```

(İlk blokta yorum satırı "Private entry'leri filtrele..." aynen kalabilir.)

- [ ] **Step 4: Milestones ekranında da çöptekileri gizle**

`app/(tabs)/milestones.tsx` satır 54-57'deki map'i değiştir:

```ts
// ESKİ:
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Entry[];
// YENİ:
        const data = (snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Entry[]).filter((entry) => !entry.deletedAt);
```

- [ ] **Step 5: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok.

- [ ] **Step 6: Elle doğrulama**

1. Deneme anısı oluştur → detayına gir → Sil → onay metni "çöp kutusuna taşınacak..." diyor.
2. Feed'e dön → anı listede YOK. Milestones sekmesinde de yok.
3. Firebase Console → Firestore → entries → ilgili doküman DURUYOR, `deletedAt` alanı dolu. (Veri kaybolmadı, sadece işaretlendi.)

- [ ] **Step 7: Commit**

```bash
git add types/entry.ts "app/entry/[id].tsx" "app/(tabs)/index.tsx" "app/(tabs)/milestones.tsx"
git commit -m "feat: yumusak silme - sil artik cop kutusuna tasir, veri kaybolmaz"
```

---

### Task 6: Çöp Kutusu ekranı

**Files:**
- Modify: `lib/storage.ts` (sonuna yardımcı fonksiyon eklenir)
- Create: `app/trash.tsx`
- Modify: `app/_layout.tsx:41-49` (Stack.Screen kaydı)
- Modify: `app/(tabs)/settings.tsx` ("Veri" bölümüne çöp kutusu bağlantısı)

- [ ] **Step 1: lib/storage.ts sonuna medya silme yardımcısı ekle**

Dosyanın mevcut içeriğine dokunma; sonuna ekle. Mevcut import'larda `deleteObject` ve `ref` yoksa firebase/storage import'una ekle (dosyayı okuyup mevcut import stiline uydur):

```ts
import { deleteObject, ref } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Kalıcı silmede anının medya dosyalarını Storage'dan temizler.
 * Tek dosya hatası tüm işlemi durdurmaz: doküman silinmesi engellenmez,
 * yetim dosya kalması veri kaybından iyidir (spec: Hata Yönetimi).
 */
export async function deleteEntryMedia(
  urls: Array<string | null | undefined>
): Promise<void> {
  for (const url of urls) {
    if (!url) continue;
    try {
      await deleteObject(ref(storage, url));
    } catch {
      // dosya zaten yok veya erişilemiyor — yut ve devam et
    }
  }
}
```

- [ ] **Step 2: app/trash.tsx dosyasını oluştur**

```tsx
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

export default function TrashScreen() {
  const { profile, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Çocuk modu (Yasemin) çöp kutusunu göremez
  useEffect(() => {
    if (!authLoading && profile?.role === 'child') {
      router.replace('/(tabs)');
    }
  }, [authLoading, profile?.role]);

  const load = useCallback(async () => {
    if (!profile?.familyId) return;
    setLoading(true);
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

      const trashed = all.filter((e) => e.deletedAt);

      // 30 günü geçenleri sessizce kalıcı temizle
      const now = Date.now();
      const keep: Entry[] = [];
      for (const e of trashed) {
        const deletedMs = e.deletedAt?.toDate?.()?.getTime?.() ?? now;
        if (now - deletedMs > PURGE_MS) {
          await deleteEntryMedia([...(e.photoUrls || []), e.voiceUrl]);
          await deleteDoc(doc(db, 'entries', e.id));
        } else {
          keep.push(e);
        }
      }

      keep.sort(
        (a, b) =>
          (b.deletedAt?.toDate?.()?.getTime?.() ?? 0) -
          (a.deletedAt?.toDate?.()?.getTime?.() ?? 0)
      );
      setItems(keep);
    } catch (error) {
      if (__DEV__) console.log('Çöp kutusu yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.familyId]);

  useEffect(() => {
    if (!authLoading && profile?.familyId) load();
  }, [authLoading, profile?.familyId, load]);

  async function handleRestore(entry: Entry) {
    setBusyId(entry.id);
    try {
      await updateDoc(doc(db, 'entries', entry.id), { deletedAt: null });
      setItems((prev) => prev.filter((i) => i.id !== entry.id));
    } catch {
      if (Platform.OS === 'web') window.alert('Geri alınamadı, tekrar dene.');
      else Alert.alert('Hata', 'Geri alınamadı, tekrar dene.');
    } finally {
      setBusyId(null);
    }
  }

  async function handlePermanentDelete(entry: Entry) {
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
      await deleteEntryMedia([...(entry.photoUrls || []), entry.voiceUrl]);
      await deleteDoc(doc(db, 'entries', entry.id));
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

          return (
            <View style={[styles.card, { backgroundColor: colors.creamDark }]}>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>
                {item.title || (item.body ? item.body.slice(0, 60) : 'Anı')}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.inkLight }]}>
                {item.authorName} · {deletedStr} tarihinde silindi ·{' '}
                {remaining} gün sonra kalıcı silinir
              </Text>
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
});
```

- [ ] **Step 3: Rotayı kaydet**

`app/_layout.tsx` içinde `entry/[id]` Stack.Screen bloğunun (satır 43-49) hemen altına ekle:

```tsx
        <Stack.Screen
          name="trash"
          options={{
            title: 'Çöp Kutusu',
            headerBackTitle: 'Geri',
          }}
        />
```

- [ ] **Step 4: Ayarlardan bağlantı ver**

`app/(tabs)/settings.tsx` içinde "Veri" bölümündeki dışa aktarma kartının kapanış `</TouchableOpacity>` etiketinden (satır ~357) hemen sonra, `</View>` kapanmadan önce ekle:

```tsx
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.creamDark, marginTop: SPACING.md }]}
              onPress={() => router.push('/trash')}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.cardText, { color: colors.ink }]}>Çöp Kutusu</Text>
                  <Text style={[styles.cardHint, { color: colors.inkLight }]}>
                    Silinen anıları 30 gün içinde geri al.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
```

- [ ] **Step 5: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok.

- [ ] **Step 6: Elle doğrulama**

1. Task 5'te sildiğin deneme anısı: Ayarlar → Çöp Kutusu → listede görünüyor, "X gün sonra kalıcı silinir" yazıyor.
2. "Geri Al" → feed'de tekrar görünüyor.
3. Tekrar sil → çöp kutusunda "Kalıcı Sil" → İKİ onay soruluyor → onayla → Firebase Console'da doküman gerçekten silinmiş, Storage'da fotoğrafları da silinmiş.
4. Yasemin koduyla gir → Ayarlar'da çöp kutusu bağlantısı yok; /trash adresine gidilirse ana sayfaya atıyor.

- [ ] **Step 7: Commit**

```bash
git add lib/storage.ts app/trash.tsx app/_layout.tsx "app/(tabs)/settings.tsx"
git commit -m "feat: cop kutusu ekrani - geri al, cift onayli kalici silme, 30 gun otomatik temizlik"
```

---

### Task 7: ZIP yedek altyapısı (lib/backup.ts)

**Files:**
- Modify: `package.json` (jszip bağımlılığı)
- Create: `lib/backup.ts`

- [ ] **Step 1: jszip kur**

Run: `npm install jszip`
Expected: `added 1 package` (jszip kendi tip tanımlarıyla gelir, @types gerekmez).

- [ ] **Step 2: lib/backup.ts dosyasını oluştur**

```ts
import JSZip from 'jszip';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Entry } from '../types/entry';

export interface BackupProgress {
  done: number;
  total: number;
}

export interface BackupResult {
  blob: Blob;
  fileName: string;
  failedFiles: string[];
}

// content-type -> dosya uzantısı; bilinmiyorsa URL'den, o da yoksa .bin (spec 2a)
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
  'audio/wav': 'wav',
};

function extFromBlob(blob: Blob, url: string): string {
  if (blob.type && EXT_MAP[blob.type]) return EXT_MAP[blob.type];
  const match = url.match(/\.([a-zA-Z0-9]{2,4})(\?|$)/);
  return match ? match[1].toLowerCase() : 'bin';
}

function tsToIso(value: unknown): string | null {
  const ts = value as { toDate?: () => Date } | null | undefined;
  return ts?.toDate?.()?.toISOString?.() ?? null;
}

// Timestamp'ları JSON'a uygun ISO metnine çevirir. TÜM kayıtlar dahildir
// (çöp kutusundakiler deletedAt alanıyla) — felaket kurtarma amaçlı tam kopya.
export function serializeEntries(entries: Entry[]) {
  return entries.map((e) => ({
    ...e,
    entryDate: tsToIso(e.entryDate),
    createdAt: tsToIso(e.createdAt),
    updatedAt: tsToIso(e.updatedAt),
    capsuleUnlockDate: e.capsuleUnlockDate ? tsToIso(e.capsuleUnlockDate) : null,
    deletedAt: e.deletedAt ? tsToIso(e.deletedAt) : null,
  }));
}

const TYPE_LABELS: Record<string, string> = {
  letter: 'Mektup',
  memory: 'Anı',
  milestone: 'Adım',
  voice: 'Ses Kaydı',
};

// Çevrimdışı açılan albüm sayfası. Gizlilik (spec 2a): başka kullanıcının
// isPrivate mektupları içerikleriyle GÖSTERİLMEZ, kilitli satır olarak listelenir.
// Çöp kutusundakiler albüme hiç girmez. Medya yerel (medya/...) yolla bağlanır.
export function buildAlbumHtml(
  entries: Entry[],
  familyName: string,
  currentUid: string,
  mediaPathFor: (url: string) => string
): string {
  const visible = entries.filter((e) => !e.deletedAt);

  const entryCards = visible
    .map((e) => {
      const date = e.entryDate?.toDate?.()
        ? e.entryDate.toDate().toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long',
          })
        : '';

      const isForeignPrivate = e.isPrivate && e.authorId !== currentUid;
      if (isForeignPrivate) {
        return `
        <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);color:#6B5B45;">
          🔒 <strong>Gizli mektup</strong> — ${e.authorName || ''} · ${date}<br/>
          <span style="font-size:13px;">İçerik albümde gösterilmez; yedeğin içinde (anilar.json) saklıdır.</span>
        </div>`;
      }

      const photos = (e.photoUrls || [])
        .map(
          (url: string) =>
            `<img src="${mediaPathFor(url)}" style="max-width:100%;border-radius:12px;margin:8px 0;" />`
        )
        .join('');

      const audio = e.voiceUrl
        ? `<div style="margin:8px 0;"><audio controls src="${mediaPathFor(e.voiceUrl)}" style="width:100%;"></audio></div>`
        : '';

      const badge = e.isCapsule
        ? '<span style="background:#8B7355;color:#fff;padding:3px 10px;border-radius:8px;font-size:12px;">Zaman Kapsülü</span> '
        : '';
      const privateBadge = e.isPrivate
        ? '<span style="background:#C9A96E;color:#fff;padding:3px 10px;border-radius:8px;font-size:12px;">Gizli Mektup</span> '
        : '';

      return `
        <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <strong>${e.authorName || ''}</strong>
            <span style="color:#6B5B45;font-size:13px;margin-left:auto;">${TYPE_LABELS[e.type] || ''}</span>
          </div>
          <div style="color:#6B5B45;font-size:13px;margin-bottom:12px;">${date}${e.yaseminAgeLabel ? ' · ' + e.yaseminAgeLabel : ''}</div>
          ${badge}${privateBadge}
          ${e.title ? `<h3 style="margin:8px 0 4px;font-family:Georgia,serif;">${e.title}</h3>` : ''}
          ${photos}
          ${audio}
          <div style="white-space:pre-wrap;line-height:1.7;font-family:Georgia,serif;">${e.body || ''}</div>
        </div>`;
    })
    .join('');

  const now = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Balam — ${familyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #F5F0E8; font-family: -apple-system, 'Segoe UI', sans-serif; color: #2C2416; padding: 20px; max-width: 680px; margin: 0 auto; }
    h1 { font-family: Georgia, serif; text-align: center; margin: 32px 0 4px; }
    .subtitle { text-align: center; color: #6B5B45; margin-bottom: 32px; font-size: 14px; }
    img { display: block; }
    audio { border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Balam</h1>
  <div class="subtitle">${familyName} · ${visible.length} anı · ${now} tarihinde yedeklendi</div>
  ${entryCards}
  <div style="text-align:center;color:#6B5B45;font-size:12px;padding:32px 0;">
    Balam tam yedeği — bu dosya internetsiz çalışır, fotoğraflar "medya" klasöründedir
  </div>
</body>
</html>`;
}

export async function createBackupZip(opts: {
  familyId: string;
  familyName: string;
  currentUid: string;
  onProgress?: (p: BackupProgress) => void;
}): Promise<BackupResult> {
  const snapshot = await getDocs(
    query(
      collection(db, 'entries'),
      where('familyId', '==', opts.familyId),
      orderBy('entryDate', 'desc')
    )
  );
  const entries = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Entry[];

  // İndirilecek medya listesi (albümde görünecek kayıtların medyası)
  const jobs: { url: string; entryId: string; kind: string; index: number }[] = [];
  for (const e of entries) {
    if (e.deletedAt) continue;
    (e.photoUrls || []).forEach((url, i) =>
      jobs.push({ url, entryId: e.id, kind: 'foto', index: i + 1 })
    );
    if (e.voiceUrl) {
      jobs.push({ url: e.voiceUrl, entryId: e.id, kind: 'ses', index: 1 });
    }
  }

  const zip = new JSZip();
  const failed: string[] = [];
  const localPath = new Map<string, string>();
  let done = 0;

  // Tek dosya hatası yedeği durdurmaz (spec: Hata Yönetimi)
  for (const job of jobs) {
    try {
      const res = await fetch(job.url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const ext = extFromBlob(blob, job.url);
      const path = `medya/${job.entryId}/${job.kind}-${job.index}.${ext}`;
      zip.file(path, blob);
      localPath.set(job.url, path);
    } catch {
      failed.push(job.url);
    }
    done += 1;
    opts.onProgress?.({ done, total: jobs.length });
  }

  zip.file('anilar.json', JSON.stringify(serializeEntries(entries), null, 2));
  zip.file(
    'album.html',
    buildAlbumHtml(
      entries,
      opts.familyName,
      opts.currentUid,
      (url) => localPath.get(url) ?? url
    )
  );
  if (failed.length > 0) {
    zip.file(
      'eksik-dosyalar.txt',
      [
        'Bu medya dosyaları indirilemedi. İnternet bağlantısını kontrol edip yedeği tekrar alın:',
        '',
        ...failed,
      ].join('\n')
    );
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const date = new Date().toISOString().slice(0, 10);
  return {
    blob,
    fileName: `balam-yedek-${date}.zip`,
    failedFiles: failed,
  };
}
```

- [ ] **Step 3: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json lib/backup.ts
git commit -m "feat: tam yedek altyapisi - jszip ile yazi+medya tek zip"
```

---

### Task 8: Ayarlar — "Tam Yedek İndir" + 30 gün hatırlatması

**Files:**
- Modify: `app/(tabs)/settings.tsx`

- [ ] **Step 1: Import'ları güncelle**

- Satır 5-6'daki `expo-file-system` ve `expo-sharing` import'larını SİL (yalnızca eski export kullanıyordu).
- Satır 7'deki firestore import'una `Timestamp` ekle; artık kullanılmayan `getDocs`, `collection`, `query`, `where`, `orderBy`'ı kaldır:

```ts
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
```

- `useAuth` import'unun yanına backup import'u ekle:

```ts
import { createBackupZip, BackupProgress } from '../../lib/backup';
```

- [ ] **Step 2: buildHtmlExport ve handleExport'u kaldır, yerine handleFullBackup koy**

`buildHtmlExport` fonksiyonunu (satır 65-133) ve `handleExport` fonksiyonunu (satır 135-192) tamamen sil. Yerine şunu ekle; ayrıca state'lere `backupProgress` ekle (satır 24'teki `exporting` state'inin altına):

```ts
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
```

```ts
  async function handleFullBackup() {
    if (!profile?.familyId || !user) return;

    if (Platform.OS !== 'web') {
      Alert.alert('Bilgi', 'Tam yedek şimdilik web sürümünde (tarayıcı / ana ekran uygulaması) alınabiliyor.');
      return;
    }

    setExporting(true);
    setBackupProgress(null);
    try {
      const { blob, fileName, failedFiles } = await createBackupZip({
        familyId: profile.familyId,
        familyName: familyData?.name || 'Balam Ailesi',
        currentUid: user.uid,
        onProgress: setBackupProgress,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Hatırlatma için son yedek bilgisini aile kaydına yaz (yalnız bu 2 alan)
      const now = Timestamp.now();
      await updateDoc(doc(db, 'families', profile.familyId), {
        lastBackupAt: now,
        lastBackupBy: profile.displayName,
      });
      setFamilyData((prev: any) => ({ ...prev, lastBackupAt: now, lastBackupBy: profile.displayName }));

      window.alert(
        failedFiles.length > 0
          ? `Yedek indirildi ama ${failedFiles.length} medya dosyası inemedi — ayrıntı ZIP içindeki eksik-dosyalar.txt dosyasında. Yedeği tekrar almayı dene.`
          : 'Tam yedek indirildi. Dosyayı bilgisayarına veya harici bir diske de kopyalamayı unutma.'
      );
    } catch (error) {
      console.error('Yedek hatası:', error);
      window.alert('Yedek alınamadı. İnternet bağlantını kontrol edip tekrar dene.');
    } finally {
      setExporting(false);
      setBackupProgress(null);
    }
  }
```

- [ ] **Step 3: "Veri" bölümünü güncelle (hatırlatma kartı + yeni buton metni)**

Return içinde `isParent` hesabının (satır ~212) altına hatırlatma değişkenlerini ekle:

```ts
  const lastBackupDate: Date | null = familyData?.lastBackupAt?.toDate?.() ?? null;
  const daysSinceBackup = lastBackupDate
    ? Math.floor((Date.now() - lastBackupDate.getTime()) / 86400000)
    : null;
  const showBackupReminder = isParent && (daysSinceBackup === null || daysSinceBackup > 30);
```

"Veri" bölümünde (satır 341-358) dışa aktarma kartını şununla değiştir (hatırlatma kartı + yeni kart; Task 6'da eklenen Çöp Kutusu kartı altta aynen kalır):

```tsx
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.inkLight }]}>Veri</Text>

            {showBackupReminder && (
              <View style={[styles.card, { backgroundColor: colors.capsuleBg, borderWidth: 1, borderColor: colors.gold, marginBottom: SPACING.md }]}>
                <Text style={[styles.cardText, { color: colors.ink }]}>
                  {daysSinceBackup === null
                    ? 'Henüz hiç tam yedek alınmamış.'
                    : `Son yedek ${daysSinceBackup} gün önce alınmış.`}
                </Text>
                <Text style={[styles.cardHint, { color: colors.inkLight }]}>
                  Anıların güvende kalması için arada bir tam yedek indir.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.creamDark }, exporting && { opacity: 0.7 }]}
              onPress={handleFullBackup}
              disabled={exporting}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.cardText, { color: colors.ink }]}>Tam Yedek İndir (ZIP)</Text>
                  <Text style={[styles.cardHint, { color: colors.inkLight }]}>
                    {exporting && backupProgress
                      ? `İndiriliyor: ${backupProgress.done}/${backupProgress.total} dosya`
                      : 'Tüm yazılar + fotoğraflar + sesler tek dosyada. İçindeki album.html çevrimdışı açılır.'}
                  </Text>
                </View>
                {exporting && <ActivityIndicator size="small" color={colors.gold} />}
              </View>
            </TouchableOpacity>
```

(Bölümün kapanışı: Task 6'daki Çöp Kutusu kartı + `</View>` aynen devam eder.)

- [ ] **Step 4: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok. (Silinen import'lar başka yerde kullanılıyorsa tsc söyler — o import'u geri koy.)

- [ ] **Step 5: Elle doğrulama**

1. Ayarlar → "Henüz hiç tam yedek alınmamış" hatırlatma kartı görünüyor.
2. "Tam Yedek İndir (ZIP)" → ilerleme "X/Y dosya" akıyor → `balam-yedek-2026-07-XX.zip` iniyor.
3. ZIP'i aç: `anilar.json` tüm kayıtları içeriyor; `album.html` çift tıklayınca internetsiz açılıyor, fotoğraflar ve sesler ÇALIŞIYOR (yerel medya klasöründen).
4. Büşra'nın gizli mektubu (varsa) albümde "🔒 Gizli mektup" satırı olarak görünüyor, içeriği yok; `anilar.json` içinde duruyor.
5. Yedek sonrası hatırlatma kartı kayboldu (lastBackupAt yazıldı).
6. Firebase Console → families dokümanında yalnız `lastBackupAt` + `lastBackupBy` eklendi, diğer alanlar aynen duruyor.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/settings.tsx"
git commit -m "feat: tam zip yedek butonu + 30 gun yedek hatirlatmasi"
```

---

### Task 9: Kurtarma rehberi (ayarlar kartı + REHBER.md)

**Files:**
- Modify: `app/(tabs)/settings.tsx` (statik bilgi kartı)
- Modify: `REHBER.md` (sona bölüm eklenir — NOT: bu dosya şu an git'te değil; bu commit ile repoya ilk kez girer, içeriği Aykut'un mevcut rehberi)

- [ ] **Step 1: Ayarlara "Hesap ve Kurtarma" kartı ekle**

`settings.tsx` içinde "Veri" bölümünün kapanış `</View>` etiketinden sonra (Çöp Kutusu kartının olduğu bölümün bitişi, `isParent` bloğu içinde) ekle:

```tsx
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.inkLight }]}>Hesap ve Kurtarma</Text>
            <View style={[styles.card, { backgroundColor: colors.creamDark }]}>
              <Text style={[styles.cardText, { color: colors.ink }]}>Anıların bulutta güvende</Text>
              <Text style={[styles.cardHint, { color: colors.inkLight, marginTop: SPACING.xs, lineHeight: 20 }]}>
                • Telefon değişince: yeni telefonda uygulama adresini aç, giriş yap — her şey yerinde.{'\n'}
                • Şifreni unutursan: giriş ekranındaki "Şifremi unuttum" bağlantısını kullan.{'\n'}
                • Uygulama telefondan silinirse: hiçbir anı kaybolmaz, veriler bulutta durur.{'\n'}
                • İkinizin de ayrı hesabı var: biri kilitlense diğeri tüm arşive erişir.{'\n'}
                • Yine de arada bir "Tam Yedek İndir" ile kopyayı bilgisayara al.
              </Text>
            </View>
          </View>
```

- [ ] **Step 2: REHBER.md sonuna bölüm ekle**

Önce dosyayı oku (mevcut içeriğe dokunma), sonuna ekle:

```md

## Veri Güvenliği ve Kurtarma

**Anılar nerede duruyor?** Tüm yazılar, fotoğraflar ve sesler telefonda değil,
Google'ın Firebase bulutunda duruyor. Telefon kaybolsa, kırılsa, uygulama silinse
bile anılar kaybolmaz.

**Telefon değiştirdim, ne yapmalıyım?**
Yeni telefonda Safari/Chrome ile uygulama adresini aç, e-posta ve şifrenle giriş
yap, "Ana Ekrana Ekle" de. Hepsi bu — bütün anılar yerinde.

**Şifremi unuttum.**
Giriş ekranında "Şifremi unuttum"a dokun. E-postana sıfırlama bağlantısı gelir.
İkinizin ayrı hesabı olduğu için biri kilitli kalsa bile diğeri her şeye erişebilir.

**Yanlışlıkla bir anıyı sildim.**
Silinen anılar 30 gün boyunca Ayarlar → Çöp Kutusu'nda bekler. Oradan "Geri Al"
demen yeterli.

**Yedek nasıl alınır?**
Ayarlar → "Tam Yedek İndir (ZIP)". İnen dosyada tüm yazılar (anilar.json),
fotoğraflar/sesler (medya klasörü) ve çift tıklayınca internetsiz açılan bir albüm
(album.html) vardır. Bu dosyayı arada bir bilgisayara ve mümkünse bir harici
diske/USB'ye kopyala. Uygulama 30 günü geçince nazikçe hatırlatır.
```

- [ ] **Step 3: Tip kontrolü**

Run: `npx tsc --noEmit`
Expected: hata yok.

- [ ] **Step 4: Elle doğrulama**

Ayarlar ekranında "Hesap ve Kurtarma" kartı okunaklı görünüyor; Yasemin modunda görünmüyor (isParent bloğu içinde).

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/settings.tsx" REHBER.md
git commit -m "docs: hesap ve kurtarma rehberi - ayarlar karti + REHBER bolumu"
```

---

### Task 10: Sigorta yedeği + dağıtım + canlı test

**Files:** yok (dağıtım ve doğrulama)

- [ ] **Step 1: SİGORTA — canlıda değişiklik öncesi yedek**

Aykut'tan iste: şu anki CANLI uygulamada Ayarlar → "Tüm Anıları Dışa Aktar" ile HTML yedeği alsın ve bilgisayarına kaydetsin. (Yeni sürüm yayınlanmadan önceki son sigorta.)

- [ ] **Step 2: Son kontroller**

Run: `npx tsc --noEmit` → hata yok.
Run: `npm run build:web` → `dist/` başarıyla üretiliyor (Vercel aynı komutu çalıştırır).

- [ ] **Step 3: Yayınla**

```bash
git push
```

Vercel main branch'ten otomatik build alır. Vercel panelinden (veya bildirim e-postasından) build'in yeşil bittiğini doğrula.

- [ ] **Step 4: Canlı test — Aykut ile birlikte (iPhone PWA + masaüstü)**

Spec'teki elle senaryolar:

1. Uygulamayı kapat, biraz bekle, yeniden aç → anılar ANINDA geliyor, "İlk anı" ekranı yok. (ASIL ŞİKAYET — iki cihazda da test et)
2. Uygulama açıkken uçak modu → eski anılar okunabiliyor.
3. Tam Yedek İndir → ZIP masaüstünde açılıyor, album.html internetsiz çalışıyor.
4. "Şifremi unuttum" → e-posta geliyor, yeni şifreyle giriş oluyor.
5. Deneme anısı sil → Çöp Kutusu'nda → Geri Al → feed'de yerinde.
6. Yasemin koduyla giriş → çöp kutusu ve silinmişler görünmüyor.

- [ ] **Step 5: Proje hafızasını güncelle**

`.claude/memory.md` → "Şimdi" ve "Kalan İşler" bölümlerini güncelle: açılış sorunu çözüldü, offline okuma + ZIP yedek + şifre sıfırlama + çöp kutusu eklendi; kalanlardan "Offline destek (service worker)" kısmen kapandı (tam SW hâlâ ileride), "ZIP export" kapandı.

- [ ] **Step 6: Commit (hafıza güncellemesi)**

```bash
git add .claude/memory.md
git commit -m "chore: hafiza guncelle - acilis fix + veri guvenligi paketi tamamlandi"
git push
```

---

## Plan Self-Review Notları

- **Spec kapsaması:** 1a→Task 1, 1b→Task 2, 1c→Task 3, 2a→Task 7+8, 2b→Task 4, 2c→Task 5+6, 2d→Task 9, test planı+sigorta→Task 10. Boşluk yok.
- **Spec'ten bilinçli sapmalar:** (1) "Uçak modunda açılış" senaryosu "uygulama açıkken/yenilenince çevrimdışı okuma" olarak netleştirildi — internetsiz tam soğuk açılış service worker ister, o spec'te zaten kapsam dışı. (2) Eski HTML export'a Task 5'te deletedAt filtresi eklenmedi çünkü Task 8 o kodu tamamen kaldırıyor ve tüm task'lar tek seferde yayınlanıyor (Task 10).
- **Tip tutarlılığı:** `deletedAt?: Timestamp | null` (Task 5) ↔ trash/feed/backup kullanımları uyumlu; `BackupProgress`/`createBackupZip` (Task 7) ↔ settings kullanımı (Task 8) uyumlu; `deleteEntryMedia` (Task 6 Step 1) ↔ trash kullanımı uyumlu.
- **Satır numaraları** plan yazıldığı andaki dosya haline göredir; önceki task'lar dosyayı kaydırabilir — uygulayıcı, verilen KOD BLOKLARINI arayarak konumlansın, satır numarasına körlemesine güvenmesin.




