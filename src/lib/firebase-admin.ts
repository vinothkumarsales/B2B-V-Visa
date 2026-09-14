import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app: any;
let adminAuth: any;
let adminDb: any;

try {
  app = getApps().length > 0
    ? getApp()
    : initializeApp({
        projectId: 'v-visas-07',
      });
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
} catch (e) {
  console.warn('Firebase Admin SDK failed to initialize. Error:', e);
  // Provide stubs to avoid top-level import crashes and let request handlers catch calls gracefully
  adminAuth = {
    verifyIdToken: async (token: string) => {
      throw new Error('Firebase Admin SDK not initialized');
    }
  };
  adminDb = {
    collection: () => ({
      doc: () => ({
        set: async () => {
          throw new Error('Firebase Admin SDK not initialized');
        }
      })
    })
  };
}

export { adminAuth, adminDb };

