import messaging from '@react-native-firebase/messaging';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { arrayUnion, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { postJson } from './backendClient';

const AUTHORIZED_STATUSES = [
  messaging.AuthorizationStatus.AUTHORIZED,
  messaging.AuthorizationStatus.PROVISIONAL,
];

let tokenRefreshUnsubscribe = null;

const resolveUserIdentifier = (user) => user?.uid || user?.id || user?.userId || null;

async function ensureAndroidNotificationPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (!permission) {
    return true;
  }

  const hasPermission = await PermissionsAndroid.check(permission);
  if (hasPermission) {
    return true;
  }

  const status = await PermissionsAndroid.request(permission);
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensureMessagingPermission() {
  try {
    const status = await messaging().hasPermission();
    if (AUTHORIZED_STATUSES.includes(status)) {
      return true;
    }

    const androidGranted = await ensureAndroidNotificationPermission();
    if (!androidGranted) {
      return false;
    }

    const newStatus = await messaging().requestPermission();
    return AUTHORIZED_STATUSES.includes(newStatus);
  } catch (error) {
    console.warn('Unable to confirm messaging permission', error);
    return false;
  }
}

async function persistTokenForUser({ identifier, token, user }) {
  const baseDoc = doc(db, 'users', identifier);
  const userRecord = {
    role: user?.role || 'student',
    busNumber: user?.busNumber ?? user?.busId ?? null,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(baseDoc, userRecord, { merge: true });

  try {
    await updateDoc(baseDoc, {
      fcmTokens: arrayUnion(token),
      lastFcmToken: token,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Falling back to setDoc merge for token union', error);
    await setDoc(
      baseDoc,
      {
        fcmTokens: arrayUnion(token),
        lastFcmToken: token,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
}

function registerTokenRefreshListener(user) {
  if (tokenRefreshUnsubscribe || !user) {
    return;
  }

  const identifier = resolveUserIdentifier(user);
  if (!identifier) {
    return;
  }

  tokenRefreshUnsubscribe = messaging().onTokenRefresh(async (newToken) => {
    try {
      await persistTokenForUser({ identifier, token: newToken, user });
      console.info('Updated refreshed FCM token for user', identifier);
    } catch (error) {
      console.warn('Failed to update refreshed FCM token', error);
    }
  });
}

export async function registerPushTokenAsync(user) {
  try {
    if (!user) {
      console.warn('registerPushTokenAsync called without user context');
      return null;
    }

    const identifier = resolveUserIdentifier(user);
    if (!identifier) {
      console.warn('Unable to persist FCM token: missing user identifier', user);
      return null;
    }

    const permissionGranted = await ensureMessagingPermission();
    if (!permissionGranted) {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications in system settings to receive live bus alerts.'
      );
      return null;
    }

    await messaging().setAutoInitEnabled(true);
    const deviceToken = await messaging().getToken();

    if (!deviceToken) {
      console.warn('Firebase returned empty FCM token for user', identifier);
      return null;
    }

    await persistTokenForUser({ identifier, token: deviceToken, user });
    registerTokenRefreshListener(user);

    console.info('Registered FCM token for user', identifier);
    return deviceToken;
  } catch (error) {
    console.error('Failed to register FCM token:', error);
    return null;
  }
}

export async function notifyBusTrackingStarted({
  busNumber,
  driverName,
  excludeUid = null,
  excludeToken = null,
}) {
  if (!busNumber) {
    throw new Error('busNumber is required to trigger bus start notifications');
  }

  const payload = {
    busNumber,
    driverName,
    initiatedBy: excludeUid || null,
    excludeToken: excludeToken || null,
  };

  return postJson('/startBus', payload);
}

export async function sendUserNotification({ recipientUid, title, body, data }) {
  if (!recipientUid) {
    throw new Error('recipientUid is required for direct notifications');
  }

  return postJson('/notify', {
    recipientUid,
    title,
    body,
    data,
  });
}

export function subscribeToForegroundNotifications(handler) {
  return messaging().onMessage(async (remoteMessage) => {
    handler?.(remoteMessage);
  });
}

export function subscribeToNotificationOpens(handler) {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    handler?.(remoteMessage);
  });
}

export async function getInitialNotification() {
  try {
    return await messaging().getInitialNotification();
  } catch (error) {
    console.warn('Failed to obtain initial notification', error);
    return null;
  }
}

export function cleanupNotificationListeners() {
  if (typeof tokenRefreshUnsubscribe === 'function') {
    tokenRefreshUnsubscribe();
    tokenRefreshUnsubscribe = null;
  }
}
