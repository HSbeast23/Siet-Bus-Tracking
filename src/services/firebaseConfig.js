import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'iet-bus-tracking.firebaseapp.com',
  databaseURL: 'https://iet-bus-tracking-default-rtdb.firebaseio.com',
  projectId: 'iet-bus-tracking',
  storageBucket: 'iet-bus-tracking.firebasestorage.app',
  messagingSenderId: '320610474479',
  appId: '1:320610474479:web:47cac40db8a99556077e1a',
  measurementId: 'G-1Y5EBZPK1F',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
