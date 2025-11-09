import * as Notifications from 'expo-notifications';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebaseConfig';

const PROJECT_ID = '7ccd10d2-9d0a-439a-8816-260ef2b9d6b6';

export async function registerPushTokenAsync(user) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Push permission not granted');
    return null;
  }

  await Notifications.setNotificationChannelAsync('tracking-alerts', {
    name: 'Tracking Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
  const expoPushToken = tokenResponse.data;

  await setDoc(
    doc(db, 'users', user.uid),
    {
      expoPushToken,
      role: user.role,
      busNumber: user.busNumber ?? null,
    },
    { merge: true }
  );

  return expoPushToken;
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
  await fetch('https://exp.host/--/api/v2/push/send', {
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
