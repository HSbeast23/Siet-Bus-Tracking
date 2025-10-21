// Handles driver background location tracking and Firebase updates.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { normalizeBusNumber, updateBusLocation } from './locationService';

export const BACKGROUND_LOCATION_TASK = 'driver-background-location-task';
const META_STORAGE_KEY = '@sietbus/background-tracking-meta';

const ensureTaskDefined = () => {
  if (TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    return;
  }

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('❌ Background location task error:', error);
      return;
    }

    const { locations } = data || {};
    if (!locations?.length) {
      return;
    }

    try {
      const storedMeta = await AsyncStorage.getItem(META_STORAGE_KEY);
      if (!storedMeta) {
        console.warn('⚠️ Missing background tracking metadata. Stopping updates.');
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        return;
      }

      const meta = JSON.parse(storedMeta);
      const backgroundLocation = locations[0];
      const locationPayload = {
        latitude: backgroundLocation.coords.latitude,
        longitude: backgroundLocation.coords.longitude,
        timestamp: new Date(backgroundLocation.timestamp).toISOString(),
        busNumber: meta.busNumber,
        driverName: meta.driverName,
        speed: backgroundLocation.coords.speed ?? 0,
        heading: backgroundLocation.coords.heading ?? 0,
        accuracy: backgroundLocation.coords.accuracy ?? 0,
        isTracking: true,
      };

      await updateBusLocation(meta.busNumber, locationPayload);
    } catch (taskError) {
      console.error('❌ Failed to handle background location update:', taskError);
    }
  });
};

ensureTaskDefined();

export const ensureLocationPermissionsAsync = async () => {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    const requestForeground = await Location.requestForegroundPermissionsAsync();
    if (requestForeground.status !== 'granted') {
      throw new Error('foreground-permission-denied');
    }
  }

  const background = await Location.getBackgroundPermissionsAsync();
  if (background.status === 'granted') {
    return { foreground: 'granted', background: 'granted' };
  }

  const requestBackground = await Location.requestBackgroundPermissionsAsync();
  if (requestBackground.status !== 'granted') {
    throw new Error(
      requestBackground.canAskAgain ? 'background-permission-denied' : 'background-permission-blocked'
    );
  }

  return { foreground: 'granted', background: 'granted' };
};

export const startBackgroundTrackingAsync = async ({
  busNumber,
  driverName,
  notificationTitle,
  notificationBody,
  timeInterval = 5000,
  distanceInterval = 5,
}) => {
  const normalizedBusNumber = normalizeBusNumber(busNumber);
  if (!normalizedBusNumber) {
    throw new Error('invalid-bus-number');
  }

  await AsyncStorage.setItem(
    META_STORAGE_KEY,
    JSON.stringify({ busNumber: normalizedBusNumber, driverName })
  );

  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isRunning) {
    return true;
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.AutomotiveNavigation,
    timeInterval,
    distanceInterval,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: notificationTitle ?? 'SIET Bus Tracking',
      notificationBody:
        notificationBody ?? `Tracking bus ${normalizedBusNumber}. Tap to return to the app.`,
      notificationColor: '#1B5E20',
    },
    deferredUpdatesInterval: 1000,
    deferredUpdatesDistance: distanceInterval,
  });

  return true;
};

export const stopBackgroundTrackingAsync = async () => {
  const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isRunning) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  await AsyncStorage.removeItem(META_STORAGE_KEY);
};

export const isBackgroundTrackingActiveAsync = async () => {
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
};

export const getBackgroundTrackingMetaAsync = async () => {
  const storedMeta = await AsyncStorage.getItem(META_STORAGE_KEY);
  return storedMeta ? JSON.parse(storedMeta) : null;
};
