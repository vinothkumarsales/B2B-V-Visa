import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCUn7Hg4eotINTEl8aai_EfuPlqzonCBM8",
  authDomain: "v-visas-07.firebaseapp.com",
  projectId: "v-visas-07",
  storageBucket: "v-visas-07.firebasestorage.app",
  messagingSenderId: "831466312935",
  appId: "1:831466312935:web:f61dba4194930475273e42",
  measurementId: "G-7LMS1DQBL9"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
