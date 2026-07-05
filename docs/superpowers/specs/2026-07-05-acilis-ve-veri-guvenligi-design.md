# Tasarım: Açılış Sorunu Düzeltmesi + Veri Güvenliği Paketi

**Tarih:** 2026-07-05
**Durum:** Onaylandı (Aykut, sohbet içinde)
**Kapsam kararı:** "Tam paket" seçildi.

## Arka Plan

Balam, Yasemin için tutulan aile anı arşivi (Expo 55 + Firebase 12, Vercel'de PWA).
İki sorun bildirildi:

1. Uygulama bir süre kullanılmayıp yeniden açıldığında, eski anılar gelmeden önce
   "İlk anı için yer hazır" boş ekranı görünüyor; anılar ancak birkaç saniye sonra geliyor.
2. Veri kaybı, şifre unutma ve telefon değişikliği senaryolarına karşı güvence yok.

**Kök neden (kodda doğrulandı):** `app/(tabs)/index.tsx` içindeki feed effect'i,
`useAuth` daha profili yüklemeden (`loading: true` iken) `profile?.familyId` boş diye
`setLoading(false)` çağırıp boş listeyi render ediyor. Ayrıca Firestore kalıcı önbelleği
kapalı olduğundan her açılışta profil + anılar ağdan bekleniyor.

**Değişmez kural:** Mevcut Firestore/Storage verisine dokunulmaz; hiçbir geri dönüşsüz
silme/taşıma yapılmaz; `firestore.rules` ve `storage.rules` değiştirilmez.

## Hedefler

- Yeniden açılışta boş ekran ("İlk anı") asla yanlış zamanda görünmesin.
- Anılar açılışta cihaz önbelleğinden anında gelsin; çevrimdışı okunabilsin.
- Tüm veri (yazı + fotoğraf + ses) tek dosyada indirilebilir tam yedek.
- Şifre unutma ve telefon değişikliği için kurtarma yolları.
- Yanlışlıkla silmeye karşı çöp kutusu (30 gün geri alma).

## Hedef Olmayanlar (bilinçli kapsam dışı)

- Service worker ile tam çevrimdışı uygulama kabuğu (ileride).
- Zamanlanmış otomatik bulut yedeği (Spark planında mümkün değil).
- Push bildirimleri, davet linki (backlog'da ayrı işler).
- Güvenlik kuralı (rules) değişikliği.

---

## Bölüm 1 — Açılış Sorunu

### 1a. `lib/firebase.ts` — kalıcı önbellek

- `getFirestore(app)` yerine:
  `initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })`
- `try/catch` ile sarılır: IndexedDB açılamazsa (ör. Safari gizli mod) sessizce
  `getFirestore(app)`'a düşülür. Uygulama davranışı hiçbir durumda bozulmaz.
- Çoklu sekme yöneticisi şart: aynı anda Safari sekmesi + ana ekran PWA'sı açık olabilir.

### 1b. `hooks/useAuth.ts` — profil anında

- `getDoc` (ağ öncelikli, bloklayıcı) yerine `onSnapshot(doc(db, 'users', uid))`:
  kalıcı önbellek sayesinde ilk snapshot cihazdan anında gelir, ardından sunucu
  güncellemesi otomatik düşer.
- İlk snapshot geldiğinde `loading: false`. Hata durumunda `profile: null, loading: false`
  (mevcut davranışla aynı).
- Auth aboneliği + profil aboneliği düzgün temizlenir (unsubscribe zinciri).

### 1c. `app/(tabs)/index.tsx` — durum ayrımı

- `useAuth`'tan `loading` (authLoading) da alınır.
- Üç durum netleşir:
  1. `authLoading || feedLoading` → yükleme görünümü (mevcut "Yükleniyor..." metni,
     `ActivityIndicator` ile). Boş ekran asla bu fazda gösterilmez.
  2. Yükleme bitti + snapshot geldi + görünür anı 0 → `EmptyFeedState`.
  3. Anılar var → liste.
- Feed effect'indeki erken `setLoading(false)` yalnızca "auth yüklendi ve gerçekten
  profil yok" durumunda çalışır (o durumda router zaten girişe yönlendirir).
- Feed, çöp kutusundaki anıları gizler: `entry.deletedAt == null` istemci tarafı filtre
  (mevcut private filtresinin yanına; yeni Firestore index'i gerekmez).

---

## Bölüm 2 — Veri Güvenliği Paketi

### 2a. Tam ZIP yedek (Ayarlar → "Tam Yedek İndir")

- Yeni bağımlılık: `jszip`.
- Akış: tüm `entries` çekilir (`getDocs`, aile bazlı) → her `photoUrls[i]` ve `voiceUrl`
  `fetch` ile blob indirilir → ZIP oluşturulur → `balam-yedek-YYYY-AA-GG.zip` indirilir.
- ZIP içeriği:
  - `anilar.json` — TÜM kayıtların ham verisi (silinmişler `deletedAt` alanıyla dahil;
    felaket kurtarma amaçlı eksiksiz kopya).
  - `album.html` — tarayıcıda çift tıkla açılan okunabilir albüm; medya dosyalarına
    göreli yolla (`medya/...`) bağlanır, çevrimdışı çalışır. Mevcut `buildHtmlExport`
    genişletilir. **Gizlilik:** başka kullanıcının `isPrivate` mektupları albümde
    içeriğiyle gösterilmez; "🔒 Gizli mektup — yedekte saklı" satırı olarak listelenir
    (uygulama içi gizlilik davranışıyla tutarlı). Çöp kutusundakiler albüme girmez.
  - `medya/<entryId>/foto-1.jpg`, `ses.m4a` — tüm medya. Dosya uzantısı indirilen
    blob'un content-type'ından belirlenir (jpg/png/webp, m4a/webm vb.); bilinmiyorsa
    URL'den tahmin edilir, o da yoksa `.bin` kullanılır.
  - `eksik-dosyalar.txt` — indirilemeyen medya olursa listesi (yedek iptal edilmez).
- İlerleme göstergesi: "23/45 dosya" metni + spinner.
- Bitince `families/{familyId}` dokümanına `lastBackupAt: Timestamp` ve
  `lastBackupBy: displayName` yazılır (yalnızca bu iki alan; mevcut alanlara dokunulmaz).
- Hatırlatma: Ayarlar ekranında `lastBackupAt` 30 günü geçmişse veya hiç yoksa sarı
  bilgi kartı: "Son yedek X gün önce alınmış. Yedek almak ister misin?"
- Medya `fetch`'i mevcut Storage indirme URL'leriyle yapılır; CORS zaten
  `firebase.storage.cors.json` ile yapılandırılmış durumda. Uygulama sırasında canlı
  doğrulanır; sorun çıkarsa yedek yine `anilar.json` + `album.html` üretir ve medya
  hataları `eksik-dosyalar.txt`'ye yazılır.

### 2b. "Şifremi unuttum" (`app/(auth)/login.tsx`)

- Şifre alanının altına "Şifremi unuttum" bağlantısı.
- E-posta alanı doluysa `sendPasswordResetEmail(auth, email)`; boşsa "Önce e-posta
  adresini yaz" uyarısı.
- Başarı: "Sıfırlama bağlantısı e-postana gönderildi. Gelen kutunu (ve spam'i) kontrol et."
- Hata eşlemesi Türkçe: `auth/user-not-found` → "Bu e-posta ile hesap bulunamadı",
  `auth/invalid-email` → "Geçersiz e-posta", `auth/too-many-requests` → "Çok fazla deneme,
  biraz sonra tekrar dene", diğerleri → genel mesaj.

### 2c. Çöp kutusu (yumuşak silme)

- Veri modeli: `entries` dokümanına opsiyonel `deletedAt: Timestamp | null` alanı.
  Eski kayıtlarda alan yok → "aktif" sayılır. **Şema taşıma/migration yok.**
- `app/entry/[id].tsx` silme akışı: `deleteDoc` yerine
  `updateDoc({ deletedAt: Timestamp.now() })`. Onay metni "Çöp kutusuna taşınsın mı?
  30 gün içinde geri alabilirsin." olarak güncellenir.
- Yeni ekran `app/trash.tsx` (Ayarlar → "Çöp Kutusu"):
  - Aile anılarından `deletedAt != null` olanlar listelenir (istemci tarafı filtre).
  - "Geri Al" → `deletedAt: null`.
  - "Kalıcı Sil" → çift onay ("Bu anı sonsuza dek silinecek, emin misin?") →
    `deleteDoc` + medya dosyaları `ref(storage, url)` ile Storage'dan silinir.
  - Ekran açılışında 30 günü geçmiş çöpler otomatik kalıcı temizlenir.
- Çocuk modu (Yasemin, `role === 'child'`): çöp kutusu görünmez; feed'de silinmişler
  zaten gizli.
- Feed ve HTML/ZIP albümü silinmişleri göstermez; `anilar.json` her şeyi içerir.

### 2d. Kurtarma rehberi

- Ayarlara "Hesap ve Kurtarma" bilgi kartı (statik metin):
  telefon değişikliği, şifre unutma, uygulama silinmesi senaryoları — hiçbirinde veri
  kaybolmaz, çünkü veri bulutta ve iki ayrı ebeveyn hesabı var.
- `REHBER.md`'ye "Veri Güvenliği ve Kurtarma" bölümü eklenir (aynı içerik + yedek
  dosyasının nasıl saklanacağı önerisi: bilgisayara/harici diske kopyala).

---

## Hata Yönetimi İlkeleri

- Önbellek açılamazsa → sessiz geri düşüş, işlev kaybı yok.
- Yedekte tek medya hatası → yedek devam eder, rapor dosyasına yazılır.
- Kalıcı silmede Storage dosyası silinemezse → doküman silinir, hata loglanır
  (yetim dosya kalması veri kaybından iyidir).
- Tüm kullanıcı mesajları Türkçe.

## Test Planı

- Her adımda `npx tsc --noEmit`.
- Elle senaryolar (önce Vercel önizleme, sonra üretim; iPhone PWA + masaüstü):
  1. Soğuk açılış → anılar anında, boş ekran yok.
  2. Uçak modunda açılış → eski anılar okunuyor.
  3. Tam yedek indir → ZIP'i aç, `album.html` çevrimdışı çalışıyor, medya tam.
  4. Şifre sıfırlama e-postası geliyor, yeni şifreyle giriş oluyor.
  5. Anı sil → çöp kutusunda → geri al → feed'de yerinde.
  6. Yasemin girişinde çöp kutusu ve silinmişler görünmüyor.
- Üretime çıkmadan önce bir kez tam yedek alınır (değişiklik öncesi sigorta).

## Uygulama Sırası (her biri ayrı commit)

1. Kalıcı önbellek + useAuth + feed durum düzeltmesi (Bölüm 1 — asıl şikayet).
2. "Şifremi unuttum".
3. Çöp kutusu.
4. Tam ZIP yedek + hatırlatma.
5. Kurtarma rehberi (ayarlar kartı + REHBER.md).
