# BALAM — Claude Code Talimatları

## Proje Özeti

**Balam**, Aykut ve Büşra'nın henüz doğmamış kızları Yasemin için oluşturdukları dijital bir zaman kapsülüdür. Uygulama; mektuplar, anı fotoğrafları, sesli mesajlar ve milestone kayıtları içerir. Yasemin büyüdüğünde bu kayıtları okuyacak. Veriler her zaman dışa aktarılabilir olmalı — uygulama bir gün olmasa bile içerik kaybolmamalı.

---

## Claude Code Çalışma Kuralları

> Bu bölüm Claude Code'un bu projede nasıl davranacağını belirler. Her session başında okunur.

### Kod Kalitesi
- `any` tipi YASAK — her zaman doğru TypeScript tipi kullan
- `console.log` bırakma — geliştirme logları için `__DEV__` kontrolü kullan
- Fonksiyonlar tek sorumluluk taşısın
- Magic number kullanma, `constants/` altında sabitleri tanımla
- Yorumlar "ne yaptığını" değil "neden yaptığını" açıklasın — Türkçe yaz

### Güvenlik
- `.env` dosyasına kesinlikle dokunma
- Firebase config objesi dışında hiçbir secret koda yazılmamalı
- Firestore Security Rules her zaman aktif olmalı — açık bırakma
- Firebase config değerleri `EXPO_PUBLIC_` prefix'iyle `.env`'de tutulur

### Git Disiplini
- Test olmadan commit atma
- Commit mesajları Conventional Commits formatında: `feat:`, `fix:`, `refactor:` vb.
- Her commit tek bir iş yapmalı
- `.env` dosyası `.gitignore`'da — kesinlikle commit'leme

### Çalışma Stili
- Bir şeyi değiştirmeden önce sor
- Emin olmadığında varsayım yapma, sor
- Büyük değişiklikleri küçük parçalara böl
- Her adımda ne yaptığını Türkçe kısaca açıkla

---

## Claude Code — Hook Kurulumu

> Bir kere kurulur, sonsuza kadar çalışır.
> Önce klasörü oluştur: `mkdir -p ~/.claude/commands`

### `~/.claude/settings.json` — Global Hook'lar

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": "if echo \"$CLAUDE_TOOL_INPUT\" | grep -qE '\\.env|\\.secret'; then echo 'ENGEL: Hassas dosyaya erişim yasak!' && exit 2; fi"
        }]
      },
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "if echo \"$CLAUDE_TOOL_INPUT\" | grep -qE 'rm -rf|sudo rm'; then echo 'TEHLIKE: Bu komut onay gerektiriyor!' && exit 2; fi"
        }]
      }
    ],
    "Stop": [
      {
        "hooks": [{
          "type": "command",
          "command": "osascript -e 'display notification \"Balam: Claude işi tamamladı ✅\" with title \"Claude Code\"' 2>/dev/null || echo 'Bitti!'"
        }]
      }
    ]
  }
}
```

---

## Claude Code — Slash Komutları

> Bu dosyaları `~/.claude/commands/` altına oluştur.

### `~/.claude/commands/commit.md`
```markdown
Aşağıdaki adımları sırayla yap:
1. `git diff --staged` çalıştır
2. `git diff` çalıştır, unstaged değişiklikleri kontrol et
3. Değişikliklerin amacını analiz et
4. Conventional Commits formatında commit mesajı oluştur
5. `git add .` çalıştır
6. `git commit -m "[mesaj]"` ile commit at
7. Ne commit ettiğini Türkçe özetle
```

### `~/.claude/commands/review.md`
```markdown
$ARGUMENTS dosyasını 4 açıdan incele, Türkçe rapor ver:
1. **Güvenlik**: Firestore rules atlanıyor mu, auth açığı var mı?
2. **Performans**: Gereksiz re-render, Firestore N+1 okuma, memory leak?
3. **TypeScript**: any tipi var mı, tipler doğru mu?
4. **Expo Uyumu**: Platform farklılıkları handle edilmiş mi?
Her bölüm için: ✅ İyi / ⚠️ Dikkat / ❌ Kritik işareti koy.
```

### `~/.claude/commands/export-check.md`
```markdown
Export özelliğini test et:
1. Firestore'dan tüm entry'leri çek, sayısını kontrol et
2. Tüm Firebase Storage URL'lerinin erişilebilir olduğunu doğrula
3. entries.json formatını validate et
4. ZIP oluşturulabiliyor mu test et
5. Sonucu Türkçe raporla
```

---

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Framework | React Native + Expo (SDK 51+) |
| Backend & Auth | Firebase (Firestore + Storage + Authentication) |
| Navigasyon | Expo Router (file-based) |
| Medya | expo-image-picker, expo-av (ses) |
| Deployment | GitHub → Vercel (web/PWA) + EAS Build (APK/IPA) |
| Export | JSON + ZIP (fotoğraflar dahil) |

### Firebase Ücretsiz Katman Limitleri (Spark Plan)
- Firestore: 50.000 okuma / 20.000 yazma / 20.000 silme — günlük
- Storage: 5 GB depolama, 1 GB/gün indirme
- Authentication: Sınırsız kullanıcı
- **Balam için bu limitler fazlasıyla yeterli**

---

## Firebase Kurulum

### 1. Proje Oluştur
```
firebase.google.com → "Add project" → "balam-app"
Authentication → Sign-in method → Email/Password: AKTİF
Firestore Database → "Create database" → "Start in production mode"
Storage → "Get started"
```

### 2. Paket Kurulumu
```bash
npx expo install firebase
npx expo install @react-native-async-storage/async-storage
```

### 3. `lib/firebase.ts`
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
```

