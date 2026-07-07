import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  displayName: string;
  role: 'parent' | 'child';
  familyId: string;
  avatarEmoji: string;
  email: string;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Önceki kullanıcının profil dinleyicisini kapat
      unsubProfile?.();
      unsubProfile = undefined;

      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }

      // Önbellekten anında gelir, sunucudan güncellenir.
      // includeMetadataChanges ŞART: sunucunun "doküman gerçekten yok"
      // onayı yalnızca fromCache=false metadata değişikliğiyle gelir;
      // bu seçenek olmadan o olay bastırılır ve loading sonsuza kadar sürer.
      unsubProfile = onSnapshot(
        doc(db, 'users', user.uid),
        { includeMetadataChanges: true },
        (snap) => {
          if (!snap.exists() && snap.metadata.fromCache) {
            // Önbellekte profil yok (ör. ilk açılış) — yanlış "profil yok"
            // kararı vermemek için sunucu cevabını bekle, loading sürsün.
            return;
          }
          const profile = snap.exists()
            ? (snap.data() as UserProfile)
            : null;
          setState({ user, profile, loading: false });
        },
        (error) => {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('Profil dinleme hatası:', error);
          }
          setState({ user, profile: null, loading: false });
        }
      );
    });

    return () => {
      unsubProfile?.();
      unsubAuth();
    };
  }, []);

  return state;
}
