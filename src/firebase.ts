import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  browserLocalPersistence, 
  browserPopupRedirectResolver,
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  Timestamp, 
  getDocFromServer, 
  addDoc, 
  increment,
  arrayUnion,
  deleteField,
  writeBatch,
  enableMultiTabIndexedDbPersistence, 
  terminate 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

import firebaseAppletConfig from '../firebase-applet-config.json';

// Safe config merging
const config = {
  apiKey: process.env.FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || firebaseAppletConfig.appId,
  firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId
};

// Initialize Firebase SDK
const app = initializeApp(config);

// Use initializeAuth to avoid "Pending promise was never set" errors in iframe environments
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

// Initialize Firestore with long polling for better environment compatibility (e.g. iframes/sandboxes)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, config.firestoreDatabaseId || undefined);

// Enable persistence with a retry and safe check
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence is not supported by this browser');
    } else {
      console.error('Firestore persistence error:', err);
    }
  });
}

export const storage = getStorage(app);
export let messaging: any = null;
if (typeof window !== 'undefined') {
  isSupported().then(supported => {
    if (supported) messaging = getMessaging(app);
  });
}
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = true) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  // Don't log or throw for transient connection issues
  if (errInfo.error.toLowerCase().includes('unavailable') || 
      errInfo.error.toLowerCase().includes('offline') || 
      errInfo.error.toLowerCase().includes('could not reach')) {
    console.log(`Firestore is operating in offline mode (${operationType} on ${path})`);
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));

  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// Admin check helper
export const isAdminEmail = (email: string | null | undefined) => {
  return email === 'guptakundan1984k@gmail.com';
};

// Connection test with retry mechanism
async function testConnection(retries = 3) {
  try {
    // Attempt to fetch from server to verify actual backend connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified (Server).");
    
    // Test Storage connectivity
    try {
      const storageRef = ref(storage, 'test_connection.txt');
      await getDownloadURL(storageRef).catch(() => {}); // We don't care if file exists, just if service is reachable
      console.log("Firebase Storage service is reachable.");
    } catch (e) {
      console.warn("Firebase Storage might not be initialized or rules are restrictive.");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('unavailable') || errorMessage.includes('offline')) {
      if (retries > 0) {
        console.log(`Firestore unavailable, retrying connection... (${retries} attempts left)`);
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return testConnection(retries - 1);
      }
      console.log("Firestore is currently in offline mode. Local persistence is enabled.");
    } else {
      // Document likely doesn't exist, which is a successful "connection" to the DB service
      console.log("Firestore service is reachable.");
    }
  }
}

testConnection();

export { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  Timestamp,
  addDoc,
  arrayUnion,
  deleteField,
  writeBatch,
  increment,
  ref,
  uploadBytes,
  getDownloadURL,
  getToken,
  onMessage
};
