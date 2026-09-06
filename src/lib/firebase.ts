import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

export const app = initializeApp(firebaseConfig);
const customDbId = (config as Record<string, any>).firestoreDatabaseId;

// Initialize Firestore with auto-detect long polling to ensure mobile networks,
// warehouse Wi-Fi, and corporate firewalls never drop communication
export const db = customDbId
  ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, customDbId)
  : initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

// Connectivity health check as instructed in Firebase guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (err: any) {
    if (err && typeof err.message === 'string' && err.message.includes('the client is offline')) {
      console.warn('Firestore client appears to be offline, operating in local cached mode.');
    }
    return false;
  }
}
