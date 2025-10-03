import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, SAMPLE_STOPS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { busStorage } from '../services/storage';
import { authService } from '../services/authService';

const MapScreen = ({ route, navigation }) => {
  const [busLocation, setBusLocation] = useState(null);
  const [studentLocation, setStudentLocation] = useState(null);
  const [studentInfo, setStudentInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [mapRef, setMapRef] = useState(null);
  const [allBusLocations, setAllBusLocations] = useState([]);
  const [isManagementView, setIsManagementView] = useState(false);

  const selectedBus = route?.params?.selectedBus;

  // Dummy bus locations in Coimbatore area for management view
  const dummyBusLocations = [
    { busNumber: 'SIET-001', latitude: 11.0168, longitude: 76.9558, speed: 45, lastUpdate: '2 min ago', status: 'Active' },
    { busNumber: 'SIET-002', latitude: 11.0066, longitude: 76.9633, speed: 38, lastUpdate: '1 min ago', status: 'Active' },
    { busNumber: 'SIET-003', latitude: 11.0305, longitude: 76.9647, speed: 42, lastUpdate: '3 min ago', status: 'Active' },
    { busNumber: 'SIET-004', latitude: 10.9965, longitude: 76.9677, speed: 35, lastUpdate: '1 min ago', status: 'Inactive' },
    { busNumber: 'SIET-005', latitude: 11.0103, longitude: 76.9440, speed: 40, lastUpdate: '2 min ago', status: 'Active' },
    { busNumber: 'SIET-006', latitude: 11.0041, longitude: 76.9618, speed: 33, lastUpdate: '4 min ago', status: 'Inactive' },
    { busNumber: 'SIET-007', latitude: 11.0246, longitude: 76.9314, speed: 48, lastUpdate: '1 min ago', status: 'Active' },
    { busNumber: 'SIET-008', latitude: 10.9926, longitude: 76.9610, speed: 30, lastUpdate: '3 min ago', status: 'Inactive' },
    { busNumber: 'SIET-009', latitude: 11.0194, longitude: 76.9712, speed: 44, lastUpdate: '2 min ago', status: 'Active' },
    { busNumber: 'SIET-010', latitude: 11.0113, longitude: 76.9720, speed: 36, lastUpdate: '1 min ago', status: 'Active' },
    { busNumber: 'SIET-011', latitude: 11.0087, longitude: 76.9456, speed: 41, lastUpdate: '3 min ago', status: 'Active' },
    { busNumber: 'SIET-012', latitude: 10.9985, longitude: 76.9543, speed: 34, lastUpdate: '5 min ago', status: 'Inactive' },
    { busNumber: 'SIET-013', latitude: 11.0201, longitude: 76.9601, speed: 43, lastUpdate: '1 min ago', status: 'Active' },
    { busNumber: 'SIET-014', latitude: 11.0156, longitude: 76.9689, speed: 37, lastUpdate: '2 min ago', status: 'Inactive' },
    { busNumber: 'SIET-015', latitude: 11.0089, longitude: 76.9723, speed: 46, lastUpdate: '1 min ago', status: 'Active' },
  ];

  useEffect(() => {
    loadStudentData();
    getUserLocation();
    const interval = setInterval(fetchBusLocation, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadStudentData = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setStudentInfo(userData);
      } else {
        console.warn('No authenticated user found for map view');
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your position');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setStudentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const fetchBusLocation = async () => {
    try {
      const busLocationData = await busStorage.getLastLocation();

      const activeBusNumber = studentInfo?.busNumber;

      if (busLocationData && activeBusNumber && busLocationData.busNumber === activeBusNumber) {
        setBusLocation({
          latitude: busLocationData.latitude,
          longitude: busLocationData.longitude,
          timestamp: busLocationData.timestamp,
          driverName: busLocationData.driverName || 'Driver'
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bus location:', error);
      setLoading(false);
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
      locations.push(...SAMPLE_STOPS);

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
        <Text style={styles.headerTitle}>Live Bus Tracking</Text>
        <TouchableOpacity onPress={fetchBusLocation} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>

      <MapView
        ref={setMapRef}
        style={styles.map}
        initialRegion={{
          latitude: busLocation?.latitude || SAMPLE_STOPS[0].latitude,
          longitude: busLocation?.longitude || SAMPLE_STOPS[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Bus Location Marker */}
        {busLocation && (
          <Marker
            coordinate={busLocation}
            title={`Bus ${studentInfo.busNumber}`}
            description={`Driver: ${busLocation.driverName}`}
            pinColor={COLORS.primary}
          >
            <View style={styles.busMarker}>
              <Ionicons name="bus" size={30} color={COLORS.white} />
            </View>
          </Marker>
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

        {/* Bus Stop Markers */}
        {SAMPLE_STOPS.map((stop, index) => (
          <Marker
            key={index}
            coordinate={stop}
            title={stop.name}
            description={`Stop ${index + 1}`}
            pinColor={COLORS.secondary}
          >
            <View style={styles.stopMarker}>
              <Text style={styles.stopNumber}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        {/* Route Line */}
        <Polyline
          coordinates={SAMPLE_STOPS}
          strokeColor={COLORS.accent}
          strokeWidth={3}
          lineDashPattern={[5, 5]}
        />
      </MapView>

      {/* Bus Status Card */}
      {busLocation && (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="bus" size={24} color={COLORS.primary} />
            <Text style={styles.statusTitle}>Bus {studentInfo.busNumber}</Text>
            <View style={styles.liveIndicator}>
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.statusText}>
            Last updated: {new Date(busLocation.timestamp).toLocaleTimeString()}
          </Text>
          <Text style={styles.driverText}>Driver: {busLocation.driverName}</Text>
        </View>
      )}

      {!busLocation && (
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="bus" size={24} color={COLORS.gray} />
            <Text style={styles.statusTitle}>Bus {studentInfo.busNumber}</Text>
            <View style={[styles.liveIndicator, { backgroundColor: COLORS.gray }]}>
              <Text style={styles.liveText}>OFFLINE</Text>
            </View>
          </View>
          <Text style={styles.statusText}>Bus is currently offline</Text>
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
  statusCard: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginLeft: 10,
  },
  liveIndicator: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  driverText: {
    fontSize: 12,
    color: COLORS.black,
    marginTop: 2,
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
});

export default MapScreen;
