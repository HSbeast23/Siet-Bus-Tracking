import { db } from './firebaseConfig';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';

/**
 * Bus location service backed exclusively by Firestore.
 * No Firebase Realtime Database communication is performed here.
 */

const BUSES_COLLECTION = 'buses';
const MIN_MOVEMENT_DISTANCE_METERS = 20;
const MIN_UPDATE_INTERVAL_MS = 4000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};

const throttleStateByBus = new Map();

const getThrottleState = (busNumber) => {
  let state = throttleStateByBus.get(busNumber);
  if (!state) {
    state = {
      lastLat: null,
      lastLng: null,
      lastSentAt: 0,
    };
    throttleStateByBus.set(busNumber, state);
  }
  return state;
};

const recordUpdate = (busNumber, latitude, longitude, timestamp) => {
  const state = getThrottleState(busNumber);
  state.lastLat = latitude;
  state.lastLng = longitude;
  state.lastSentAt = timestamp;
};

const shouldThrottleUpdate = (busNumber, latitude, longitude, timestamp) => {
  const state = getThrottleState(busNumber);

  if (state.lastLat === null || state.lastLng === null) {
    return false;
  }

  const distance = calculateDistanceMeters(state.lastLat, state.lastLng, latitude, longitude);
  const elapsed = timestamp - state.lastSentAt;

  return distance < MIN_MOVEMENT_DISTANCE_METERS && elapsed < MIN_UPDATE_INTERVAL_MS;
};

const clearThrottleState = (busNumber) => {
  throttleStateByBus.delete(busNumber);
};

export const normalizeBusNumber = (busNumber) => {
  if (!busNumber) return '';
  return busNumber
    .toString()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-+/g, '-')
    .trim();
};

