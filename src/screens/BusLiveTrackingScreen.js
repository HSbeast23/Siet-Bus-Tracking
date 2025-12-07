import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, AnimatedRegion, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, SAMPLE_STOPS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToBusLocation } from '../services/locationService';

const BusLiveTrackingScreen = ({ route, navigation }) => {
  const { bus } = route.params; // Get bus details from navigation params
  const [busLocation, setBusLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  const rawBusLabel = bus?.displayName || bus?.name || bus?.busName || bus?.number || 'Bus';
  const busDisplayName = typeof rawBusLabel === 'string'
    ? rawBusLabel.replace(/-+/g, '-').trim() || 'Bus'
    : 'Bus';
  const busCoordinate = useRef(
    new AnimatedRegion({
      latitude: 11.0148359,
      longitude: 77.0642338,
      latitudeDelta: 0.001,
      longitudeDelta: 0.001,
    })
  ).current;
  
  const markerRef = useRef(null);

  // 🔥 Subscribe to real-time bus location updates from Firestore
  useEffect(() => {
    let unsubscribe = null;
    let timeoutId = null;
    
    console.log('🔥 [ADMIN] Setting up real-time GPS tracking for bus:', bus.number);
    console.log('🔍 [ADMIN] Bus details:', JSON.stringify(bus));
    
    // Set timeout for loading state (5 seconds - same as student)
    timeoutId = setTimeout(() => {
      console.log('⏱️ [ADMIN] Loading timeout - setting loading to false');
      setLoading(false);
    }, 5000);
    
    unsubscribe = subscribeToBusLocation(
      bus.number,
      (locationData) => {
        // Clear timeout since we got data
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        console.log('📦 [ADMIN] Raw location data received:', JSON.stringify(locationData));
        
        const isTrackingActive = Boolean(
          locationData?.isTracking &&
            (locationData?.activeTrackingSession ?? locationData?.trackingSessionId ?? locationData?.isTracking)
        );

        if (locationData && locationData.currentLocation && isTrackingActive) {
          console.log('📍 [ADMIN] Location update:', JSON.stringify(locationData.currentLocation));
          console.log('🔥 [ADMIN] Is tracking:', locationData.isTracking);
          console.log('🚀 [ADMIN] Speed:', locationData.speed);
          console.log('👤 [ADMIN] Driver:', locationData.driverName);
          
          const newLocation = {
            latitude: locationData.currentLocation.latitude,
            longitude: locationData.currentLocation.longitude,
            timestamp: locationData.lastUpdate,
            driverName: locationData.driverName || bus.driver || 'Driver',
            isTracking: isTrackingActive,
            speed: locationData.speed,
            accuracy: locationData.accuracy,
            heading: locationData.heading || 0,
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
          if (isTrackingActive && mapRef.current) {
            mapRef.current.animateCamera({
              center: {
                latitude: newLocation.latitude,
                longitude: newLocation.longitude,
              },
              heading: newLocation.heading,
              pitch: 0,
              zoom: 17,
            }, { duration: 1000 });
          }
          
          console.log('✅ [ADMIN] Bus location state updated successfully');
          setLoading(false);
        } else if (locationData && !isTrackingActive) {
          console.log('⚠️ [ADMIN] Bus stopped tracking - clearing map');
          console.log('🛑 [ADMIN] isTracking:', isTrackingActive);
          setBusLocation(null); // Clear location so marker disappears
          setLoading(false);
        } else {
          console.log('⚠️ [ADMIN] Bus not currently tracking or no location data');
          console.log('⚠️ [ADMIN] Full data:', JSON.stringify(locationData));
          setBusLocation(null);
          setLoading(false);
        }
      },
      (error) => {
        console.error('❌ [ADMIN] Tracking error:', error);
        console.error('❌ [ADMIN] Error message:', error.message);
        console.error('❌ [ADMIN] Error stack:', error.stack);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setLoading(false);
        // Don't show alert immediately, just log it
      }
    );
    
    console.log('📡 [ADMIN] Subscription setup complete for bus:', bus.number);
    
    // Cleanup subscription on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        console.log('🛑 [ADMIN] Unsubscribing from bus location updates');
        unsubscribe();
      }
    };
  }, [bus.number]);

  const centerMapOnBus = () => {
    if (busLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: busLocation.latitude,
        longitude: busLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } else {
      Alert.alert('No Location', 'Bus location is not available');
    }
  };

  const showFullRoute = () => {
    if (mapRef.current && busLocation) {
      const locations = [busLocation, ...SAMPLE_STOPS];
      mapRef.current.fitToCoordinates(locations, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading bus location...</Text>
          <Text style={styles.loadingSubtext}>Bus: {bus.number}</Text>
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
        <Text style={styles.headerTitle}>Live Tracking - {bus.number.replace(/-+/g, '-')}</Text>
        <TouchableOpacity onPress={centerMapOnBus} style={styles.centerButton}>
          <Ionicons name="locate" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: busLocation?.latitude || SAMPLE_STOPS[0].latitude,
          longitude: busLocation?.longitude || SAMPLE_STOPS[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        rotateEnabled={true}
        pitchEnabled={false}
        mapType="standard"
        zoomTapEnabled
        zoomControlEnabled
        moveOnMarkerPress={false}
        loadingEnabled
      >
        {/* Bus Location Marker - Animated & Only show when actively tracking */}
        {busLocation && busLocation.isTracking && (
          <Marker.Animated
            ref={markerRef}
            coordinate={busCoordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            rotation={busLocation.heading || 0}
            tracksViewChanges={false}
          >
            <View style={styles.busMarkerGroup}>
              <View style={styles.busMarkerCircle}>
                <Text style={styles.busMarkerEmoji}>🚌</Text>
              </View>
              <View style={styles.busMarkerLabel}>
                <Text style={styles.busMarkerLabelText}>{busDisplayName}</Text>
              </View>
            </View>
          </Marker.Animated>
        )}

        {/* Bus Stop Markers */}
        {SAMPLE_STOPS.map((stop, index) => (
          <Marker
            key={index}
            coordinate={stop}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.stopMarker}>
              <View style={styles.stopInnerDot} />
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

      {/* Map Control Buttons */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={centerMapOnBus}
          disabled={!busLocation}
        >
          <Ionicons 
            name="locate" 
            size={22} 
            color={busLocation ? COLORS.white : COLORS.gray} 
          />
          <Text style={[styles.controlButtonText, !busLocation && { color: COLORS.gray }]}>
            Center Bus
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={showFullRoute}
        >
          <Ionicons name="map-outline" size={22} color={COLORS.white} />
          <Text style={styles.controlButtonText}>View Route</Text>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  centerButton: {
    padding: 5,
  },
  placeholder: {
    width: 34,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  busMarkerGroup: {
    alignItems: 'center',
  },
  busMarkerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFC107',
    borderWidth: 3,
    borderColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  busMarkerEmoji: {
    fontSize: 28,
  },
  busMarkerLabel: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFC107',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  busMarkerLabelText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  stopMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  stopInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.secondary,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
    marginTop: 2,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  coordinatesText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 10,
  },
  offlineTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 12,
  },
  offlineSteps: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 6,
  },
  offlineStep: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 22,
    paddingLeft: 8,
  },
  debugInfo: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 11,
    color: COLORS.gray,
    fontFamily: 'monospace',
  },
  mapControls: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  controlButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default BusLiveTrackingScreen;