### 4. `.env`
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

---

## Firestore Veri Yapısı

> Firebase NoSQL — koleksiyon/döküman mimarisi. SQL şeması yok, aşağıdaki yapıyı birebir uygula.

```
families/                          ← koleksiyon
  {familyId}/                      ← döküman
    name: "Bizim Ailemiz"
    childAccessCodeHash: string    ← bcrypt hash, varsayılan "2026"
    childAccessEnabled: false
    childMinAge: 0
    createdAt: timestamp

    members/                       ← alt koleksiyon
      {userId}/
        displayName: "Baban" | "Annen"
        role: "parent" | "child"
        avatarEmoji: "🌿"
        email: string
        createdAt: timestamp

entries/                           ← koleksiyon (üst seviye — sorgu kolaylığı için)
  {entryId}/                       ← döküman
    familyId: string               ← hangi aileye ait
    authorId: string
    authorName: "Baban" | "Annen"
    type: "letter" | "memory" | "milestone" | "voice"
    title: string | null
    body: string | null
    photoUrls: string[]            ← Firebase Storage URL listesi
    photoCaptions: string[]
    voiceUrl: string | null
    milestoneTag: string | null
    yaseminAgeWeeks: number | null ← otomatik hesaplanır
    yaseminAgeLabel: string        ← "18 hafta 4 gün" / "3 yaş 2 ay"
    entryDate: timestamp
    isPrivate: false
    isCapsule: false
    capsuleUnlockDate: timestamp | null
    capsuleUnlockAge: number | null
    tags: string[]
    createdAt: timestamp
    updatedAt: timestamp
```

