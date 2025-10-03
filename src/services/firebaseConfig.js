import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBvLkPIhYEpOqXOaN1Ou-2wvSBodu7YXn4',
  authDomain: 'iet-bus-tracking.firebaseapp.com',
  projectId: 'iet-bus-tracking',
  storageBucket: 'iet-bus-tracking.firebasestorage.app',
  messagingSenderId: '320610474479',
  appId: '1:320610474479:web:47cac40db8a99556077e1a',
  measurementId: 'G-1Y5EBZPK1F',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    auth = getAuth(app);
  }
}

let db;

try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  });
} catch (error) {
  db = getFirestore(app);
}

export { app, auth, db };
