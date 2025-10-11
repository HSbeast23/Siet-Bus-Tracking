import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  BackHandler
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { updateBusLocation, stopBusTracking } from '../services/locationService';
import { authService } from '../services/authService';
import { useFocusEffect } from '@react-navigation/native';

// Normalize bus number to handle variations (SIET--005 → SIET-005)
const normalizeBusNumber = (busNumber) => {
  if (!busNumber) return '';
  return busNumber.toString().trim().toUpperCase().replace(/-+/g, '-');
};

const DriverDashboard = ({ navigation }) => {
  const [driverInfo, setDriverInfo] = useState({
    name: '',
    busNumber: '',
    email: '',
    phone: '',
    licenseNumber: ''
  });
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDriverData();
    return () => {
      // Cleanup location tracking when component unmounts
      if (locationSubscription) {
        console.log('🧹 [DRIVER] Component unmounting - cleaning up location tracking');
        locationSubscription.remove();
      }
    };
  }, []);

  // Handle back button press - ask confirmation if tracking is active
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isTracking) {
          Alert.alert(
            'Stop Tracking?',
            'You are currently tracking. Going back will stop location tracking. Do you want to continue?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {}
              },
              {
                text: 'Stop & Go Back',
                style: 'destructive',
                onPress: async () => {
                  await stopLocationTracking();
                  navigation.goBack();
                }
              }
            ]
          );
          return true; // Prevent default back action
        }
        return false; // Allow default back action
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => backHandler.remove();
    }, [isTracking])
  );

  const loadDriverData = async () => {
    try {
      // Get authenticated user data from authService
      const currentUser = await authService.getCurrentUser();
      console.log('Current authenticated driver:', currentUser);
      
      if (currentUser) {
        const normalizedBusNumber = normalizeBusNumber(currentUser.busNumber || '');
        console.log(`🔧 [DRIVER] Normalizing bus number: "${currentUser.busNumber}" → "${normalizedBusNumber}"`);
        
        setDriverInfo({
          name: currentUser.name || 'Driver',
          busNumber: normalizedBusNumber,
          email: currentUser.email || '',
          phone: currentUser.phone || 'N/A',
          licenseNumber: currentUser.licenseNumber || 'N/A'
        });
        
        console.log('Driver info loaded:', {
          name: currentUser.name,
          busNumber: normalizedBusNumber,
          email: currentUser.email
        });
      } else {
        console.log('No authenticated driver found');
        // Handle case where driver is not authenticated
        Alert.alert(
          'Authentication Required',
          'Please login to access the driver dashboard.',
          [
            {
              text: 'Login',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading driver data:', error);
      setLoading(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to track the bus location.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const startLocationTracking = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    try {
      const normalizedBusNumber = normalizeBusNumber(driverInfo.busNumber);
      console.log(`🚀 [DRIVER] Starting tracking for bus: ${normalizedBusNumber}`);
      
      // Try to get initial location with fallback accuracy levels
      let initialLocation;
      try {
        console.log('📍 [DRIVER] Attempting BestForNavigation accuracy...');
        initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
      } catch (bestError) {
        console.log('⚠️ [DRIVER] BestForNavigation failed, trying High accuracy...');
        try {
          initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
        } catch (highError) {
          console.log('⚠️ [DRIVER] High accuracy failed, using Balanced...');
          initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
      }
      
      console.log(`✅ [DRIVER] Got initial location:`, initialLocation.coords);
      
      const locationData = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        timestamp: new Date().toISOString(),
        busNumber: normalizedBusNumber,
        driverName: driverInfo.name,
        heading: initialLocation.coords.heading || 0,
        speed: initialLocation.coords.speed || 0,
        accuracy: initialLocation.coords.accuracy || 0,
        isTracking: true // Set tracking flag to TRUE
      };
      
      setCurrentLocation(locationData);
      setIsTracking(true);
      
      // Update Firestore with initial location
      await updateBusLocation(normalizedBusNumber, locationData);
      console.log(`✅ [DRIVER] Initial location saved for bus ${normalizedBusNumber}`);
      
      // Start continuous location tracking with best settings
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High, // Use High instead of BestForNavigation for better compatibility
          timeInterval: 2000, // Update every 2 seconds for smoother tracking
          distanceInterval: 5, // Update every 5 meters
        },
        async (location) => {
          const newLocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: new Date().toISOString(),
            busNumber: normalizedBusNumber,
            driverName: driverInfo.name,
            speed: location.coords.speed || 0,
            heading: location.coords.heading || 0,
            accuracy: location.coords.accuracy || 0,
            isTracking: true // Ensure tracking flag stays TRUE
          };
          
          setCurrentLocation(newLocationData);
          
          // Update Firestore in real-time
          try {
            await updateBusLocation(normalizedBusNumber, newLocationData);
            console.log(`📍 [DRIVER] Location updated for bus ${normalizedBusNumber}`);
          } catch (error) {
            console.error(`❌ [DRIVER] Failed to update location:`, error);
          }
        }
      );
      
      setLocationSubscription(subscription);
      Alert.alert('Success', `Location tracking started for bus ${normalizedBusNumber}!`);
      
    } catch (error) {
      console.error('❌ [DRIVER] Error starting location tracking:', error);
      console.error('❌ [DRIVER] Error details:', error.message);
      setIsTracking(false);
      
      // Provide helpful error message
      if (error.message.includes('unavailable')) {
        Alert.alert(
          'Location Unavailable',
          'GPS location is not available. If using an emulator:\n\n1. Open emulator extended controls (...)\n2. Go to Location tab\n3. Set a location manually\n\nIf on a real device, ensure Location Services are enabled in Settings.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to start location tracking. Please try again.');
      }
    }
  };

  const stopLocationTracking = async () => {
    console.log('🛑 [DRIVER] Stopping location tracking...');
    
    // Stop location subscription first
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      console.log('✅ [DRIVER] Location subscription removed');
    }
    
    // Mark bus as NOT tracking in Firestore
    if (driverInfo.busNumber) {
      const normalizedBusNumber = normalizeBusNumber(driverInfo.busNumber);
      try {
        await stopBusTracking(normalizedBusNumber);
        console.log(`🛑 [DRIVER] Tracking stopped in Firestore for bus ${normalizedBusNumber}`);
      } catch (error) {
        console.error(`❌ [DRIVER] Error stopping tracking in Firestore:`, error);
      }
    }
    
    setIsTracking(false);
    setCurrentLocation(null);
    console.log('✅ [DRIVER] Tracking state cleared');
    Alert.alert('Success', 'Location tracking stopped.');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      isTracking 
        ? 'You are currently tracking. Logging out will stop location tracking. Are you sure?'
        : 'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            // Stop tracking if active
            if (isTracking) {
              console.log('🚨 [DRIVER] Stopping tracking due to logout...');
              await stopLocationTracking();
            }
            
            // Logout from auth service
            const success = await authService.logout();
            if (success) {
              console.log('✅ [DRIVER] Driver logged out successfully');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            } else {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.driverText}>{driverInfo.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Driver Info Card */}
        <View style={styles.driverInfoCard}>
          <View style={styles.driverInfoContent}>
            <Ionicons name="person-circle" size={50} color={COLORS.accent} />
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{driverInfo.name}</Text>
              <Text style={styles.busNumber}>Bus: {driverInfo.busNumber}</Text>
              <Text style={styles.driverEmail}>{driverInfo.email}</Text>
            </View>
          </View>
        </View>

        {/* Location Tracking Card */}
        <View style={styles.trackingCard}>
          <View style={styles.trackingHeader}>
            <Ionicons 
              name="location" 
              size={30} 
              color={isTracking ? COLORS.success : COLORS.gray} 
            />
            <View style={styles.trackingDetails}>
              <Text style={styles.trackingTitle}>Location Tracking</Text>
              <Text style={[
                styles.trackingStatus,
                { color: isTracking ? COLORS.success : COLORS.danger }
              ]}>
                {isTracking ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>

          {currentLocation && (
            <View style={styles.locationDetails}>
              <Text style={styles.locationText}>
                Lat: {currentLocation.latitude.toFixed(6)}
              </Text>
              <Text style={styles.locationText}>
                Lng: {currentLocation.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationText}>
                Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.trackingButton,
              { backgroundColor: isTracking ? COLORS.danger : COLORS.success }
            ]}
            onPress={isTracking ? stopLocationTracking : startLocationTracking}
          >
            <Ionicons 
              name={isTracking ? "stop" : "play"} 
              size={20} 
              color={COLORS.white} 
            />
            <Text style={styles.trackingButtonText}>
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => Alert.alert('Route Info', 'Route information feature coming soon!')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="map" size={20} color={COLORS.white} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Route</Text>
              <Text style={styles.actionSubtitle}>See your assigned route</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => Alert.alert('Students', 'Student list feature coming soon!')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary }]}>
              <Ionicons name="people" size={20} color={COLORS.white} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Students</Text>
              <Text style={styles.actionSubtitle}>View students on your route</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => Alert.alert('Emergency', 'Emergency contacts feature coming soon!')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.danger }]}>
              <Ionicons name="call" size={20} color={COLORS.white} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Emergency Contact</Text>
              <Text style={styles.actionSubtitle}>Call management in emergency</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  driverText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  logoutButton: {
    padding: 10,
  },
  driverInfoCard: {
    backgroundColor: COLORS.white,
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  driverInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
    marginLeft: 15,
  },
  driverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  busNumber: {
    fontSize: 16,
    color: COLORS.accent,
    marginTop: 2,
    fontWeight: 'bold',
  },
  driverEmail: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  trackingCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  trackingDetails: {
    flex: 1,
    marginLeft: 15,
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  trackingStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  locationDetails: {
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 2,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  trackingButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
});

export default DriverDashboard;