### Firestore Security Rules
```javascript
// Firebase Console → Firestore → Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Ebeveynler: kendi ailesinin entry'lerini okur/yazar
    match /entries/{entryId} {
      allow read: if request.auth != null
        && resource.data.familyId in getUserFamilies(request.auth.uid);
      allow write: if request.auth != null
        && request.resource.data.familyId in getUserFamilies(request.auth.uid)
        && getUserRole(request.auth.uid) == 'parent';
    }

    // Family dökümanları
    match /families/{familyId} {
      allow read, write: if request.auth != null
        && exists(/databases/$(database)/documents/families/$(familyId)/members/$(request.auth.uid));
    }

    // Yardımcı fonksiyonlar
    function getUserFamilies(uid) {
      // Basit MVP için: kullanıcının familyId'si profile'da tutulur
      return [get(/databases/$(database)/documents/users/$(uid)).data.familyId];
    }

    function getUserRole(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.role;
    }

    // Kullanıcı profili
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Firebase Storage Rules
```javascript
// Firebase Console → Storage → Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // families/{familyId}/entries/{entryId}/ altındaki dosyalar
    match /families/{familyId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Kullanıcı Rolleri

| Rol | Kişi | Erişim |
|-----|------|--------|
| `parent` | Aykut | Yazar, okur, yönetir |
| `parent` | Büşra | Yazar, okur, kendi telefonundan |
| `child` | Yasemin | Sadece okur — özel şifreyle, büyüyünce |

---

## Auth Akışı

### Ebeveyn Girişi (Email + Şifre)
```typescript
// (auth)/login.tsx
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// İlk kurulumda Aykut ve Büşra birer hesap oluşturur
// Sonraki girişlerde email + şifre ile giriş
```

### Yasemin'in Özel Girişi (Şifresiz — Özel Kod)
Yasemin Firebase Auth kullanmaz. Akış:

1. `(auth)/yasemin.tsx` ekranı açılır
2. **4 haneli kod** girilir — varsayılan: **2026**
3. Firestore'daki `families/{familyId}.childAccessCodeHash` ile karşılaştırılır
4. Eşleşirse: Yasemin'in yaşı hesaplanır, local state'e `role: 'child'` yazılır
5. Kilidi kalkmış entry'ler gösterilir — Yasemin sadece okur

```typescript
// hooks/useYaseminAccess.ts
import { doc, getDoc } from 'firebase/firestore';
import * as bcrypt from 'bcryptjs'; // expo ile uyumlu

export async function verifyYaseminCode(
  familyId: string,
  inputCode: string
): Promise<boolean> {
  const familyDoc = await getDoc(doc(db, 'families', familyId));
  const hash = familyDoc.data()?.childAccessCodeHash;
  if (!hash) return false;
  return bcrypt.compare(inputCode, hash);
}
```

> **Not**: bcryptjs Expo'da çalışır. `npm install bcryptjs @types/bcryptjs`

---

## Ekranlar & Navigasyon (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx            # Ebeveyn: email + şifre
│   ├── setup.tsx            # İlk kurulum: aile oluştur, "Sen kimsin?"
│   └── yasemin.tsx          # Yasemin girişi: 4 haneli kod
├── (tabs)/
│   ├── index.tsx            # Ana Akış — tüm kayıtlar
│   ├── write.tsx            # Yeni kayıt (kapsül toggle dahil)
│   ├── memories.tsx         # Fotoğraflı anılar grid
│   ├── milestones.tsx       # Milestone zaman çizelgesi
│   ├── capsule.tsx          # ⏳ Zaman Kapsülü ekranı
│   └── settings.tsx         # Export, Yasemin erişim paneli
├── entry/
│   └── [id].tsx             # Tek kayıt detay
└── _layout.tsx
```

---

## Zaman Kapsülü Modu

> "Canım Yasemin, bunu sen 18 yaşına geldiğinde okuyacaksın..."

### İki Kilit Türü
1. **Tarih kilidi** → "2044-08-15'te aç" (Yasemin'in 18. doğum günü)
2. **Yaş kilidi** → "Yasemin 18 yaşına gelince aç" (otomatik)

### Kurallar
- Ebeveynler kendi kapsüllerini her zaman tam görebilir
- Yasemin girişinde: kilidi kalkmış kapsüller açık, diğerleri bulanık
- Feed'de kilitli kapsül: 📮 ikonu + "X yılda açılacak" badge

### `capsule.tsx`
- Tüm kapsüllerin listesi + her biri için geri sayım
- "Yeni Kapsül" butonu

---

## Yasemin'in Özel Erişimi

```
[ Yasemin'in Erişimi ]          ← settings.tsx
  Durum:        [ Kapalı / Açık ]
  Özel Kod:     2026  [ Değiştir ]
  Minimum Yaş:  0 yaş  [ Düzenle ]

  ℹ️ Yasemin bu kodu girince tüm anılarını okuyabilecek.
```

- Varsayılan kod: **2026** (Yasemin'in doğum yılı)
- Kod Firestore'da bcrypt hash olarak saklanır
- Yanlış giriş: 3 denemede 5 dakika bekleme (client-side throttle, MVP için yeterli)
- Yasemin sadece okur — kayıt ekleyemez, silemez

---

## Yasemin'in Yaşı — Hesaplama Mantığı

```typescript
// constants/yasemin.ts
export const YASEMIN_DUE_DATE = new Date('2026-08-15'); // tahmini — doğumda güncelle
export const YASEMIN_BIRTH_DATE: Date | null = null;    // doğunca doldur

export function getYaseminAgeLabel(entryDate: Date): string {
  const born = !!YASEMIN_BIRTH_DATE;
  const reference = YASEMIN_BIRTH_DATE ?? YASEMIN_DUE_DATE;
  const diffMs = entryDate.getTime() - reference.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (!born) {
    const daysLeft = -diffDays;
    const weeks = Math.floor(daysLeft / 7);
    const days = daysLeft % 7;
    return `Doğumuna ${weeks} h. ${days} g. kala`;
  }

  if (diffDays < 0) return 'Doğmadan önce';
  if (diffDays < 30) return `${diffDays} günlük`;

  const months = Math.floor(diffDays / 30.44);
  if (months < 24) {
    const remainDays = diffDays - Math.floor(months * 30.44);
    return `${months} aylık${remainDays > 0 ? ` ${remainDays} günlük` : ''}`;
  }

  const years = Math.floor(diffDays / 365.25);
  const remainMonths = Math.floor((diffDays - years * 365.25) / 30.44);
  return `${years} yaşında${remainMonths > 0 ? ` ${remainMonths} aylık` : ''}`;
}

export function getYaseminCurrentAge(): number {
  if (!YASEMIN_BIRTH_DATE) return 0;
  return Math.floor(
    (Date.now() - YASEMIN_BIRTH_DATE.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

export function isCapsuleUnlocked(
  unlockDate?: Date | null,
  unlockAge?: number | null
): boolean {
  const today = new Date();
  if (unlockDate && today >= unlockDate) return true;
  if (unlockAge && getYaseminCurrentAge() >= unlockAge) return true;
  return false;
}
```

---

## Ana Akış (index.tsx) — Feed

```typescript
// Firestore sorgusu
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const q = query(
  collection(db, 'entries'),
  where('familyId', '==', familyId),
  orderBy('entryDate', 'desc')
);
```

Her kart:
- Yazar adı + emoji + tarih
- **Yasemin'in o andaki yaşı** (otomatik)
- Tür ikonu: ✉️ / 📷 / 🌟 / 🎙️ / 📮
- Kilitli kapsül → bulanık içerik + "X yılda açılacak"

---

## Yeni Kayıt Ekranı (write.tsx)

### 1. ✉️ Mektup
- Başlık (opsiyonel), büyük metin alanı
- Tarih + Yasemin yaşı otomatik
- **Zaman Kapsülü toggle** → tarih veya yaş seç

### 2. 📷 Anı
```typescript
// Firebase Storage'a yükleme
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storageRef = ref(storage, `families/${familyId}/entries/${entryId}/${filename}`);
await uploadBytes(storageRef, blob);
const url = await getDownloadURL(storageRef);
```

### 3. 🌟 Milestone
- Motor / Dil / Sosyal / Okul / Özel kategorileri
- Açıklama + fotoğraf + Kapsül toggle

### 4. 🎙️ Sesli Mesaj *(v2)*

---

## Tasarım Sistemi

### Atmosfer: "Eski Mektup, Dijital Arşiv"

### Renkler
```
--cream:        #F5F0E8   arka plan
--cream-dark:   #EDE7D9   kart
--ink:          #2C2416   ana metin
--ink-light:    #6B5B45   ikincil metin
--gold:         #C9A96E   vurgu
--gold-light:   #E8D5A3   hover
--warm-white:   #FDFAF5   input
--border:       #D4C5A9   çizgiler
--capsule:      #8B7355   kilitli kapsül
--capsule-bg:   #F0E8D8   kapsül kart arka planı
```

### Tipografi
```
Playfair Display  — başlıklar, mektup açılışları
Lora              — metin içerikleri (serif)
DM Sans           — butonlar, etiketler, navigasyon
```

### Detaylar
- Kağıt dokusu: subtle grain overlay
- Gölge: `rgba(44, 36, 22, 0.08)` yayılmış
- Köşe: `12px` kart, `20px` modal
- Animasyon: 300-400ms ease-out
- Fotoğraf çerçeve: `1.5px solid var(--gold)`
- Tarih satırı: "18 Mart 2026, Çarşamba · Yasemin 18 h. 4 g."
- Kilitli kapsül: `filter: blur(4px)` + 📮 overlay

---

## Dışa Aktarma (Export)

```
balam-export-2026-03-18/
├── entries.json
├── photos/
│   └── [entryId]-0.jpg
├── voices/           ← v2
└── README.txt
```

```json
{
  "id": "firestore-doc-id",
  "date": "2026-03-18",
  "author": "Baban",
  "type": "letter",
  "yaseminAge": "18 hafta 4 gün",
  "isCapsule": true,
  "capsuleUnlockAge": 18,
  "capsuleUnlockDate": "2044-08-15",
  "body": "..."
}
```

- Settings → "Tüm Anıları Dışa Aktar" → ZIP (expo-file-system + expo-sharing)
- Aylık export hatırlatması

---

## GitHub & Deployment

### Repo Yapısı
```
balam/
├── app/
├── components/
├── constants/
│   ├── theme.ts
│   └── yasemin.ts
├── hooks/
│   └── useYaseminAccess.ts
├── lib/
│   └── firebase.ts
├── assets/
├── .env.example
├── .gitignore              ← .env dahil
├── app.json
├── package.json
└── CLAUDE.md
```

### PWA / Ana Ekrana Ekle
```json
{
  "web": {
    "bundler": "metro",
    "output": "static",
    "name": "Balam",
    "shortName": "Balam",
    "themeColor": "#F5F0E8",
    "backgroundColor": "#F5F0E8"
  }
}
```
GitHub → Vercel deploy → `balam.vercel.app` → "Ana Ekrana Ekle"

### EAS Build (opsiyonel APK)
```bash
npm install -g eas-cli
eas build:configure
eas build --platform android --profile preview
```

---

## Geliştirme Sırası

### Faz 1 — MVP (2-3 hafta)
- [ ] Firebase projesi kur (Auth + Firestore + Storage)
- [ ] `lib/firebase.ts` bağlantısı
- [ ] Firestore Security Rules yaz
- [ ] Ebeveyn auth: email + şifre ile giriş/kayıt
- [ ] Aile kurulum ekranı (`setup.tsx`)
- [ ] Mektup yazma + Firestore'a kaydetme
- [ ] Ana feed (Yasemin yaşı otomatik)
- [ ] Temel tasarım sistemi

### Faz 2 — Zengin İçerik (1-2 hafta)
- [ ] Fotoğraf yükleme (Firebase Storage)
- [ ] Fotoğraflı anı kartları
- [ ] Milestone ekranı

### Faz 3 — Kapsül & Yasemin Erişimi (1-2 hafta)
- [ ] Zaman kapsülü toggle + kilit mantığı
- [ ] `capsule.tsx` + geri sayım
- [ ] `yasemin.tsx` giriş (4 haneli kod, bcryptjs)
- [ ] Kapsül açılma animasyonu

### Faz 4 — Taşınabilirlik (1 hafta)
- [ ] JSON + ZIP export
- [ ] Settings → Yasemin erişim paneli
- [ ] PWA + Vercel deploy
- [ ] Aylık export hatırlatması

### Faz 5 — Sesli Mesajlar (ileride)
- [ ] expo-av kayıt
- [ ] Firebase Storage yükleme
- [ ] Feed'de oynatma

---

## Önemli Notlar

1. **Firestore Security Rules zorunlu**: Açık bırakılmış rules ile production'a çıkma.
2. **bcryptjs**: Yasemin'in kodu client-side hash'lenir. `npm install bcryptjs @types/bcryptjs`
3. **Offline**: Firebase Firestore'un yerleşik offline cache'i var (`enableIndexedDbPersistence`) — Supabase'den bu açıdan daha iyi.
4. **Yedekleme**: Firebase Console'dan Firestore export alınabilir + uygulama içi ZIP export.
5. **Fontlar**: `expo-google-fonts` — Playfair Display + Lora + DM Sans.
6. **İsim**: "Balam" — Maya'da "jaguar yavrusu", Türkçe'de "bal" çağrışımı. Yasemin'e hitap: "Canım Yasemin,"
7. **Firebase offline avantajı**: `enableIndexedDbPersistence(db)` ile uygulama internet olmadan da çalışır, bağlantı gelince sync olur.

---

## Claude Code'a Başlangıç Talimatı

Bu dosyayı aldıktan sonra şu sırayla ilerle:

1. `npx create-expo-app balam --template blank-typescript`
2. Firebase projesi oluştur (firebase.google.com), `.env` değerlerini doldur
3. `npx expo install firebase @react-native-async-storage/async-storage`
4. `npm install bcryptjs @types/bcryptjs`
5. `lib/firebase.ts` dosyasını oluştur
6. Firestore Security Rules'u yaz ve yayınla
7. `constants/theme.ts` ve `constants/yasemin.ts` kur
8. Auth ekranlarını yaz: `(auth)/login.tsx` + `(auth)/yasemin.tsx`
9. Ana feed ekranını yaz
10. Mektup yazma + kapsül toggle ekranını yaz
11. Vercel'e deploy et

**Emin olmadığın şeyi sor. Varsayım yapma.**
