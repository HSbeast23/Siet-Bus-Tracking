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
};

// Typography
export const FONTS = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
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
};

// App Configuration
export const CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api', // Change this to your backend URL
  BING_MAPS_API_KEY: 'YOUR_BING_MAPS_API_KEY', // Add your Bing Maps API key
  MANAGEMENT_CREDENTIALS: {
    username: 'SIET Bus Login',
    password: 'Sietbus2727'
  }
};

// Sample Bus Stops
export const SAMPLE_STOPS = [
  { name: "GN Mills", latitude: 11.0168, longitude: 76.9558 },
  { name: "KNG Puthur", latitude: 11.0200, longitude: 76.9600 },
  { name: "TVS Nagar", latitude: 11.0250, longitude: 76.9650 },
  { name: "Kovil Medu", latitude: 11.0300, longitude: 76.9700 },
  { name: "Edayarpalayam", latitude: 11.0350, longitude: 76.9750 },
  { name: "Vekittapuram", latitude: 11.0400, longitude: 76.9800 },
  { name: "Church Road", latitude: 11.0450, longitude: 76.9850 },
  { name: "P&T Quarters", latitude: 11.0500, longitude: 76.9900 },
  { name: "Saibaba Kovil", latitude: 11.0550, longitude: 76.9950 },
  { name: "Pudhu Palam", latitude: 11.0600, longitude: 77.0000 },
  { name: "Sivananda Colony", latitude: 11.0650, longitude: 77.0050 },
  { name: "100 Feet", latitude: 11.0700, longitude: 77.0100 },
  { name: "Nava India", latitude: 11.0750, longitude: 77.0150 },
];

export default {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  CONFIG,
  SAMPLE_STOPS
};
