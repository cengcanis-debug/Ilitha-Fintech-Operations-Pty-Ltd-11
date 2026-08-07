import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Detect if we are using real credentials or the temporary local placeholder
export let isMockFirebase = (firebaseConfig.apiKey && typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.startsWith("MOCK")) || 
                            firebaseConfig.projectId === "zizamele-trust-demo" || firebaseConfig.projectId?.includes("funaispan");

export function enableLocalFallback() {
  isMockFirebase = true;
  console.log("[Funa Ispan Mzantsi] Falling back to high-fidelity, sovereign localized database storage via server.ts.");
}

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || "(default)");
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function testConnection() {
  if (isMockFirebase) {
    console.log("[Funa Ispan Mzantsi] Operating in Local Sandbox persistence mode.");
    return true;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("[Funa Ispan Mzantsi] Successfully compiled connection validation to enterprise firestore.");
    return true;
  } catch (error) {
    console.warn("[Funa Ispan Mzantsi] Cloud Firestore connectivity check failed. Activating automatic local/offline fallback...", error);
    enableLocalFallback();
    return false;
  }
}

// Implement standard handleFirestoreError for ABAC compliance audits as documented in the skill
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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
          })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Rule Violation Checklist Caught: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
