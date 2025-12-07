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
  textPrimary: '#1F2937',     // Dark gray for headings
  textSecondary: '#4B5563',   // Muted gray for body copy
  textMuted: '#9CA3AF',       // Subtle helper text
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
      { name: 'SIET College', time: '7:00 AM', latitude: 11.04104, longitude: 77.07738 },
      { name: 'Chinniyapalayam', time: '7:08 AM', latitude: 11.055282, longitude: 77.065562 },
      { name: '100 Feet', time: '7:16 AM', latitude: 11.024294, longitude: 76.959071 },
      { name: 'Sivanantha Colony', time: '7:24 AM', latitude: 11.027139, longitude: 76.955725 },
      { name: 'Pudhu Palam', time: '7:32 AM', latitude: 11.028487, longitude: 76.951412 },
      { name: 'Saibaba Kovil', time: '7:40 AM', latitude: 11.036803, longitude: 76.950619 },
      { name: 'Housing Unit', time: '7:48 AM', latitude: 11.038853, longitude: 76.949797 },
      { name: 'Kavundampalayam', time: '7:56 AM', latitude: 11.044814, longitude: 76.947645 },
      { name: 'Cheran Nagar', time: '8:04 AM', latitude: 11.051129, longitude: 76.946465 },
      { name: 'GN Mills', time: '8:12 AM', latitude: 11.059732, longitude: 76.944896 },
      { name: 'Food Testing Lab SIET', time: '8:20 AM', latitude: 11.065699, longitude: 76.942956 }
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

const FALLBACK_SAMPLE_STOPS = [
  { latitude: 11.04104, longitude: 77.07738, name: 'SIET College' },
  { latitude: 11.055282, longitude: 77.065562, name: 'Chinniyapalayam' },
  { latitude: 11.024294, longitude: 76.959071, name: '100 Feet' },
  { latitude: 11.027139, longitude: 76.955725, name: 'Sivanantha Colony' },
  { latitude: 11.028487, longitude: 76.951412, name: 'Pudhu Palam' },
  { latitude: 11.036803, longitude: 76.950619, name: 'Saibaba Kovil' },
  { latitude: 11.038853, longitude: 76.949797, name: 'Housing Unit' },
  { latitude: 11.044814, longitude: 76.947645, name: 'Kavundampalayam' },
  { latitude: 11.051129, longitude: 76.946465, name: 'Cheran Nagar' },
  { latitude: 11.059732, longitude: 76.944896, name: 'GN Mills' },
  { latitude: 11.065699, longitude: 76.942956, name: 'Food Testing Lab SIET' },
];

export const SAMPLE_STOPS = (BUS_ROUTES['SIET-005']?.stops || FALLBACK_SAMPLE_STOPS).map((stop, index) => ({
  latitude: Number(stop.latitude),
  longitude: Number(stop.longitude),
  name: stop.name || `Stop ${index + 1}`,
}));

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
  BUS_ROUTES,
  SAMPLE_STOPS
};
