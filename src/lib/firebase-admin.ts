import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const app = getApps().length > 0
  ? getApp()
  : initializeApp({
      projectId: 'v-visas-07',
    });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