// Update bus location (called by Driver or background task)
export const updateBusLocation = async (busNumber, locationData = {}) => {
  try {
    if (!busNumber) {
      throw new Error('Bus number is required');
    }

  const normalizedBusNumber = normalizeBusNumber(busNumber);
  const now = Date.now();
  const isTrackingActive = locationData.isTracking === true;

    let latitude = Number(locationData.latitude);
    let longitude = Number(locationData.longitude);
    if (isTrackingActive) {
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Valid latitude and longitude are required for location updates');
      }
    } else {
      if (!Number.isFinite(latitude)) {
        latitude = null;
      }
      if (!Number.isFinite(longitude)) {
        longitude = null;
      }
    }

    const speed = Number.isFinite(Number(locationData.speed)) ? Number(locationData.speed) : 0;
    const heading = Number.isFinite(Number(locationData.heading)) ? Number(locationData.heading) : 0;
    const accuracy = Number.isFinite(Number(locationData.accuracy))
      ? Number(locationData.accuracy)
      : null;

    console.log(`🔧 Normalizing bus number: "${busNumber}" → "${normalizedBusNumber}"`);

    if (isTrackingActive && shouldThrottleUpdate(normalizedBusNumber, latitude, longitude, now)) {
      return { success: true, skipped: true };
    }

    const busRef = doc(db, BUSES_COLLECTION, normalizedBusNumber);
    const firestorePayload = {
      busNumber: normalizedBusNumber,
      currentLocation: isTrackingActive
        ? {
            latitude,
            longitude,
          }
        : null,
      speed: isTrackingActive ? speed : 0,
      heading: isTrackingActive ? heading : 0,
      accuracy: isTrackingActive ? accuracy ?? 0 : 0,
      timestamp: serverTimestamp(),
      lastUpdate: new Date(now).toISOString(),
      isTracking: isTrackingActive,
      realtime: deleteField(),
    };

    if (typeof locationData.driverName === 'string' && locationData.driverName.trim()) {
      firestorePayload.driverName = locationData.driverName.trim();
    } else if (isTrackingActive) {
      firestorePayload.driverName = 'Unknown Driver';
    }

    try {
      await setDoc(busRef, firestorePayload, { merge: true });
    } catch (firestoreError) {
      console.warn('⚠️ Unable to update Firestore bus location:', firestoreError);
    }

    if (isTrackingActive) {
      recordUpdate(normalizedBusNumber, latitude, longitude, now);
    } else {
      clearThrottleState(normalizedBusNumber);
    }

    console.log(`✅ Location updated for bus ${normalizedBusNumber}:`, {
      lat: latitude,
      lng: longitude,
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error updating bus location:', error);
    return { success: false, error: error.message };
  }
};

// Stop tracking - mark bus as inactive
export const stopBusTracking = async (busNumber, options = {}) => {
  try {
    if (!busNumber) {
      throw new Error('Bus number is required');
    }

    const normalizedBusNumber = normalizeBusNumber(busNumber);
    console.log(`🔧 Normalizing bus number: "${busNumber}" → "${normalizedBusNumber}"`);

    clearThrottleState(normalizedBusNumber);

    const result = await updateBusLocation(normalizedBusNumber, {
      isTracking: false,
      driverName: options?.driverName,
      latitude: options?.latitude,
      longitude: options?.longitude,
      speed: 0,
      heading: 0,
      accuracy: 0,
    });
    
    console.log(`🛑 Tracking stopped for bus ${normalizedBusNumber}`);
    
    return result;
  } catch (error) {
    console.error('❌ Error stopping bus tracking:', error);
    return { success: false, error: error.message };
  }
};

// Get current bus location (one-time fetch)
export const getBusLocation = async (busNumber) => {
  try {
    if (!busNumber) {
      throw new Error('Bus number is required');
    }

    const normalizedBusNumber = normalizeBusNumber(busNumber);
    console.log(`🔧 Normalizing bus number: "${busNumber}" → "${normalizedBusNumber}"`);

    const busRef = doc(db, BUSES_COLLECTION, normalizedBusNumber);
    const busSnap = await getDoc(busRef);

    if (busSnap.exists()) {
      const data = busSnap.data();
      return {
        success: true,
        data: {
          busNumber: data.busNumber,
          currentLocation: data.currentLocation,
          speed: data.speed,
          heading: data.heading,
          accuracy: data.accuracy,
          isTracking: data.isTracking,
          lastUpdate: data.lastUpdate,
          driverName: data.driverName,
          source: 'firestore',
        },
      };
    }

    return {
      success: false,
      error: 'Bus not found or not currently tracking',
    };
  } catch (error) {
    console.error('❌ Error getting bus location:', error);
    return { success: false, error: error.message };
  }
};

const listenToBusLocationInternal = (busNumber, onLocationUpdate, onError) => {
  try {
    if (!busNumber) {
      throw new Error('Bus number is required');
    }
    if (typeof onLocationUpdate !== 'function') {
      throw new Error('onLocationUpdate callback is required');
    }

  const normalizedBusNumber = normalizeBusNumber(busNumber);
  console.log(`📡 Subscribing to Firestore updates for bus ${normalizedBusNumber}`);

    const busRef = doc(db, BUSES_COLLECTION, normalizedBusNumber);

    const unsubscribe = onSnapshot(
      busRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          onLocationUpdate({
            busNumber: data.busNumber || normalizedBusNumber,
            currentLocation: data.currentLocation,
            speed: data.speed,
            heading: data.heading,
            accuracy: data.accuracy,
            isTracking: data.isTracking,
            lastUpdate: data.lastUpdate,
            driverName: data.driverName,
            source: 'firestore',
          });
        } else {
          onLocationUpdate(null);
        }
      },
      (error) => {
        console.error('❌ Error in Firestore location subscription:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('⚠️ Failed to unsubscribe from Firestore listener:', error);
      }
    };
  } catch (error) {
    console.error('❌ Error subscribing to bus location:', error);
    if (onError) {
      onError(error);
    }
    return () => {};
  }
};

export const listenToBusLocation = listenToBusLocationInternal;
export const subscribeToBusLocation = listenToBusLocationInternal;

// Subscribe to all buses (for Management dashboard)
export const subscribeToAllBuses = (onBusesUpdate, onError) => {
  try {
    console.log('📡 Subscribing to all buses');

    const busesRef = collection(db, BUSES_COLLECTION);
    
    const unsubscribe = onSnapshot(
      busesRef,
      (querySnapshot) => {
        const buses = [];
        querySnapshot.forEach((doc) => {
          buses.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log(`📍 Received updates for ${buses.length} buses`);
        onBusesUpdate(buses);
      },
      (error) => {
        console.error('❌ Error in all buses subscription:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to all buses:', error);
    if (onError) {
      onError(error);
    }
    return null;
  }
};

export default {
  updateBusLocation,
  stopBusTracking,
  getBusLocation,
  listenToBusLocation,
  subscribeToBusLocation,
  subscribeToAllBuses
};
