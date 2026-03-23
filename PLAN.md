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
- [ ] Yasemin girisi TODO durumunda (bcrypt dogrulamasi eksik)
- [ ] Firestore guvenlik kurallari yazilmamis
- [x] Foto ekleme var
- [ ] Ses kaydi yok
- [x] Entry duzenleme / silme
- [x] Feed'de gercek zamanli dinleme

---

## Faz 1: Temeli Saglamlashtir (Su An)

Oncelik: Uygulamayi acilir, calisan, guzel gorunen hale getir.

### 1.1 Firebase Baglantisi
- [ ] Firebase projesi olustur (veya mevcut olani bagla)
- [ ] `.env` dosyasini Firebase bilgileriyle doldur
- [ ] Firebase Auth (Email/Password) etkinlestir
- [ ] Firestore Database olustur
- [ ] Test: Kayit ol + giris yap + profil olustur

### 1.2 Yasemin Dogum Tarihi
- [ ] `YASEMIN_BIRTH_DATE`'i gercek dogum tarihiyle guncelle
- [ ] Yas hesaplamasini dogrula

### 1.3 Font Kurulumu
- [ ] `expo-font` + `@expo-google-fonts` paketlerini kur
- [ ] Playfair Display, Lora, DM Sans yukle
- [ ] FONTS sabitlerini ekranlara uygula
- [ ] Basliklar: Playfair, Govde: Lora, UI: DM Sans

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
- [ ] `expo-av` ile ses kaydi
- [ ] Kaydedilen sesi Firebase Storage'a yukle
- [ ] Feed ve detayda ses oynatici

---

## Faz 3: Yasemin Erisimi

### 3.1 Cocuk Girisi
- [ ] Yasemin ekranini tamamla (bcrypt dogrulama)
- [ ] Yas kontrolu (ayarlardan min yas belirle)
- [ ] Salt okunur feed (yalnizca acik kapsulleri gorsun)
- [ ] Ozel tasarim (daha sicak, cocuk dostu)

### 3.2 Kapsul Mantigi
- [ ] Kapsul acilma zamanlayicisi
- [ ] Acilma animasyonu
- [ ] Bildirim: "Yeni bir kapsul acildi!"

---

## Faz 4: Veri ve Paylasim

### 4.1 Disa Aktarma
- [ ] Tum entries JSON olarak indir
- [ ] Fotolarla birlikte ZIP
- [ ] PDF kitapcik formati (uzun vadeli)

### 4.2 Davet Sistemi
- [ ] Aile uyesi davet etme (e-posta ile)
- [ ] Davet linki + onay akisi
- [ ] Rol yonetimi (ebeveyn/misafir)

---

## Teknik Borc & Iyilestirmeler

- [ ] Firestore guvenlik kurallari yaz
- [ ] Error boundary ekle
- [ ] Offline destek (AsyncStorage cache)
- [ ] Push bildirimleri
- [ ] App ikonu ve splash screen tasarimi
- [ ] EAS Build yapilandirmasi (production build)
