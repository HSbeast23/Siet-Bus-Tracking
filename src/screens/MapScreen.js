import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated
} from 'react-native';
import MapView, { Marker, AnimatedRegion, PROVIDER_GOOGLE, Callout, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, BUS_ROUTES } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToBusLocation, normalizeBusNumber } from '../services/locationService';
import { authService } from '../services/authService';

const MapScreen = ({ route, navigation }) => {
  const [busLocation, setBusLocation] = useState(null);
  const [studentLocation, setStudentLocation] = useState(null);
  const [userInfo, setUserInfo] = useState({}); // Changed from studentInfo to userInfo
  const [loading, setLoading] = useState(true);
  const [mapRef, setMapRef] = useState(null);
  const [selectedBusId, setSelectedBusId] = useState(null); // For management to select bus
  const [routeStops, setRouteStops] = useState([]); // Add state for route stops
  
  const busCoordinate = useRef(
    new AnimatedRegion({
      latitude: 11.0148359,
      longitude: 77.0642338,
      latitudeDelta: 0.001,
      longitudeDelta: 0.001,
    })
  ).current;
  
  const markerRef = useRef(null);

  // Get bus from route params (for management) or from user info (for students)
  const busFromParams = route?.params?.bus;
  const busIdFromParams = route?.params?.busId;

  useEffect(() => {
    loadUserData();
    getUserLocation();
    
    // Cleanup function
    return () => {
      // Will be set by subscribeToBusLocation
    };
  }, []);

  // �️ Load route stops immediately if busIdFromParams is available
  useEffect(() => {
    if (busIdFromParams) {
      console.log(`🗺️ [MAP] Bus ID from params detected: ${busIdFromParams}, loading route stops immediately`);
      loadRouteStops();
    }
  }, [busIdFromParams]);

  // �🔥 Subscribe to real-time bus location updates from Firestore
  useEffect(() => {
    let unsubscribe = null;
    let timeoutId = null;
    
    // Determine which bus to track
    const busToTrack = busIdFromParams || userInfo.busNumber || userInfo.busId;
    
    if (busToTrack) {
      const userRole = userInfo.role || 'management';
      console.log(`🔥 [${userRole.toUpperCase()}] Setting up real-time GPS tracking for bus:`, busToTrack);
      console.log(`🔍 [${userRole.toUpperCase()}] User info:`, JSON.stringify(userInfo));
      
      // Set timeout for loading state (5 seconds)
      timeoutId = setTimeout(() => {
        console.log(`⏱️ [${userRole.toUpperCase()}] Loading timeout - setting loading to false`);
        setLoading(false);
      }, 5000);
      
      unsubscribe = subscribeToBusLocation(
        busToTrack,
        (locationData) => {
          // Clear timeout since we got data
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
          console.log(`📦 [${userRole.toUpperCase()}] Raw location data received:`, JSON.stringify(locationData));
          
          if (locationData && locationData.currentLocation) {
            console.log(`📍 [${userRole.toUpperCase()}] Real-time bus location update:`, JSON.stringify(locationData.currentLocation));
            console.log(`🔥 [${userRole.toUpperCase()}] Is tracking:`, locationData.isTracking);
            console.log(`🚀 [${userRole.toUpperCase()}] Speed:`, locationData.speed);
            console.log(`👤 [${userRole.toUpperCase()}] Driver:`, locationData.driverName);
            
            const newLocation = {
              latitude: locationData.currentLocation.latitude,
              longitude: locationData.currentLocation.longitude,
              timestamp: locationData.lastUpdate,
              driverName: locationData.driverName || 'Driver',
              isTracking: locationData.isTracking,
              speed: locationData.speed,
              heading: locationData.heading || 0
            };
            
            setBusLocation(newLocation);
            
            // Smooth animation for marker
            busCoordinate.timing({
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              duration: 1000,
              useNativeDriver: false,
            }).start();
            
            // Auto-follow camera with rotation when tracking
            if (locationData.isTracking && mapRef) {
              mapRef.animateCamera({
                center: {
                  latitude: newLocation.latitude,
                  longitude: newLocation.longitude,
                },
                heading: newLocation.heading,
                pitch: 45,
                zoom: 17,
              }, { duration: 1000 });
            }
            
            console.log(`✅ [${userRole.toUpperCase()}] Bus location state updated successfully`);
            setLoading(false);
          } else if (locationData && !locationData.isTracking) {
            console.log(`⚠️ [${userRole.toUpperCase()}] Bus stopped tracking - clearing map`);
            console.log(`🛑 [${userRole.toUpperCase()}] isTracking:`, locationData.isTracking);
            setBusLocation(null); // Clear location so marker disappears
            setLoading(false);
          } else {
            console.log(`⚠️ [${userRole.toUpperCase()}] Bus not currently tracking`);
            console.log(`⚠️ [${userRole.toUpperCase()}] Full data:`, JSON.stringify(locationData));
            setBusLocation(null);
            setLoading(false);
          }
        },
        (error) => {
          console.error(`❌ [${userRole.toUpperCase()}] Error in real-time location updates:`, error);
          console.error(`❌ [${userRole.toUpperCase()}] Error message:`, error.message);
          console.error(`❌ [${userRole.toUpperCase()}] Error stack:`, error.stack);
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setLoading(false);
        }
      );
      
      console.log(`📡 [${userRole.toUpperCase()}] Subscription setup complete for bus:`, busToTrack);
    }
    
    // Cleanup subscription on unmount or when bus changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        const userRole = userInfo.role || 'management';
        console.log(`🛑 [${userRole.toUpperCase()}] Unsubscribing from bus location updates`);
        unsubscribe();
      }
    };
  }, [userInfo.busNumber, userInfo.busId, busIdFromParams]);

  // 🗺️ Load route stops when user info changes (for students/co-admin)
  useEffect(() => {
    if (userInfo.busNumber || userInfo.busId) {
      console.log(`🗺️ [MAP] User info loaded, loading route stops for user's bus`);
      loadRouteStops();
    }
  }, [userInfo.busNumber, userInfo.busId]);

  const loadUserData = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUserInfo(userData);
        console.log(`✅ [${userData.role?.toUpperCase() || 'USER'}] User data loaded:`, userData.name || userData.email);
      } else {
        console.warn('No authenticated user found for map view');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // 🚌 Get route stops for the current bus
  const loadRouteStops = () => {
    const rawBusNumber = busIdFromParams || userInfo?.busNumber || userInfo?.busId;
    console.log(`🗺️ [MAP] Loading route stops for bus:`, rawBusNumber);
    
    if (!rawBusNumber) {
      console.log(`⚠️ [MAP] No bus number available yet`);
      setRouteStops([]);
      return;
    }
    
    // ✅ Normalize bus number to handle variations (SIET--005 → SIET-005)
    const busNumber = normalizeBusNumber(rawBusNumber);
    console.log(`🔧 [MAP] Normalized bus number: "${rawBusNumber}" → "${busNumber}"`);
    
    const routeData = BUS_ROUTES[busNumber];
    if (!routeData || !Array.isArray(routeData.stops)) {
      console.log(`⚠️ [MAP] No route data found for bus:`, busNumber);
      console.log(`📋 [MAP] Available routes:`, Object.keys(BUS_ROUTES));
      setRouteStops([]);
      return;
    }
    
    // Convert to format expected by map (with latitude/longitude)
    const stops = routeData.stops.map(stop => ({
      name: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      time: stop.time
    }));
    
    console.log(`✅ [MAP] Loaded ${stops.length} stops for bus ${busNumber}`);
    setRouteStops(stops);
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('⚠️ [STUDENT] Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setStudentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      console.log('✅ [STUDENT] Got user location:', location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.log('⚠️ [STUDENT] Could not get user location (device may not support GPS):', error.message);
      // Don't show error on emulator or devices without GPS
    }
  };

  const centerMapOnBus = () => {
    if (busLocation && mapRef) {
      mapRef.animateToRegion({
        latitude: busLocation.latitude,
        longitude: busLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const centerMapOnStudent = () => {
    if (studentLocation && mapRef) {
      mapRef.animateToRegion({
        latitude: studentLocation.latitude,
        longitude: studentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const showAllLocations = () => {
    if (mapRef) {
      const locations = [];
      if (busLocation) locations.push(busLocation);
      if (studentLocation) locations.push(studentLocation);
      
      // Add route stops for the bus (safety check for array)
      if (Array.isArray(routeStops) && routeStops.length > 0) {
        locations.push(...routeStops);
      }

      if (locations.length > 0) {
        mapRef.fitToCoordinates(locations, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔥 Live GPS Tracking</Text>
        <View style={styles.refreshButton}>
          <Ionicons name="radio" size={24} color={COLORS.success} />
        </View>
      </View>

      <MapView
        ref={setMapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: busLocation?.latitude || (Array.isArray(routeStops) && routeStops[0]?.latitude) || 11.0168,
          longitude: busLocation?.longitude || (Array.isArray(routeStops) && routeStops[0]?.longitude) || 76.9558,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        
        {/* Bus Location Marker - Animated & Only show when actively tracking */}
        {busLocation && busLocation.isTracking && (
          <Marker.Animated
            ref={markerRef}
            coordinate={busCoordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={busLocation.heading || 0}
          >
            <View style={styles.busMarkerContainer}>
              <View style={[styles.busMarker, { 
                transform: [{ rotate: `${busLocation.heading || 0}deg` }] 
              }]}>
                <Ionicons name="bus" size={30} color={COLORS.white} />
              </View>
            </View>
            <Callout tooltip>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>Bus {(busIdFromParams || userInfo.busNumber || userInfo.busId)?.replace(/-+/g, '-')}</Text>
                <Text style={styles.calloutText}>Driver: {busLocation.driverName}</Text>
                <Text style={styles.calloutText}>Speed: {(busLocation.speed * 3.6).toFixed(1)} km/h</Text>
              </View>
            </Callout>
          </Marker.Animated>
        )}

        {/* Student Location Marker */}
        {studentLocation && (
          <Marker
            coordinate={studentLocation}
            title="Your Location"
            description="You are here"
            pinColor={COLORS.accent}
          >
            <View style={styles.studentMarker}>
              <Ionicons name="person" size={25} color={COLORS.white} />
            </View>
          </Marker>
        )}

        {/* Bus Stop Markers - Show only route stops for this bus */}
        {routeStops && routeStops.length > 0 && routeStops.map((stop, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            title={stop.name}
            description={`Stop ${index + 1} - ${stop.time}`}
            pinColor={index === 0 ? COLORS.success : COLORS.secondary}
          >
            <View style={[styles.stopMarker, index === 0 && styles.firstStopMarker]}>
              <Text style={styles.stopNumber}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Route Polyline - Connect all stops */}
        {routeStops && routeStops.length > 0 && (
          <Polyline
            coordinates={routeStops.map(stop => ({
              latitude: stop.latitude,
              longitude: stop.longitude
            }))}
            strokeColor={COLORS.accent}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
      </MapView>

      {/* Minimal Status Card - Only show when tracking */}
      {busLocation && busLocation.isTracking && (
        <View style={styles.minimalStatusCard}>
          <View style={styles.liveIndicator}>
            <View style={styles.livePulse} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.minimalSpeed}>
            {(busLocation.speed * 3.6).toFixed(0)} km/h
          </Text>
        </View>
      )}

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={centerMapOnBus}>
          <Ionicons name="bus" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={centerMapOnStudent}>
          <Ionicons name="person" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={showAllLocations}>
          <Ionicons name="resize" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  refreshButton: {
    padding: 5,
  },
  map: {
    flex: 1,
  },
  busMarker: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  studentMarker: {
    backgroundColor: COLORS.accent,
    borderRadius: 17.5,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  stopMarker: {
    backgroundColor: COLORS.secondary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  stopNumber: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  minimalStatusCard: {
    position: 'absolute',
    top: 60,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  minimalSpeed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 10,
  },
  liveIndicator: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  livePulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginRight: 5,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  busMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  calloutText: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 3,
  },
  mapControls: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'column',
  },
  controlButton: {
    backgroundColor: COLORS.secondary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  firstStopMarker: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.white,
    borderWidth: 3,
  },
});

export default MapScreen;
