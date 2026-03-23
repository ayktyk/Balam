import { Timestamp } from 'firebase/firestore';

export type EntryType = 'letter' | 'memory' | 'milestone' | 'voice';

export interface Entry {
  id: string;
  familyId: string;
  authorId: string;
  authorName: string;
  type: EntryType;
  title: string | null;
  body: string | null;
  photoUrls: string[];
  photoCaptions: string[];
  voiceUrl: string | null;
  voiceDurationMillis?: number | null;
  milestoneTag: string | null;
  yaseminAgeWeeks: number | null;
  yaseminAgeLabel: string;
  entryDate: Timestamp;
  isPrivate: boolean;
  isCapsule: boolean;
  capsuleUnlockDate: Timestamp | null;
  capsuleUnlockAge: number | null;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Family {
  id: string;
  name: string;
  childAccessCodeHash: string;
  childAccessEnabled: boolean;
  childMinAge: number;
  createdAt: Timestamp;
}

export interface FamilyMember {
  id: string;
  displayName: string;
  role: 'parent' | 'child';
  avatarEmoji: string;
  email: string;
  createdAt: Timestamp;
}
