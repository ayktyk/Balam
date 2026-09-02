// GG.AA.YYYY metin girişi için ortak yardımcılar.
// Hem serbest yazım (otomatik nokta) hem takvim seçimi aynı formatı üretir.

export function toStartOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function formatDateInput(date: Date) {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  return `${day}.${month}.${year}`;
}

// Kullanıcı sadece rakam yazar, noktaları biz koyarız.
// "27082026" → "27.08.2026", "2708" → "27.08"
// Silme sırasında sona nokta EKLENMEZ, yoksa geri silmek imkânsız olur.
export function maskDateInput(rawValue: string) {
  const digits = rawValue.replace(/\D/g, '').slice(0, 8);

  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));

  return parts.join('.');
}

export function parseDateInput(value: string) {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year
    || parsedDate.getMonth() !== month - 1
    || parsedDate.getDate() !== day
  ) {
    return null;
  }

  return toStartOfDay(parsedDate);
}

export const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
] as const;

// Pazartesi başlangıçlı hafta (TR takvim düzeni)
export const TR_WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'] as const;

// Ayın ilk gününün, pazartesi başlangıçlı ızgaradaki sütun indeksi (0-6)
export function getMonthLeadingBlanks(year: number, month: number) {
  const jsWeekday = new Date(year, month, 1).getDay(); // 0 = Pazar
  return (jsWeekday + 6) % 7;
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}
