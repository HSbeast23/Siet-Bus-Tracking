import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { normalizeBusNumber } from '../utils/busNumber';

const COLLECTION = 'tripSessions';

const getSessionRef = (sessionId) => doc(db, COLLECTION, sessionId);
const getEventCollection = (sessionId) => collection(db, COLLECTION, sessionId, 'events');

export async function startTripSession({
  sessionId,
  busNumber,
  driverUid,
  driverName,
  metadata = {},
}) {
  if (!sessionId) {
    throw new Error('sessionId is required to start a trip session');
  }

  const normalizedBus = normalizeBusNumber(busNumber);
  const sessionRef = getSessionRef(sessionId);
  const payload = {
    sessionId,
    busNumber: normalizedBus,
    driverUid: driverUid || null,
    driverName: driverName || 'Driver',
    status: 'active',
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    metadata,
  };

  await setDoc(sessionRef, payload, { merge: true });
  return sessionId;
}

export async function updateTripSessionLocation(sessionId, locationData = {}) {
  if (!sessionId) {
    return;
  }

  const sessionRef = getSessionRef(sessionId);
  const payload = {
    lastLocation: {
      latitude: locationData.latitude ?? null,
      longitude: locationData.longitude ?? null,
      speed: locationData.speed ?? 0,
      heading: locationData.heading ?? 0,
      accuracy: locationData.accuracy ?? 0,
      recordedAt: locationData.timestamp || new Date().toISOString(),
    },
    updatedAt: serverTimestamp(),
    busNumber: locationData.busNumber
      ? normalizeBusNumber(locationData.busNumber)
      : undefined,
    lastStatus: locationData.isTracking === false ? 'paused' : 'active',
  };

  await updateDoc(sessionRef, payload);
}

export async function completeTripSession(sessionId, extra = {}) {
  if (!sessionId) {
    return;
  }

  const sessionRef = getSessionRef(sessionId);
  await updateDoc(sessionRef, {
    status: 'completed',
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completionMeta: extra,
  });
}

export async function appendTripSessionEvent(sessionId, event = {}) {
  if (!sessionId) {
    return null;
  }

  const eventsRef = getEventCollection(sessionId);
  return addDoc(eventsRef, {
    type: event.type || 'GENERIC',
    title: event.title || '',
    body: event.body || '',
    payload: event.payload || {},
    createdAt: serverTimestamp(),
  });
}

export async function markTripEventSeen(sessionId, uid) {
  if (!sessionId || !uid) {
    return;
  }

  const sessionRef = getSessionRef(sessionId);
  await updateDoc(sessionRef, {
    seenBy: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToActiveTripSession(busNumber, handler) {
  if (!busNumber || typeof handler !== 'function') {
    return () => {};
  }

  const normalizedBus = normalizeBusNumber(busNumber);
  const sessionsRef = collection(db, COLLECTION);
  const activeQuery = query(
    sessionsRef,
    where('busNumber', '==', normalizedBus),
    where('status', '==', 'active'),
    orderBy('startedAt', 'desc')
  );

  return onSnapshot(activeQuery, (snapshot) => {
    const sessions = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    handler(sessions[0] || null);
  });
}

export async function getLatestActiveTripSession(busNumber) {
  if (!busNumber) {
    return null;
  }

  const normalizedBus = normalizeBusNumber(busNumber);
  const sessionsRef = collection(db, COLLECTION);
  const activeQuery = query(
    sessionsRef,
    where('busNumber', '==', normalizedBus),
    where('status', '==', 'active'),
    orderBy('startedAt', 'desc')
  );

  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(
      activeQuery,
      (snapshot) => {
        unsubscribe();
        const sessions = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        resolve(sessions[0] || null);
      },
      reject
    );
  });
}
