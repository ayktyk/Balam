import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let _db: Firestore;
let _storage: FirebaseStorage;
let _auth: Auth;
let _initialized = false;

function init() {
  if (_initialized) return;
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  _db = getFirestore(app);
  _storage = getStorage(app);
  _auth = getAuth(app);
  _storage.maxUploadRetryTime = 10000;
  _storage.maxOperationRetryTime = 10000;
  _initialized = true;
}

export function ensureFirebase() {
  init();
  return { db: _db, storage: _storage, auth: _auth };
}

// Runtime'da hemen initialize et, SSR'da (typeof window === 'undefined') atlat
if (typeof window !== 'undefined') {
  init();
}

// Bu export'lar runtime'da (tarayici) hep dolu olacak.
// SSR build sirasinda kullanilmazlar — sadece import olarak referans alinirlar.
export { _db as db, _storage as storage, _auth as auth };
