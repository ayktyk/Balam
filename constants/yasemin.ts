// Yasemin'in yaş hesaplama mantığı
// LMP (son adet tarihi): 8 Kasım 2025
// Tahmini doğum: 15 Ağustos 2026
// Gerçek doğum: 27 Ağustos 2026

// NOT: Tarihler yerel saat dilimiyle kurulur (new Date(yıl, ay-1, gün)).
// new Date('2026-08-27') UTC gece yarısını verir ve TR saatinde bir gün
// kayma yaratır — anı tarihleri yerel gün başına göre saklandığı için
// karşılaştırmaların da yerel olması gerekir.
export const YASEMIN_DUE_DATE = new Date(2026, 7, 15);
export const YASEMIN_BIRTH_DATE: Date | null = new Date(2026, 7, 27);

// LMP'den itibaren gebelik haftası hesaplar
const LMP_DATE = new Date(2025, 10, 8);

export function getGestationalAge(date: Date): { weeks: number; days: number } {
  const diffMs = date.getTime() - LMP_DATE.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
}

// Ay ekler, ay sonu tasmasini kirpar (31 Ocak + 1 ay = 28/29 Subat).
function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getFullYear();
  const monthIndex = date.getMonth() + months;
  const lastDayOfTarget = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(date.getDate(), lastDayOfTarget));
}

// Iki tarih arasindaki TAM takvim ayi sayisi.
// 30.44 gunluk ortalama kullanilmaz — yoksa 1. yas gunu
// "11 aylık 31 günlük" gibi anlamsiz bir etikete donuyordu.
function diffCalendarMonths(from: Date, to: Date): number {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());

  if (addMonthsClamped(from, months) > to) {
    months -= 1;
  }

  return months;
}

function getPrenatalLabel(entryDate: Date): string {
  const ga = getGestationalAge(entryDate);
  if (ga.weeks < 1) return '';
  return `Anne karnında ${ga.weeks}. hafta`;
}

export function getYaseminAgeLabel(entryDate: Date): string {
  // Henüz doğmadıysa → gebelik haftası göster
  if (!YASEMIN_BIRTH_DATE) {
    const ga = getGestationalAge(entryDate);
    if (ga.weeks >= 40) return 'Doğum bekleniyor';
    return getPrenatalLabel(entryDate);
  }

  const diffDays = Math.floor(
    (entryDate.getTime() - YASEMIN_BIRTH_DATE.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Doğumdan önceki anı — gebelik haftasını göster
  if (diffDays < 0) return getPrenatalLabel(entryDate);
  if (diffDays === 0) return 'Doğum günü!';

  const months = diffCalendarMonths(YASEMIN_BIRTH_DATE, entryDate);

  // Ilk ay dolmadan gun say (30 gun gecse bile ay dolmamis olabilir)
  if (months < 1) return `${diffDays} günlük`;

  const remainDays = Math.floor(
    (entryDate.getTime() - addMonthsClamped(YASEMIN_BIRTH_DATE, months).getTime())
      / (1000 * 60 * 60 * 24)
  );

  // Yas gunu — tam yil dolmus
  if (remainDays === 0 && months % 12 === 0) {
    return `${months / 12} yaşında`;
  }

  if (months < 24) {
    return `${months} aylık${remainDays > 0 ? ` ${remainDays} günlük` : ''}`;
  }

  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  return `${years} yaşında${remainMonths > 0 ? ` ${remainMonths} aylık` : ''}`;
}

// Kayıtlı etiket ile hesaplanan etiketi birleştirir.
// Eski anılarda yaş etiketi yazıldığı anda dondurulmuştu; doğum tarihi
// sonradan girildiği için o etiketler yanlış kaldı ("Doğum bekleniyor").
// Burada etiketi anının tarihinden yeniden hesaplıyoruz — kayıtlı veriye
// DOKUNULMUYOR, sadece gösterim düzeltiliyor.
export function resolveYaseminAgeLabel(
  entryDate: Date | null | undefined,
  storedLabel?: string | null
): string {
  if (!entryDate || Number.isNaN(entryDate.getTime())) {
    return storedLabel ?? '';
  }
  return getYaseminAgeLabel(entryDate) || storedLabel || '';
}

export function getYaseminCurrentAge(): number {
  if (!YASEMIN_BIRTH_DATE) return -1; // doğmadı → yaş yok
  const diffMs = Date.now() - YASEMIN_BIRTH_DATE.getTime();
  if (diffMs < 0) return -1;
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

export function isCapsuleUnlocked(
  unlockDate?: Date | null,
  unlockAge?: number | null
): boolean {
  const today = new Date();

  // Tarih bazlı kapsül
  if (unlockDate && today >= unlockDate) return true;

  // Yaş bazlı kapsül — sadece doğduktan sonra açılabilir
  if (unlockAge != null && unlockAge >= 0) {
    const currentAge = getYaseminCurrentAge();
    if (currentAge >= 0 && currentAge >= unlockAge) return true;
  }

  return false;
}
