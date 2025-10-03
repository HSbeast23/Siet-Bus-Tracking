import axios from 'axios';
import { CONFIG } from '../utils/constants';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = ''; // TODO: Get from AsyncStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      // TODO: Clear auth token and redirect to login
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  // Management login
  managementLogin: (credentials) => 
    api.post('/auth/management/login', credentials),

  // Driver authentication
  driverLogin: (credentials) => 
    api.post('/auth/driver/login', credentials),
  
  driverSignup: (userData) => 
    api.post('/auth/driver/signup', userData),

  // Student authentication
  studentLogin: (credentials) => 
    api.post('/auth/student/login', credentials),
  
  studentSignup: (userData) => 
    api.post('/auth/student/signup', userData),

  // Logout
  logout: () => 
    api.post('/auth/logout'),
};

// Bus management API endpoints
export const busAPI = {
  // Get all buses
  getAllBuses: () => 
    api.get('/buses'),

  // Get bus by ID
  getBusById: (busId) => 
    api.get(`/buses/${busId}`),

  // Create new bus
  createBus: (busData) => 
    api.post('/buses', busData),

  // Update bus
  updateBus: (busId, busData) => 
    api.put(`/buses/${busId}`, busData),

  // Delete bus
  deleteBus: (busId) => 
    api.delete(`/buses/${busId}`),

  // Get bus location
  getBusLocation: (busId) => 
    api.get(`/buses/${busId}/location`),

  // Update bus location (driver)
  updateBusLocation: (busId, locationData) => 
    api.put(`/buses/${busId}/location`, locationData),
};

// Route management API endpoints
export const routeAPI = {
  // Get all routes
  getAllRoutes: () => 
    api.get('/routes'),

  // Get route by ID
  getRouteById: (routeId) => 
    api.get(`/routes/${routeId}`),

  // Create new route
  createRoute: (routeData) => 
    api.post('/routes', routeData),

  // Update route
  updateRoute: (routeId, routeData) => 
    api.put(`/routes/${routeId}`, routeData),

  // Delete route
  deleteRoute: (routeId) => 
    api.delete(`/routes/${routeId}`),

  // Get route stops
  getRouteStops: (routeId) => 
    api.get(`/routes/${routeId}/stops`),
};

// User management API endpoints
export const userAPI = {
  // Get user profile
  getProfile: () => 
    api.get('/user/profile'),

  // Update user profile
  updateProfile: (userData) => 
    api.put('/user/profile', userData),

  // Get all drivers (management only)
  getAllDrivers: () => 
    api.get('/users/drivers'),

  // Get all students (management only)
  getAllStudents: () => 
    api.get('/users/students'),
};

// Emergency and feedback API endpoints
export const emergencyAPI = {
  // Send SOS alert
  sendSOS: (sosData) => 
    api.post('/emergency/sos', sosData),

  // Submit feedback
  submitFeedback: (feedbackData) => 
    api.post('/feedback', feedbackData),

  // Send emergency notification (management)
  sendEmergencyNotification: (notificationData) => 
    api.post('/emergency/notification', notificationData),
};

// Location and mapping API endpoints
export const locationAPI = {
  // Get ETA using Bing Maps
  getETA: async (origin, destination) => {
    try {
      const response = await axios.get(
        `https://dev.virtualearth.net/REST/V1/Routes/Driving?wp.0=${origin.latitude},${origin.longitude}&wp.1=${destination.latitude},${destination.longitude}&key=${CONFIG.BING_MAPS_API_KEY}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting ETA:', error);
      throw error;
    }
  },

  // Get route directions
  getDirections: async (waypoints) => {
    try {
      const waypointsParam = waypoints
        .map((point, index) => `wp.${index}=${point.latitude},${point.longitude}`)
        .join('&');
      
      const response = await axios.get(
        `https://dev.virtualearth.net/REST/V1/Routes/Driving?${waypointsParam}&key=${CONFIG.BING_MAPS_API_KEY}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting directions:', error);
      throw error;
    }
  },
};

export default api;
