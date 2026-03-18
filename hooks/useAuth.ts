import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          const profile = profileDoc.exists()
            ? (profileDoc.data() as UserProfile)
            : null;
          setState({ user, profile, loading: false });
        } catch {
          setState({ user, profile: null, loading: false });
        }
      } else {
        setState({ user: null, profile: null, loading: false });
      }
    });

    return unsubscribe;
  }, []);

  return state;
}
