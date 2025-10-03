import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  BUS_NUMBER: 'bus_number',
  LAST_LOCATION: 'last_location',
  APP_SETTINGS: 'app_settings',
};

// Generic storage functions
export const storage = {
  // Set item
  setItem: async (key, value) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error('Error storing data:', error);
      return false;
    }
  },

  // Get item
  getItem: async (key) => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  },

  // Remove item
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing data:', error);
      return false;
    }
  },

  // Clear all storage
  clearAll: async () => {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },
};

// Bus and location storage functions
export const busStorage = {
  // Store bus number
  setBusNumber: async (busNumber) => {
    return await storage.setItem(STORAGE_KEYS.BUS_NUMBER, busNumber);
  },

  // Get bus number
  getBusNumber: async () => {
    return await storage.getItem(STORAGE_KEYS.BUS_NUMBER);
  },

  // Store last known location
  setLastLocation: async (location) => {
    return await storage.setItem(STORAGE_KEYS.LAST_LOCATION, location);
  },

  // Get last known location
  getLastLocation: async () => {
    return await storage.getItem(STORAGE_KEYS.LAST_LOCATION);
  },
};

// App settings storage functions
export const settingsStorage = {
  // Store app settings
  setSettings: async (settings) => {
    return await storage.setItem(STORAGE_KEYS.APP_SETTINGS, settings);
  },

  // Get app settings
  getSettings: async () => {
    const defaultSettings = {
      notifications: true,
      locationUpdates: true,
      theme: 'light',
      language: 'en',
    };
    
    const settings = await storage.getItem(STORAGE_KEYS.APP_SETTINGS);
    return settings ? { ...defaultSettings, ...settings } : defaultSettings;
  },

  // Update specific setting
  updateSetting: async (key, value) => {
    const currentSettings = await settingsStorage.getSettings();
    const updatedSettings = { ...currentSettings, [key]: value };
    return await storage.setItem(STORAGE_KEYS.APP_SETTINGS, updatedSettings);
  },
};

export default {
  storage,
  busStorage,
  settingsStorage,
  STORAGE_KEYS,
};
