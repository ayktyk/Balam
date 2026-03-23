# Balam - Proje Planı

> Yasemin için aile anı ve duygu günlüğü. Ebeveynlerin mektup, anı ve zaman kapsülü bırakabileceği mobil uygulama.

## Mevcut Durum (Faz 1 MVP İskeleti)

Çalışan:
- [x] Proje yapısı (Expo SDK 55 + TypeScript + Firebase)
- [x] Tasarım sistemi (COLORS, SPACING, RADIUS, SHADOWS, FONTS tanımlı)
- [x] Auth akışı (login, kayıt, setup, yasemin girişi)
- [x] Aile kurulumu (Setup ekranı — isim + emoji + Firestore aile oluşturma)
- [x] Yazı yazma ekranı (letter/memory/milestone + zaman kapsülü)
- [x] Feed ekranı (entries listesi + pull-to-refresh + sıralama)
- [x] Entry detay ekranı
- [x] Ayarlar ekranı (profil kartı + tema + Yasemin erişimi + çıkış)
- [x] Yasemin yaşlama mantığı (constants/yasemin.ts)
- [x] useAuth hook'u (Firebase auth + Firestore profil)
- [x] Firebase config (.env ile)
- [x] Tiplendirme (Entry, Family, FamilyMember)
- [x] 5 tema sistemi (Sıcak/Gül/Okyanus/Orman/Gece)
- [x] PWA fullscreen (iOS meta tags + standalone)
- [x] Auth persistence (browserLocalPersistence)
- [x] Türkçe karakter desteği (tüm UI metinleri)
- [x] Gizli mektuplar (isPrivate — ebeveynler arası gizlilik)
- [x] Aile sistemi (oluştur + katıl + aile kodu paylaşımı)
- [x] Yasemin giriş kodu ayarlarda görünür
- [x] Feed sıralama (en yeni/en eski önce toggle)
- [x] HTML export (fotoğraflı, sesli, okunabilir)

Eksik / Çalışmayan:
- [x] Yasemin gebelik bilgisi girildi (LMP: 8 Kasım 2025, tahmini doğum: 15 Ağustos 2026)
- [x] Font'lar yüklenmiş (Playfair Display, Lora, DM Sans)

---

## Faz 1: Temeli Sağlamlaştır ✅

- [x] Firebase bağlantısı
- [x] `.env` dosyası Firebase bilgileriyle dolduruldu
- [x] Firebase Auth (Email/Password) etkinleştirildi
- [x] Firestore Database oluşturuldu
- [x] Font kurulumu (Playfair Display, Lora, DM Sans)
- [x] Görsel iyileştirmeler (logo, boş feed görseli, animasyonlar)
- [x] Entry düzenleme / silme
- [x] Feed'de gerçek zamanlı dinleme (onSnapshot)

---

## Faz 2: Medya ve Milestone'lar ✅

- [x] Foto desteği (expo-image-picker + Firebase Storage)
- [x] Milestone sistemi (önceden tanımlı liste + timeline görünümü)
- [x] Ses kaydı (expo-av + Firebase Storage + oynatıcı)

---

## Faz 3: Yasemin Erişimi ✅

- [x] Çocuk girişi (bcrypt doğrulama)
- [x] Yaş kontrolü (ayarlardan min yaş belirle)
- [x] Salt okunur feed (isParent kontrolü)
- [x] Özel tasarım (çocuk dostu tab bar ve renkler)
- [x] Kapsül mantığı (açılma zamanlayıcısı + animasyon)
- [ ] Bildirim: "Yeni bir kapsül açıldı!"

---

## Faz 4: Veri ve Paylaşım

### 4.1 Dışa Aktarma
- [x] HTML formatında anıları indir (fotoğraflı, sesli)
- [ ] Fotoğraflarla birlikte ZIP
- [ ] PDF kitapçık formatı (uzun vadeli)

### 4.2 Davet Sistemi
- [x] Aile kodu ile katılma (mevcut)
- [ ] Davet linki / QR kod ile aile daveti
- [ ] Rol yönetimi (ebeveyn/misafir)

---

## Faz 5: Cilalama ve Yayın Hazırlığı

### 5.1 Yasemin Doğum Tarihi
- [x] Gebelik haftası hesaplama (LMP bazlı)
- [x] Entry'lerde "Anne karnında X. hafta" etiketi
- [ ] Doğunca `YASEMIN_BIRTH_DATE`'i gerçek tarihle güncelle

### 5.2 Bildirimler
- [ ] Push bildirimleri (yeni entry eklendiğinde)
- [ ] Kapsül açıldı bildirimi

### 5.3 Offline Destek
- [ ] Service worker / cache stratejisi
- [ ] Offline modda yazılan entry'leri kuyrukla

### 5.4 Görsel Kimlik
- [ ] App ikonu tasarımı (özel görsel)
- [ ] Splash screen tasarımı

### 5.5 Teknik
- [ ] EAS Build yapılandırması (production build — opsiyonel)
- [x] Vercel deploy yapılandırması (vercel.json + web export)
- [x] Firestore güvenlik kuralları (firestore.rules)
- [x] Error boundary

---

## Tamamlanan Özellikler Özeti

| Özellik | Durum |
|---|---|
| Auth (kayıt/giriş/çıkış) | ✅ |
| Aile sistemi (oluştur/katıl) | ✅ |
| Mektup/Anı/Milestone/Ses yazma | ✅ |
| Foto + ses yükleme | ✅ |
| Gizli mektuplar | ✅ |
| Zaman kapsülü | ✅ |
| Yasemin çocuk modu | ✅ |
| 5 tema sistemi | ✅ |
| PWA fullscreen | ✅ |
| Feed sıralama | ✅ |
| HTML export | ✅ |
| Türkçe karakter desteği | ✅ |
| Yasemin giriş kodu görüntüleme | ✅ |
