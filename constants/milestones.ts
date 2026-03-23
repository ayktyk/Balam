export interface MilestonePreset {
  id: string;
  title: string;
  prompt: string;
}

export const MILESTONE_PRESETS: MilestonePreset[] = [
  {
    id: 'first-smile',
    title: 'İlk gülüş',
    prompt: 'O anı, ortamı ve sizin ne hissettiğinizi yaz.',
  },
  {
    id: 'first-word',
    title: 'İlk kelime',
    prompt: 'Hangi kelimeydi ve ilk kim duydu?',
  },
  {
    id: 'first-step',
    title: 'İlk adım',
    prompt: 'Ne zaman denedi, nasıl başardı, neler yaşandı?',
  },
  {
    id: 'first-tooth',
    title: 'İlk diş',
    prompt: 'Ne fark ettiniz, nasıl sevindiniz, o gün nasıl geçti?',
  },
  {
    id: 'first-laugh',
    title: 'İlk kahkaha',
    prompt: 'Onu ne güldürdü ve siz o anda ne yaptınız?',
  },
  {
    id: 'first-birthday',
    title: 'İlk doğum günü',
    prompt: 'Kutlamayı, gelenleri ve o günün havasını not et.',
  },
];

export function getMilestonePreset(tag: string | null | undefined) {
  if (!tag) {
    return null;
  }

  return MILESTONE_PRESETS.find((preset) => preset.id === tag) ?? null;
}
