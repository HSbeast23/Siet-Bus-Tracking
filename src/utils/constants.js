// Theme Colors
export const COLORS = {
  primary: '#FFD700',        // Yellow
  secondary: '#2E7D32',      // Green
  accent: '#4CAF50',         // Light Green
  background: '#FFFDE7',     // Light Yellow
  white: '#FFFFFF',
  black: '#000000',
  gray: '#757575',
  lightGray: '#E0E0E0',
  danger: '#F44336',         // Red for emergency
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',           // Informational blue
  border: '#E5E7EB',         // Neutral border color
  muted: '#9CA3AF',          // Muted text
  overlay: 'rgba(0,0,0,0.15)'
};

// Typography
export const FONTS = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
  }
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border Radius
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  }
};

// App Configuration
export const CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api',
  BING_MAPS_API_KEY: 'YOUR_BING_MAPS_API_KEY',
  MANAGEMENT_CREDENTIALS: {
    username: process.env.EXPO_PUBLIC_MANAGEMENT_USERNAME,
    password: process.env.EXPO_PUBLIC_MANAGEMENT_PASSWORD
  },
  COADMIN_CREDENTIALS: {
    email: process.env.EXPO_PUBLIC_COADMIN_EMAIL,
    password: process.env.EXPO_PUBLIC_COADMIN_PASSWORD,
    name: process.env.EXPO_PUBLIC_COADMIN_NAME,
    busId: process.env.EXPO_PUBLIC_COADMIN_BUS_ID
  }
};

// 🚌 CENTRALIZED BUS ROUTES CONFIGURATION
// Add new bus routes here as they are authenticated
// Each bus must have: stops (with coordinates), distance, duration, driver
export const BUS_ROUTES = {
  'SIET-005': {
    name: 'SIET-005 Route',
    stops: [
      // 🎯 ACCURATE GPS COORDINATES FROM GOOGLE MAPS
      { name: 'Sri Shakthi Institute (Main Campus)', time: '7:00 AM', latitude: 11.0658, longitude: 77.0034 }, // L&T Bypass, Chinniyampalayam
      { name: 'Chinnapalayam', time: '7:15 AM', latitude: 11.0789, longitude: 76.9956 }, // Chinnapalayam, Coimbatore
      { name: 'SITRA', time: '7:28 AM', latitude: 11.0845, longitude: 76.9921 }, // SITRA College, Thondamuthur Road
      { name: 'Hopes', time: '7:40 AM', latitude: 11.0412, longitude: 76.9856 }, // Hopes College Area
      { name: 'Lakshmi Mills', time: '7:52 AM', latitude: 11.0086, longitude: 76.9631 }, // Lakshmi Mills, Coimbatore
      { name: 'Nandipuram', time: '8:05 AM', latitude: 11.0251, longitude: 76.9435 }, // Nandipuram, Coimbatore
      { name: 'Srivanadu Colony', time: '8:17 AM', latitude: 11.0389, longitude: 76.9278 }, // Srivanadu Colony
      { name: 'Tudiyalur', time: '8:28 AM', latitude: 11.0598, longitude: 76.9123 }, // Tudiyalur, Coimbatore
      { name: 'GN Mills', time: '8:40 AM', latitude: 11.0719, longitude: 76.9045 } // GN Mills, Coimbatore
    ],
    distance: '28.7 km',
    duration: '100 min',
    isAuthenticated: true,
    driver: 'Ragul'
  },
  'SIET-013': {
    name: 'SIET-013 Route',
    stops: [
      { name: 'Main Campus', time: '7:00 AM', latitude: 11.0168, longitude: 76.9558 },
      { name: 'Pollachi Road', time: '7:22 AM', latitude: 10.9456, longitude: 76.9234 },
      { name: 'Vellalore', time: '7:38 AM', latitude: 10.9343, longitude: 76.9123 },
      { name: 'Somayampalayam', time: '7:54 AM', latitude: 10.9234, longitude: 76.9012 },
      { name: 'Kurichi', time: '8:10 AM', latitude: 10.9123, longitude: 76.8901 },
      { name: 'Kovaipudur', time: '8:26 AM', latitude: 10.9012, longitude: 76.8790 }
    ],
    distance: '34.2 km',
    duration: '86 min',
    isAuthenticated: true,
    driver: 'Karthi'
  }
  // 🔥 ADD MORE BUSES HERE AS THEY ARE AUTHENTICATED
  // Example:
  // 'SIET-006': {
  //   name: 'SIET-006 Route',
  //   stops: [
  //     { name: 'Stop Name', time: '7:00 AM', latitude: 11.xxxx, longitude: 76.xxxx },
  //     ...
  //   ],
  //   distance: 'XX km',
  //   duration: 'XX min',
  //   isAuthenticated: true,
  //   driver: 'Driver Name'
  // }
};

// ⚠️ IMPORTANT: The normalizeBusNumber function in locationService.js handles these automatically
// by converting SIET--005 → SIET-005, so the map will work correctly
// These aliases are no longer needed but kept for reference

export default {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  CONFIG,
  BUS_ROUTES
};
