export interface MilestonePreset {
  id: string;
  title: string;
  prompt: string;
}

export const MILESTONE_PRESETS: MilestonePreset[] = [
  {
    id: 'first-smile',
    title: 'Ilk gulus',
    prompt: 'O ani, ortami ve sizin ne hissettiginizi yaz.',
  },
  {
    id: 'first-word',
    title: 'Ilk kelime',
    prompt: 'Hangi kelimeydi ve ilk kim duydu?',
  },
  {
    id: 'first-step',
    title: 'Ilk adim',
    prompt: 'Ne zaman denedi, nasil basardi, neler yasandi?',
  },
  {
    id: 'first-tooth',
    title: 'Ilk dis',
    prompt: 'Ne fark ettiniz, nasil sevindiniz, o gun nasil gecti?',
  },
  {
    id: 'first-laugh',
    title: 'Ilk kahkaha',
    prompt: 'Onu ne guldurdu ve siz o anda ne yaptiniz?',
  },
  {
    id: 'first-birthday',
    title: 'Ilk dogum gunu',
    prompt: 'Kutlamayi, gelenleri ve o gunun havasini not et.',
  },
];

export function getMilestonePreset(tag: string | null | undefined) {
  if (!tag) {
    return null;
  }

  return MILESTONE_PRESETS.find((preset) => preset.id === tag) ?? null;
}
