import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

// Lazy initialization — build sirasinda calistirilmaz
let _db: ReturnType<typeof getFirestore>;
let _storage: ReturnType<typeof getStorage>;
let _auth: Auth;

export function ensureFirebase() {
  if (!_db) {
    const app = getFirebaseApp();
    _db = getFirestore(app);
    _storage = getStorage(app);
    _auth = getAuth(app);
    _storage.maxUploadRetryTime = 10000;
    _storage.maxOperationRetryTime = 10000;
  }
  return { db: _db, storage: _storage, auth: _auth };
}

// Proxy exports — ilk erisimde initialize edilir
export const db = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_, prop) {
    return (ensureFirebase().db as any)[prop];
  },
});

export const storage = new Proxy({} as ReturnType<typeof getStorage>, {
  get(_, prop) {
    return (ensureFirebase().storage as any)[prop];
  },
});

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    return (ensureFirebase().auth as any)[prop];
  },
});
