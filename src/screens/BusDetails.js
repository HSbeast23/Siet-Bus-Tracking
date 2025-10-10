import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { COLORS, BUS_ROUTES } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { normalizeBusNumber } from '../services/locationService';

const { width } = Dimensions.get('window');

const BusDetails = ({ route, navigation }) => {
  const { bus } = route.params;
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    loadRealStudentCount();
  }, []);

  const loadRealStudentCount = async () => {
    try {
      setLoading(true);
      // Fetch REAL student count from Firebase
      const studentsRef = collection(db, 'students');
      const studentsQuery = query(
        studentsRef,
        where('busNumber', '==', bus.number),
        where('status', '==', 'Active')
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const count = studentsSnapshot.size;
      
      console.log(`✅ [BUS DETAILS] Found ${count} students for bus ${bus.number}`);
      setStudentCount(count);
    } catch (error) {
      console.error('❌ [BUS DETAILS] Error loading students:', error);
      setStudentCount(0);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Use centralized BUS_ROUTES from constants.js with normalization
  const getRouteStops = (busNumber) => {
    // Normalize bus number to handle variations (SIET--005 → SIET-005)
    const normalizedBusNumber = normalizeBusNumber(busNumber);
    console.log(`🔧 [BUS DETAILS] Normalized bus number: "${busNumber}" → "${normalizedBusNumber}"`);
    
    const routeData = BUS_ROUTES[normalizedBusNumber];
    if (!routeData) {
      console.log(`⚠️ [BUS DETAILS] No route found for: ${normalizedBusNumber}`);
      return []; // Return empty array if no route found
    }
    // Extract just the stop names from the route data
    return routeData.stops.map(stop => stop.name);
  };

  const route_stops = getRouteStops(bus.number);

  const getBusStatusColor = (status) => {
    return status === 'Active' ? COLORS.success : COLORS.danger;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bus Info Card */}
        <View style={styles.busInfoCard}>
          <View style={styles.busHeader}>
            <View style={styles.busIconContainer}>
              <Ionicons name="bus" size={40} color={COLORS.primary} />
            </View>
            <View style={styles.busMainInfo}>
              <Text style={styles.busNumber}>{bus.number}</Text>
              <Text style={styles.driverName}>Driver: {bus.driver}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getBusStatusColor(bus.status) }]}>
                <Text style={styles.statusText}>{bus.status}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />
            ) : (
              <Text style={styles.statNumber}>{studentCount}</Text>
            )}
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="location" size={24} color={COLORS.success} />
            <Text style={styles.statNumber}>{route_stops.length}</Text>
            <Text style={styles.statLabel}>Stops</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color={COLORS.warning} />
            <Text style={styles.statNumber}>45</Text>
            <Text style={styles.statLabel}>Min Route</Text>
          </View>
        </View>

        {/* Route Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Route Information</Text>
          {route_stops.map((stop, index) => (
            <View key={index} style={styles.routeItem}>
              <View style={styles.routeIndicator}>
                <View style={[styles.routeDot, { backgroundColor: index === 0 ? COLORS.success : COLORS.gray }]} />
                {index < route_stops.length - 1 && <View style={styles.routeLine} />}
              </View>
              <Text style={styles.routeStop}>{stop}</Text>
            </View>
          ))}
        </View>

        {/* Students List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Students {loading ? '...' : `(${studentCount})`}
            </Text>
          </View>
          {loading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 10, color: COLORS.gray }}>Loading students...</Text>
            </View>
          ) : studentCount === 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="people-outline" size={48} color={COLORS.gray} />
              <Text style={{ marginTop: 10, color: COLORS.gray, textAlign: 'center' }}>
                No active students registered for this bus yet
              </Text>
            </View>
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={{ marginTop: 10, color: COLORS.secondary, fontSize: 16, fontWeight: '600' }}>
                {studentCount} Active Students
              </Text>
              <Text style={{ marginTop: 5, color: COLORS.gray, textAlign: 'center' }}>
                Registered and actively using this bus service
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('MapScreen', { 
              busId: bus.number, 
              role: 'management' 
            })}
          >
            <Ionicons name="map" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Track Live</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.warning }]}>
            <Ionicons name="settings" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Edit Details</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  busInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  busMainInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  driverName: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  routeIndicator: {
    alignItems: 'center',
    marginRight: 15,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.lightGray,
    marginTop: 5,
  },
  routeStop: {
    fontSize: 16,
    color: COLORS.secondary,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  studentRoll: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  pickupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  viewAllButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 15,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default BusDetails;
