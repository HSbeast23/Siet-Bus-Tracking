import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { busStorage } from '../services/storage';
import { authService } from '../services/authService';

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
        locationSubscription.remove();
      }
    };
  }, []);

  const loadDriverData = async () => {
    try {
      // Get authenticated user data from authService
      const currentUser = await authService.getCurrentUser();
      console.log('Current authenticated driver:', currentUser);
      
      if (currentUser) {
        setDriverInfo({
          name: currentUser.name || 'Driver',
          busNumber: currentUser.busNumber || 'N/A',
          email: currentUser.email || '',
          phone: currentUser.phone || 'N/A',
          licenseNumber: currentUser.licenseNumber || 'N/A'
        });
        
        console.log('Driver info loaded:', {
          name: currentUser.name,
          busNumber: currentUser.busNumber,
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
              onPress: () => navigation.navigate('DriverLogin')
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
      setIsTracking(true);
      
      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const locationData = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        timestamp: new Date().toISOString(),
        busNumber: driverInfo.busNumber,
        driverName: driverInfo.name
      };
      
      setCurrentLocation(locationData);
      
      // Store location for students to track
      await busStorage.setLastLocation(locationData);
      
      // Start continuous location tracking
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const newLocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: new Date().toISOString(),
            busNumber: driverInfo.busNumber,
            driverName: driverInfo.name,
            speed: location.coords.speed || 0,
            heading: location.coords.heading || 0
          };
          
          setCurrentLocation(newLocationData);
          busStorage.setLastLocation(newLocationData);
          
          // TODO: Send to backend API
          // busAPI.updateBusLocation(driverInfo.busNumber, newLocationData);
        }
      );
      
      setLocationSubscription(subscription);
      Alert.alert('Success', 'Location tracking started successfully!');
      
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setIsTracking(false);
      Alert.alert('Error', 'Failed to start location tracking.');
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsTracking(false);
    setCurrentLocation(null);
    Alert.alert('Success', 'Location tracking stopped.');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? This will stop location tracking.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            if (isTracking) {
              stopLocationTracking();
            }
            const success = await authService.logout();
            if (success) {
              console.log('Driver logged out successfully');
              navigation.navigate('Welcome');
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
