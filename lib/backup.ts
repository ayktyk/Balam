import JSZip from 'jszip';
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Entry } from '../types/entry';
import { resolveYaseminAgeLabel } from '../constants/yasemin';

export interface BackupProgress {
  done: number;
  total: number;
}

export interface BackupResult {
  blob: Blob;
  fileName: string;
  failedFiles: string[];
}

// content-type -> dosya uzantısı; bilinmiyorsa URL'den, o da yoksa .bin (spec 2a)
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
  'audio/wav': 'wav',
};

function extFromBlob(blob: Blob, url: string): string {
  if (blob.type && EXT_MAP[blob.type]) return EXT_MAP[blob.type];
  const match = url.match(/\.([a-zA-Z0-9]{2,4})(\?|$)/);
  return match ? match[1].toLowerCase() : 'bin';
}

function tsToIso(value: unknown): string | null {
  const ts = value as { toDate?: () => Date } | null | undefined;
  return ts?.toDate?.()?.toISOString?.() ?? null;
}

// Timestamp'ları JSON'a uygun ISO metnine çevirir. TÜM kayıtlar dahildir
// (çöp kutusundakiler deletedAt alanıyla) — felaket kurtarma amaçlı tam kopya.
export function serializeEntries(entries: Entry[]) {
  return entries.map((e) => ({
    ...e,
    entryDate: tsToIso(e.entryDate),
    createdAt: tsToIso(e.createdAt),
    updatedAt: tsToIso(e.updatedAt),
    capsuleUnlockDate: e.capsuleUnlockDate ? tsToIso(e.capsuleUnlockDate) : null,
    deletedAt: e.deletedAt ? tsToIso(e.deletedAt) : null,
  }));
}

const TYPE_LABELS: Record<string, string> = {
  letter: 'Mektup',
  memory: 'Anı',
  milestone: 'Adım',
  voice: 'Ses Kaydı',
};

