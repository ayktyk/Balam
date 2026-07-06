# PROJEPROMPT — NEXUS proje bilgi formu

Bu prompt'u her bir proje klasörünün içine girdiğin AI oturumunda
(Claude Code, ChatGPT, vs.) yapıştır. AI'nın verdiği cevabı NEXUS'a
girecek olan başasistana gönder; o da kartın `desc`, `goal`, `stack`,
`infra` ve `nextStep` alanlarını dolduracak.

---

## Prompt (kopyala-yapıştır)

```
Bu projeyi NEXUS dashboard'umda dosyalıyorum. Aşağıdaki dört bölümü
düz metin olarak, kısa ve net şekilde doldur. Her bölüm için belirtilen
sınırlara sıkı sıkı uy. Yapay zeka olduğunu belli eden ifadeler, "umarım",
"sanırım", emoji veya pazarlama dili kullanma. Repo'yu, README'yi,
package.json/pyproject.toml/go.mod/Cargo.toml/Dockerfile/docker-compose'u
ve son commitleri tarayarak gerçeklere dayan. Bilmediğin alana "—" yaz,
uydurmayı yasakla.

Çıktıyı tam olarak şu formatta ver, başka hiçbir metin ekleme:

═══ PROJE BİLGİ FORMU ═══

PROJE ADI: <repo'daki gerçek ad>

[1] PROJE HAKKINDA
(2-4 cümle. Bu proje ne yapar, kime yarar, hangi gerçek
problemi çözer? Pazarlama dili yok; "X için Y yapan bir
araç" gibi düz tanım.)

HEDEF / AMAÇ:
(1 cümle. Bu projenin başarı kriteri / bitmiş hâli ne?)

[2] TEKNOLOJİ & ARAÇLAR
(Sadece gerçekten kullanılan teknolojiler. Liste hâlinde,
her satırda bir öğe. Versiyonu manifest dosyalarından oku.
Örnek format:
- Next.js 15 (App Router)
- TypeScript 5.6
- Supabase (Postgres + Auth)
- Tailwind CSS 4
- Vercel deploy
)

[3] ALTYAPI & DURUM
(Liste hâlinde. Her satır şu formatta:
- <Etiket>: <Değer> [DURUM]
DURUM şunlardan biri: AKTİF / BEKLEMEDE / EKSİK / BİLİNMİYOR

Doldurman gereken alanlar:
- Repo: <github/local path> [AKTİF/EKSİK]
- Hosting/Deploy: <vercel/firebase/yok> [AKTİF/BEKLEMEDE/EKSİK]
- Veritabanı: <supabase/firebase/sqlite/yok> [AKTİF/EKSİK]
- Auth: <provider/yok> [AKTİF/EKSİK]
- CI/CD: <github actions/yok> [AKTİF/EKSİK]
- Domain: <varsa> [AKTİF/EKSİK]
- Ortam dosyası (.env): [VAR/EKSİK]
- Build durumu: <son commit'te geçiyor mu> [AKTİF/EKSİK]
- Test: <var/yok> [AKTİF/EKSİK]
- Son commit: <YYYY-MM-DD>

Projede başka önemli altyapı varsa (analitik, ödeme, e-posta,
arama motoru, vektör DB, queue) onu da ekle. Yoksa bu satırları
aynen "yok" olarak bırak.)

[4] SONRAKI ADIM
(1 cümle. Bu projeyi yarın açtığında ilk yapacağın somut iş.
"X dosyasında Y fonksiyonunu Z şekilde değiştir" düzeyinde net.)

═══ SON ═══
```

---

## Kullanım

1. Proje klasöründe AI oturumu aç.
2. Yukarıdaki prompt bloğunu yapıştır.
3. AI'nın ürettiği `═══ PROJE BİLGİ FORMU ═══ … ═══ SON ═══` bloğunu
   olduğu gibi NEXUS başasistanına gönder.
4. Asistan `PROJE ADI`'na bakarak doğru kartı bulur ve şu alanları
   günceller:
   - `desc` ← `[1] PROJE HAKKINDA`
   - `goal` ← `HEDEF / AMAÇ`
   - `stack` ← `[2] TEKNOLOJİ & ARAÇLAR` listesi
   - `infra` ← `[3] ALTYAPI & DURUM` listesi
   - `nextStep` ← `[4] SONRAKI ADIM`

Birden fazla proje formunu tek seferde gönderebilirsin; sırayla işlenir.

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
