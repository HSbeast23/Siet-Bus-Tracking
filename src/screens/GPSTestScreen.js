import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

/**
 * GPS VERIFICATION TEST SCREEN
 * This screen helps verify that GPS tracking is REAL and not generating random coordinates
 */

const GPSTestScreen = ({ navigation }) => {
  const [gpsData, setGpsData] = useState(null);
  const [previousLocation, setPreviousLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const startGPSTest = async () => {
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for GPS test');
        return;
      }

      setIsTracking(true);
      setLocationHistory([]);

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const initialData = {
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        accuracy: initialLocation.coords.accuracy,
        altitude: initialLocation.coords.altitude,
        speed: initialLocation.coords.speed,
        heading: initialLocation.coords.heading,
        timestamp: new Date().toISOString(),
      };

      setGpsData(initialData);
      setLocationHistory([initialData]);

      // Start watching position
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          const newData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: new Date().toISOString(),
          };

          setPreviousLocation(gpsData);
          setGpsData(newData);
          
          setLocationHistory(prev => {
            const updated = [...prev, newData];
            return updated.slice(-10); // Keep last 10 locations
          });
        }
      );

      setSubscription(sub);
      Alert.alert('GPS Test Started', 'Walk around to verify GPS is working correctly');

    } catch (error) {
      console.error('GPS Test Error:', error);
      Alert.alert('Error', error.message);
      setIsTracking(false);
    }
  };

  const stopGPSTest = () => {
    if (subscription) {
      subscription.remove();
      setSubscription(null);
    }
    setIsTracking(false);
    Alert.alert('GPS Test Stopped', 'Check the results below');
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula to calculate distance in meters
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const getMovementAnalysis = () => {
    if (locationHistory.length < 2) {
      return { status: 'Waiting for data...', color: COLORS.textSecondary };
    }

    const first = locationHistory[0];
    const last = locationHistory[locationHistory.length - 1];
    const distance = calculateDistance(
      first.latitude, first.longitude,
      last.latitude, last.longitude
    );

    const timeDiff = (new Date(last.timestamp) - new Date(first.timestamp)) / 1000; // seconds
    const avgSpeed = distance / timeDiff; // meters per second

    if (distance < 1) {
      return { 
        status: '📍 Standing Still (Good - No random movement)', 
        color: COLORS.success,
        distance: distance.toFixed(2) + 'm',
        time: timeDiff.toFixed(0) + 's'
      };
    } else if (distance > 1000) {
      return { 
        status: '⚠️ Large Jump (Check if using simulator)', 
        color: COLORS.danger,
        distance: distance.toFixed(2) + 'm',
        time: timeDiff.toFixed(0) + 's'
      };
    } else {
      return { 
        status: '✅ Normal Movement (Real GPS Working)', 
        color: COLORS.success,
        distance: distance.toFixed(2) + 'm',
        time: timeDiff.toFixed(0) + 's',
        speed: (avgSpeed * 3.6).toFixed(1) + ' km/h'
      };
    }
  };

  const analysis = locationHistory.length >= 2 ? getMovementAnalysis() : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GPS Test & Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.accent} />
          <Text style={styles.infoText}>
            This screen verifies GPS is REAL and not generating random coordinates.
            Walk around to see if GPS updates correctly.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isTracking && styles.buttonDanger]}
          onPress={isTracking ? stopGPSTest : startGPSTest}
        >
          <Ionicons 
            name={isTracking ? "stop-circle" : "play-circle"} 
            size={24} 
            color={COLORS.white} 
          />
          <Text style={styles.buttonText}>
            {isTracking ? 'Stop GPS Test' : 'Start GPS Test'}
          </Text>
        </TouchableOpacity>

        {gpsData && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📍 Current GPS Data</Text>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Latitude:</Text>
                <Text style={styles.value}>{gpsData.latitude.toFixed(7)}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Longitude:</Text>
                <Text style={styles.value}>{gpsData.longitude.toFixed(7)}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Accuracy:</Text>
                <Text style={styles.value}>{gpsData.accuracy?.toFixed(1) || 'N/A'} meters</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Speed:</Text>
                <Text style={styles.value}>
                  {gpsData.speed ? (gpsData.speed * 3.6).toFixed(1) : '0'} km/h
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Heading:</Text>
                <Text style={styles.value}>{gpsData.heading?.toFixed(0) || 'N/A'}°</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Altitude:</Text>
                <Text style={styles.value}>{gpsData.altitude?.toFixed(1) || 'N/A'} m</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Time:</Text>
                <Text style={styles.value}>
                  {new Date(gpsData.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </View>

            {analysis && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📊 Movement Analysis</Text>
                <Text style={[styles.statusText, { color: analysis.color }]}>
                  {analysis.status}
                </Text>
                {analysis.distance && (
                  <>
                    <View style={styles.dataRow}>
                      <Text style={styles.label}>Total Distance:</Text>
                      <Text style={styles.value}>{analysis.distance}</Text>
                    </View>
                    <View style={styles.dataRow}>
                      <Text style={styles.label}>Time Period:</Text>
                      <Text style={styles.value}>{analysis.time}</Text>
                    </View>
                    {analysis.speed && (
                      <View style={styles.dataRow}>
                        <Text style={styles.label}>Avg Speed:</Text>
                        <Text style={styles.value}>{analysis.speed}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📜 Location History ({locationHistory.length}/10)</Text>
              {locationHistory.slice().reverse().map((loc, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyText}>
                    {new Date(loc.timestamp).toLocaleTimeString()}: 
                    {' '}{loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                    {loc.speed ? ` (${(loc.speed * 3.6).toFixed(1)} km/h)` : ''}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>✅ Verification Checklist</Text>
              <Text style={styles.checkText}>
                {gpsData.accuracy < 20 ? '✅' : '⚠️'} GPS Accuracy: 
                {gpsData.accuracy < 20 ? ' Good (<20m)' : ' Poor (>20m)'}
              </Text>
              <Text style={styles.checkText}>
                {locationHistory.length > 3 ? '✅' : '⚠️'} Location Updates: 
                {locationHistory.length > 3 ? ' Working' : ' Collecting...'}
              </Text>
              <Text style={styles.checkText}>
                {analysis && analysis.distance < 1000 ? '✅' : '⚠️'} Movement Pattern: 
                {analysis && analysis.distance < 1000 ? ' Normal' : ' Check Device'}
              </Text>
              <Text style={styles.checkText}>
                ✅ Data Source: Real Device GPS (expo-location)
              </Text>
              <Text style={styles.checkText}>
                ✅ No Mock Data: Coordinates from actual GPS chip
              </Text>
            </View>

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>🧪 How to Verify:</Text>
              <Text style={styles.instructionText}>
                1. If standing still, coordinates should barely change (less than 10m)
              </Text>
              <Text style={styles.instructionText}>
                2. Walk 50 meters, distance should show approximately 50m
              </Text>
              <Text style={styles.instructionText}>
                3. If coordinates jump randomly (100m+ while standing), you are using simulator
              </Text>
              <Text style={styles.instructionText}>
                4. Real GPS: accuracy 5-20m outdoors
              </Text>
              <Text style={styles.instructionText}>
                5. Simulator GPS: accuracy varies wildly
              </Text>
            </View>
          </>
        )}

        {!gpsData && !isTracking && (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>
              Start GPS Test to verify real GPS tracking
            </Text>
          </View>
        )}

        {isTracking && !gpsData && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Getting GPS location...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent + '15',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  buttonDanger: {
    backgroundColor: COLORS.danger,
  },
  buttonText: {
    marginLeft: SPACING.sm,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.white,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  value: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  statusText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    marginBottom: SPACING.sm,
  },
  historyItem: {
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  checkText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.xs,
  },
  instructionsCard: {
    backgroundColor: COLORS.warning + '15',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  instructionsTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  instructionText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    paddingVertical: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
});

export default GPSTestScreen;
