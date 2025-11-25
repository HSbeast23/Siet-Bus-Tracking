import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebaseConfig';

const PROJECT_ID = '7ccd10d2-9d0a-439a-8816-260ef2b9d6b6';

export async function registerPushTokenAsync(user) {
  try {
    if (!user) {
      console.warn('registerPushTokenAsync called without user context');
      return null;
    }

    const identifier = user.uid || user.id || user.userId;
    if (!identifier) {
      console.warn('Unable to persist push token: missing user identifier', user);
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const permissionResult = await Notifications.requestPermissionsAsync();
      finalStatus = permissionResult.status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push permission denied for user', identifier, 'status:', finalStatus);
      if (Platform.OS === 'android') {
        Alert.alert(
          'Enable Notifications',
          'Please allow notifications in system settings so you can receive live bus alerts.'
        );
      }
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('tracking-alerts', {
        name: 'Tracking Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    const expoPushToken = tokenResponse.data;

    if (!expoPushToken) {
      console.warn('Expo returned empty push token for user', identifier);
      return null;
    }

    await setDoc(
      doc(db, 'users', identifier),
      {
        expoPushToken,
        role: user.role,
        busNumber: user.busNumber ?? user.busId ?? null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.info('Registered push token for user', identifier);
    return expoPushToken;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return null;
  }
}

async function getRecipientsForBus(busNumber) {
  const recipientsQuery = query(
    collection(db, 'users'),
    where('busNumber', '==', busNumber),
    // include both 'coadmin' and legacy 'incharge' labels used in the codebase
    where('role', 'in', ['student', 'coadmin', 'incharge'])
  );

  const snapshot = await getDocs(recipientsQuery);
  return snapshot.docs
    .map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        uid: docSnapshot.id,
        token: data?.expoPushToken || null,
      };
    })
    .filter((r) => r && r.token);
}

function chunkTokens(tokens, size = 90) {
  const chunks = [];
  for (let index = 0; index < tokens.length; index += size) {
    chunks.push(tokens.slice(index, index + size));
  }
  return chunks;
}

async function sendExpoPush(chunk, message) {
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      chunk.map((token) => ({
        to: token,
        title: message.title,
        body: message.body,
        data: message.data,
        channelId: 'tracking-alerts',
        sound: 'default',
      }))
    ),
  });

  try {
    const json = await response.json();
    console.info('Expo push response', JSON.stringify(json));
  } catch (parseError) {
    console.warn('Unable to parse Expo push response', parseError);
  }
}

export async function notifyBusTrackingStarted({ busNumber, driverName, excludeUid = null, excludeToken = null }) {
  const recipients = await getRecipientsForBus(busNumber);
  const filtered = recipients.filter((r) => {
    if (!r || !r.token) return false;
    if (excludeUid && r.uid === excludeUid) return false;
    if (excludeToken && r.token === excludeToken) return false;
    return true;
  });

  if (!filtered.length) {
    console.info(`No push recipients registered for bus ${busNumber} after filtering out initiator`);
    return;
  }

  const tokens = filtered.map((r) => r.token);

  console.info(`Dispatching push to ${tokens.length} recipients for bus ${busNumber}`);

  const message = {
    title: `Bus ${busNumber} is now live`,
    body: `${driverName ?? 'Driver'} started tracking. Check the live map for location updates.`,
    data: { busNumber },
  };

  const tokenChunks = chunkTokens(tokens);
  await Promise.all(tokenChunks.map((chunk) => sendExpoPush(chunk, message)));
}