// Kullanıcı kaynaklı metni HTML'e gömerken kaçış uygular — "<canim>" gibi bir
// ifade etiket sanılıp kartın kalanını yutmasın (yedekte sessiz veri kaybı olmasın).
const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Çevrimdışı açılan albüm sayfası. Gizlilik (spec 2a): başka kullanıcının
// isPrivate mektupları içerikleriyle GÖSTERİLMEZ, kilitli satır olarak listelenir.
// Çöp kutusundakiler albüme hiç girmez. Medya yerel (medya/...) yolla bağlanır.
export function buildAlbumHtml(
  entries: Entry[],
  familyName: string,
  currentUid: string,
  mediaPathFor: (url: string) => string
): string {
  const visible = entries.filter((e) => !e.deletedAt);

  const entryCards = visible
    .map((e) => {
      const entryDate = e.entryDate?.toDate?.() ?? null;
      const date = entryDate
        ? entryDate.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            weekday: 'long',
          })
        : '';
      // Yas etiketi kayittaki dondurulmus metin degil, anının tarihinden
      // yeniden hesaplanir (dogum tarihi sonradan girildi).
      const ageLabel = resolveYaseminAgeLabel(entryDate, e.yaseminAgeLabel);

      const isForeignPrivate = e.isPrivate && e.authorId !== currentUid;
      if (isForeignPrivate) {
        return `
        <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);color:#6B5B45;">
          🔒 <strong>Gizli mektup</strong> — ${esc(e.authorName || '')} · ${date}<br/>
          <span style="font-size:13px;">İçerik albümde gösterilmez; yedeğin içinde (anilar.json) saklıdır.</span>
        </div>`;
      }

      const photos = (e.photoUrls || [])
        .map(
          (url: string) =>
            `<img src="${esc(mediaPathFor(url))}" style="max-width:100%;border-radius:12px;margin:8px 0;" />`
        )
        .join('');

      const audio = e.voiceUrl
        ? `<div style="margin:8px 0;"><audio controls src="${esc(mediaPathFor(e.voiceUrl))}" style="width:100%;"></audio></div>`
        : '';

      const badge = e.isCapsule
        ? '<span style="background:#8B7355;color:#fff;padding:3px 10px;border-radius:8px;font-size:12px;">Zaman Kapsülü</span> '
        : '';
      const privateBadge = e.isPrivate
        ? '<span style="background:#C9A96E;color:#fff;padding:3px 10px;border-radius:8px;font-size:12px;">Gizli Mektup</span> '
        : '';

      return `
        <div style="background:#fff;border-radius:16px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <strong>${esc(e.authorName || '')}</strong>
            <span style="color:#6B5B45;font-size:13px;margin-left:auto;">${TYPE_LABELS[e.type] || ''}</span>
          </div>
          <div style="color:#6B5B45;font-size:13px;margin-bottom:12px;">${date}${ageLabel ? ' · ' + esc(ageLabel) : ''}</div>
          ${badge}${privateBadge}
          ${e.title ? `<h3 style="margin:8px 0 4px;font-family:Georgia,serif;">${esc(e.title)}</h3>` : ''}
          ${photos}
          ${audio}
          <div style="white-space:pre-wrap;line-height:1.7;font-family:Georgia,serif;">${esc(e.body || '')}</div>
        </div>`;
    })
    .join('');

  const now = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Balam — ${esc(familyName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #F5F0E8; font-family: -apple-system, 'Segoe UI', sans-serif; color: #2C2416; padding: 20px; max-width: 680px; margin: 0 auto; }
    h1 { font-family: Georgia, serif; text-align: center; margin: 32px 0 4px; }
    .subtitle { text-align: center; color: #6B5B45; margin-bottom: 32px; font-size: 14px; }
    img { display: block; }
    audio { border-radius: 8px; }
  </style>
</head>
<body>
  <h1>Balam</h1>
  <div class="subtitle">${esc(familyName)} · ${visible.length} anı · ${now} tarihinde yedeklendi</div>
  ${entryCards}
  <div style="text-align:center;color:#6B5B45;font-size:12px;padding:32px 0;">
    Balam tam yedeği — bu dosya internetsiz çalışır, fotoğraflar "medya" klasöründedir
  </div>
</body>
</html>`;
}

export async function createBackupZip(opts: {
  familyId: string;
  familyName: string;
  currentUid: string;
  onProgress?: (p: BackupProgress) => void;
}): Promise<BackupResult> {
  const snapshot = await getDocs(
    query(
      collection(db, 'entries'),
      where('familyId', '==', opts.familyId),
      orderBy('entryDate', 'desc')
    )
  );
  const entries = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Entry[];

  // İndirilecek medya listesi. Başkasının gizli mektuplarının medyası da DAHİLDİR
  // (tam yedek); çöp kutusundakilerin medyası indirilmez (JSON'ları anilar.json'da
  // durur) — bilinçli tercih, sonradan "düzeltilmesin".
  const jobs: { url: string; entryId: string; kind: string; index: number }[] = [];
  for (const e of entries) {
    if (e.deletedAt) continue;
    (e.photoUrls || []).forEach((url, i) =>
      jobs.push({ url, entryId: e.id, kind: 'foto', index: i + 1 })
    );
    if (e.voiceUrl) {
      jobs.push({ url: e.voiceUrl, entryId: e.id, kind: 'ses', index: 1 });
    }
  }

  const zip = new JSZip();
  const failed: string[] = [];
  const localPath = new Map<string, string>();
  let done = 0;

  // Tek dosya hatası yedeği durdurmaz (spec: Hata Yönetimi)
  for (const job of jobs) {
    try {
      // 30 sn zaman aşımı: tek bir asılı istek tüm yedeği sonsuza dek dondurmasın.
      // AbortSignal.timeout modern tarayıcılarda mevcut; yoksa savunma amaçlı olarak
      // zaman aşımı uygulanmaz (çökmek yerine eski davranış).
      const fetchOpts =
        typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
          ? { signal: AbortSignal.timeout(30_000) }
          : undefined;
      const res = await fetch(job.url, fetchOpts);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const ext = extFromBlob(blob, job.url);
      const path = `medya/${job.entryId}/${job.kind}-${job.index}.${ext}`;
      zip.file(path, blob);
      localPath.set(job.url, path);
    } catch (error) {
      failed.push(
        `${job.url} (${error instanceof Error ? error.message : 'bilinmeyen hata'})`
      );
    }
    done += 1;
    opts.onProgress?.({ done, total: jobs.length });
  }

  zip.file('anilar.json', JSON.stringify(serializeEntries(entries), null, 2));
  zip.file(
    'album.html',
    buildAlbumHtml(
      entries,
      opts.familyName,
      opts.currentUid,
      (url) => localPath.get(url) ?? url
    )
  );
  if (failed.length > 0) {
    zip.file(
      'eksik-dosyalar.txt',
      [
        'Bu medya dosyaları indirilemedi. İnternet bağlantısını kontrol edip yedeği tekrar alın:',
        '',
        ...failed,
      ].join('\n')
    );
  }

  // Bilinen sınır: JSZip tüm blob'ları bellekte tutar (tepe anda ~2x toplam medya boyutu);
  // tarayıcıda gerçekçi risk bölgesi ~1.5–2 GB medyadan itibaren başlar. Gerekirse
  // yükseltme yolu: generateInternalStream + File System Access API.
  const blob = await zip.generateAsync({ type: 'blob' });
  // Yerel tarih (en-CA = YYYY-AA-GG biçimi verir); UTC kullanılsaydı Türkiye'de
  // 00:00–03:00 arasında dosya adına dünün tarihi yazılırdı.
  const date = new Date().toLocaleDateString('en-CA');
  return {
    blob,
    fileName: `balam-yedek-${date}.zip`,
    failedFiles: failed,
  };
}
