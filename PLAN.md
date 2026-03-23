# Balam - Proje Planı

> Yasemin icin aile ani ve duygu gunlugu. Ebeveynlerin mektup, ani ve zaman kapsulu birakabilecegi mobil uygulama.

## Mevcut Durum (Faz 1 MVP Iskeleti)

Calisan:
- [x] Proje yapisi (Expo SDK 55 + TypeScript + Firebase)
- [x] Tasarim sistemi (COLORS, SPACING, RADIUS, SHADOWS, FONTS tanimli)
- [x] Auth akisi (login, kayit, setup, yasemin girisi)
- [x] Aile kurulumu (Setup ekrani — isim + emoji + Firestore aile olusturma)
- [x] Yazi yazma ekrani (letter/memory/milestone + zaman kapsulu)
- [x] Feed ekrani (entries listesi + pull-to-refresh)
- [x] Entry detay ekrani
- [x] Ayarlar ekrani (profil karti + cikis)
- [x] Yasemin yaslama mantigi (constants/yasemin.ts)
- [x] useAuth hook'u (Firebase auth + Firestore profil)
- [x] Firebase config (.env ile)
- [x] Tiplendirme (Entry, Family, FamilyMember)

Eksik / Calismayan:
- [ ] .env dosyasi yok (Firebase baglantisi calismaz)
- [ ] YASEMIN_BIRTH_DATE null — bebek dogmus ama tarih girilmemis
- [ ] Font'lar yuklenmemis (Playfair Display, Lora, DM Sans tanimli ama kurulmamis)
- [x] Milestones ekrani placeholder degil
- [x] Yasemin girisi tamamlandi (bcrypt dogrulamasi eklendi)
- [x] Firestore guvenlik kurallari yazildi (firestore.rules)
- [x] Foto ekleme var (Bug fix: timeout ve Platform.OS eklendi)
- [x] Ses kaydi var
- [x] Entry duzenleme / silme
- [x] Feed'de gercek zamanli dinleme

---

## Faz 1: Temeli Saglamlashtir (Su An)

Oncelik: Uygulamayi acilir, calisan, guzel gorunen hale getir.

### 1.1 Firebase Baglantisi
- [x] Firebase projesi olustur (veya mevcut olani bagla)
- [x] `.env` dosyasini Firebase bilgileriyle doldur
- [x] Firebase Auth (Email/Password) etkinlestir
- [x] Firestore Database olustur
- [ ] Test: Kayit ol + giris yap + profil olustur (Kullanıcı doğrulaması yapıldı)

### 1.2 Yasemin Dogum Tarihi
- [ ] `YASEMIN_BIRTH_DATE`'i gercek dogum tarihiyle guncelle (Kullanıcıdan tarih bekleniyor)
- [ ] Yas hesaplamasini dogrula

### 1.3 Font Kurulumu
- [x] `expo-font` + `@expo-google-fonts` paketlerini kur
- [x] Playfair Display, Lora, DM Sans yukle
- [x] FONTS sabitlerini ekranlara uygula
- [x] Basliklar: Playfair, Govde: Lora, UI: DM Sans

### 1.4 Gorsel Iyilestirmeler
- [x] Login ekranina logo/gorsel ekle
- [x] Bos feed durumuna gorsel ekle
- [x] Kartlara hafif animasyon (FadeIn)
- [x] Tab bar ikon boyut/hizalama ayari

### 1.5 Temel Islevsellik Tamamlama
- [x] Entry duzenleme (kendi entry'sini duzenleyebilsin)
- [x] Entry silme (onay ile)
- [x] Feed'de gercek zamanli dinleme (onSnapshot)

---

## Faz 2: Medya ve Milestone'lar

### 2.1 Foto Destegi
- [x] `expo-image-picker` kur
- [x] Yazma ekranina foto ekleme butonu
- [x] Firebase Storage'a yukle
- [x] Feed kartlarinda ve detayda fotolari goster
- [x] Foto galerisi gorunumu

### 2.2 Milestone Sistemi
- [x] Onceden tanimli milestone listesi (ilk gulus, ilk adim, ilk kelime...)
- [x] Milestone secme ve tarihleme
- [x] Milestone timeline gorunumu
- [x] Milestone kartlarina foto ekleme

### 2.3 Ses Kaydi
- [x] `expo-av` ile ses kaydi
- [x] Kaydedilen sesi Firebase Storage'a yukle
- [x] Feed ve detayda ses oynatici

---

## Faz 3: Yasemin Erisimi

### 3.1 Cocuk Girisi
- [x] Yasemin ekranini tamamla (bcrypt dogrulama)
- [x] Yas kontrolu (ayarlardan min yas belirle)
- [x] Salt okunur feed (isParent kontrolu ile saglandi)
- [x] Ozel tasarim (daha sicak, cocuk dostu - Tab bar ve Renkler)

### 3.2 Kapsul Mantigi
- [x] Kapsul acilma zamanlayicisi (isCapsuleUnlocked logic)
- [x] Parent/Child gorus farkliligi (Parent her seyi gorur, Child kilitliyse gormez)
- [x] Acilma animasyonu
- [ ] Bildirim: "Yeni bir kapsul acildi!"

---

## Faz 4: Veri ve Paylasim

### 4.1 Disa Aktarma
- [x] Tum entries JSON olarak indir (expo-file-system + expo-sharing)
- [ ] Fotolarla birlikte ZIP
- [ ] PDF kitapcik formati (uzun vadeli)

### 4.2 Davet Sistemi
- [ ] Aile uyesi davet etme (e-posta ile)
- [ ] Davet linki + onay akisi
- [ ] Rol yonetimi (ebeveyn/misafir)

---

## Teknik Borc & Iyilestirmeler

- [x] Firestore guvenlik kurallari yazildi (firestore.rules)
- [x] Error boundary ekle
- [ ] Offline destek (AsyncStorage cache)
- [ ] Push bildirimleri
- [ ] App ikonu ve splash screen tasarimi (ozel gorsel gerekli)
- [x] Vercel deploy yapilandirmasi (vercel.json + web export)
- [ ] EAS Build yapilandirmasi (production build — opsiyonel)
