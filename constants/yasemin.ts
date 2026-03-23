// Yasemin'in yaş hesaplama mantığı
// LMP (son adet tarihi): 8 Kasım 2025
// Tahmini doğum: 15 Ağustos 2026 (19h3g @ 24 Mart 2026'dan hesaplandı)

export const YASEMIN_DUE_DATE = new Date('2026-08-15');
export const YASEMIN_BIRTH_DATE: Date | null = null; // doğunca gerçek tarihle güncelle

// LMP'den itibaren gebelik haftası hesaplar
const LMP_DATE = new Date('2025-11-08');

export function getGestationalAge(date: Date): { weeks: number; days: number } {
  const diffMs = date.getTime() - LMP_DATE.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
}

export function getYaseminAgeLabel(entryDate: Date): string {
  // Doğduysa → gerçek yaş göster
  if (YASEMIN_BIRTH_DATE) {
    const diffMs = entryDate.getTime() - YASEMIN_BIRTH_DATE.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      // Doğumdan önceki entry — gebelik haftasını göster
      const ga = getGestationalAge(entryDate);
      return `Anne karnında ${ga.weeks}. hafta`;
    }

    if (diffDays === 0) return 'Doğum günü!';
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

  // Henüz doğmadıysa → gebelik haftası göster
  const ga = getGestationalAge(entryDate);
  if (ga.weeks >= 40) return 'Doğum bekleniyor';
  if (ga.weeks < 1) return '';
  return `Anne karnında ${ga.weeks}. hafta`;
}

export function getYaseminCurrentAge(): number {
  if (!YASEMIN_BIRTH_DATE) return -1; // doğmadı → yaş yok
  return Math.floor(
    (Date.now() - YASEMIN_BIRTH_DATE.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
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
