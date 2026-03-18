// Yasemin'in yaş hesaplama mantığı

export const YASEMIN_DUE_DATE = new Date('2026-08-15');
export const YASEMIN_BIRTH_DATE: Date | null = null; // doğunca güncelle

export function getYaseminAgeLabel(entryDate: Date): string {
  const born = !!YASEMIN_BIRTH_DATE;
  const reference = YASEMIN_BIRTH_DATE ?? YASEMIN_DUE_DATE;
  const diffMs = entryDate.getTime() - reference.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (!born) {
    const daysLeft = -diffDays;
    if (daysLeft <= 0) return 'Tahmini doğum tarihi geçti';
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
