import { db } from './firebaseConfig';
import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection,
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';

/**
 * Real GPS Location Service for Bus Tracking
 * Uses Firestore for real-time location updates
 * No mock data - all GPS coordinates are real
 */

const BUSES_COLLECTION = 'buses';

// Normalize bus number to handle variations (SIET-005, SIET--005, siet-005, etc.)
const normalizeBusNumber = (busNumber) => {
  if (!busNumber) return '';
  // Convert to uppercase, trim, and replace multiple hyphens with single hyphen
  return busNumber.toString().trim().toUpperCase().replace(/-+/g, '-');
};

// Update bus location in Firestore (called by Driver)
export const updateBusLocation = async (busNumber, locationData) => {
  try {
    if (!busNumber) {
      throw new Error('Bus number is required');
    }

    const normalizedBusNumber = normalizeBusNumber(busNumber);
    console.log(`🔧 Normalizing bus number: "${busNumber}" → "${normalizedBusNumber}"`);
    
    const busRef = doc(db, BUSES_COLLECTION, normalizedBusNumber);
    
    const data = {
      busNumber: normalizedBusNumber,
      currentLocation: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      },
      speed: locationData.speed || 0,
      heading: locationData.heading || 0,
      accuracy: locationData.accuracy || 0,
      timestamp: serverTimestamp(),
      lastUpdate: new Date().toISOString(),
      isTracking: true,
      driverName: locationData.driverName || 'Unknown Driver'
    };

    await setDoc(busRef, data, { merge: true });
    
    console.log(`✅ Location updated for bus ${normalizedBusNumber}:`, {
      lat: locationData.latitude,
      lng: locationData.longitude
    });
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating bus location:', error);
    return { success: false, error: error.message };
  }
};

// Stop tracking - mark bus as inactive
export const stopBusTracking = async (busNumber) => {
  try {
    if (!busNumber) {
      throw new Error('Bus number is required');
    }

    const normalizedBusNumber = normalizeBusNumber(busNumber);
    console.log(`🔧 Normalizing bus number: "${busNumber}" → "${normalizedBusNumber}"`);
    
    const busRef = doc(db, BUSES_COLLECTION, normalizedBusNumber);
    
    await updateDoc(busRef, {
      isTracking: false,
      lastUpdate: new Date().toISOString(),
      timestamp: serverTimestamp()
    });
    
    console.log(`🛑 Tracking stopped for bus ${normalizedBusNumber}`);
    
    return { success: true };
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
          isTracking: data.isTracking,
          lastUpdate: data.lastUpdate,
          driverName: data.driverName
        }
      };
    } else {
      return {
        success: false,
        error: 'Bus not found or not currently tracking'
      };
    }
  } catch (error) {
    console.error('❌ Error getting bus location:', error);
    return { success: false, error: error.message };
  }
};

// Subscribe to real-time bus location updates (for Student map view)
export const subscribeToBusLocation = (busNumber, onLocationUpdate, onError) => {
  try {
    if (!busNumber) {
      throw new Error('Bus number is required');
    }

    const normalizedBusNumber = normalizeBusNumber(busNumber);
    console.log(`🔧 Normalizing bus number: "${busNumber}" → "${normalizedBusNumber}"`);
    console.log(`📡 Subscribing to live updates for bus ${normalizedBusNumber}`);

    const busRef = doc(db, BUSES_COLLECTION, normalizedBusNumber);
    
    const unsubscribe = onSnapshot(
      busRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          console.log(`📍 Real-time update for bus ${normalizedBusNumber}:`, {
            lat: data.currentLocation?.latitude,
            lng: data.currentLocation?.longitude,
            tracking: data.isTracking
          });
          
          onLocationUpdate({
            busNumber: data.busNumber,
            currentLocation: data.currentLocation,
            speed: data.speed,
            heading: data.heading,
            isTracking: data.isTracking,
            lastUpdate: data.lastUpdate,
            driverName: data.driverName
          });
        } else {
          console.log(`⚠️ Bus ${normalizedBusNumber} not found in Firestore`);
          onLocationUpdate(null);
        }
      },
      (error) => {
        console.error('❌ Error in location subscription:', error);
        if (onError) {
          onError(error);
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to bus location:', error);
    if (onError) {
      onError(error);
    }
    return null;
  }
};

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
  subscribeToBusLocation,
  subscribeToAllBuses
};
