import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToAllBuses } from '../services/locationService';

const { width } = Dimensions.get('window');

const BusManagement = ({ navigation }) => {
  // Real-time data from Firestore
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Mock data as fallback for buses not in Firestore
  const mockBuses = [
    { id: 1, number: 'SIET-001', driver: 'Not Assigned', status: 'Inactive', studentsCount: 45 },
    { id: 2, number: 'SIET-002', driver: 'Not Assigned', status: 'Inactive', studentsCount: 38 },
    { id: 3, number: 'SIET-003', driver: 'Not Assigned', status: 'Inactive', studentsCount: 42 },
    { id: 4, number: 'SIET-004', driver: 'Not Assigned', status: 'Inactive', studentsCount: 35 },
    { id: 5, number: 'SIET-005', driver: 'Not Assigned', status: 'Inactive', studentsCount: 40 },
    { id: 6, number: 'SIET-006', driver: 'Not Assigned', status: 'Inactive', studentsCount: 33 },
    { id: 7, number: 'SIET-007', driver: 'Not Assigned', status: 'Inactive', studentsCount: 48 },
    { id: 8, number: 'SIET-008', driver: 'Not Assigned', status: 'Inactive', studentsCount: 30 },
    { id: 9, number: 'SIET-009', driver: 'Not Assigned', status: 'Inactive', studentsCount: 44 },
    { id: 10, number: 'SIET-010', driver: 'Not Assigned', status: 'Inactive', studentsCount: 36 },
    { id: 11, number: 'SIET-011', driver: 'Not Assigned', status: 'Inactive', studentsCount: 41 },
    { id: 12, number: 'SIET-012', driver: 'Not Assigned', status: 'Inactive', studentsCount: 34 },
    { id: 13, number: 'SIET-013', driver: 'Not Assigned', status: 'Inactive', studentsCount: 43 },
    { id: 14, number: 'SIET-014', driver: 'Not Assigned', status: 'Inactive', studentsCount: 37 },
    { id: 15, number: 'SIET-015', driver: 'Not Assigned', status: 'Inactive', studentsCount: 46 },
    { id: 16, number: 'SIET-016', driver: 'Not Assigned', status: 'Inactive', studentsCount: 32 },
    { id: 17, number: 'SIET-017', driver: 'Not Assigned', status: 'Inactive', studentsCount: 39 },
    { id: 18, number: 'SIET-018', driver: 'Not Assigned', status: 'Inactive', studentsCount: 31 },
    { id: 19, number: 'SIET-019', driver: 'Not Assigned', status: 'Inactive', studentsCount: 47 },
    { id: 20, number: 'SIET-020', driver: 'Not Assigned', status: 'Inactive', studentsCount: 29 },
    { id: 21, number: 'SIET-021', driver: 'Not Assigned', status: 'Inactive', studentsCount: 45 },
    { id: 22, number: 'SIET-022', driver: 'Not Assigned', status: 'Inactive', studentsCount: 38 }
  ];

  // 🔥 Subscribe to real-time bus data from Firestore
  useEffect(() => {
    console.log('🔥 [BUS MGMT] Setting up real-time subscription to all buses');
    
    // Normalize bus number to handle variations (SIET-005, SIET--005, etc.)
    const normalizeBusNumber = (busNumber) => {
      if (!busNumber) return '';
      return busNumber.toString().trim().toUpperCase().replace(/-+/g, '-');
    };
    
    const unsubscribe = subscribeToAllBuses(
      (busesData) => {
        console.log('📦 [BUS MGMT] Received buses data:', busesData.length, 'buses');
        console.log('📦 [BUS MGMT] Raw data:', JSON.stringify(busesData));
        
        // Merge real data with mock data - normalize bus numbers for comparison
        const mergedBuses = mockBuses.map(mockBus => {
          // Find real data for this bus using normalized comparison
          const normalizedMockNumber = normalizeBusNumber(mockBus.number);
          const realBus = busesData.find(b => 
            normalizeBusNumber(b.busNumber) === normalizedMockNumber
          );
          
          if (realBus) {
            console.log(`✅ [BUS MGMT] Found real data for ${mockBus.number}:`, {
              driver: realBus.driverName,
              tracking: realBus.isTracking,
              location: realBus.currentLocation
            });
            
            return {
              id: mockBus.id,
              number: realBus.busNumber,
              driver: realBus.driverName || 'Not Assigned',
              status: realBus.isTracking ? 'Active' : 'Inactive',
              studentsCount: mockBus.studentsCount,
              isRealData: true,
              lastUpdate: realBus.lastUpdate,
              currentLocation: realBus.currentLocation,
              speed: realBus.speed,
              accuracy: realBus.accuracy
            };
          }
          
          // Return mock data if no real data found
          console.log(`⚠️ [BUS MGMT] No real data for ${mockBus.number}, using mock`);
          return {
            ...mockBus,
            isRealData: false
          };
        });
        
        console.log(`✅ [BUS MGMT] Merged data complete: ${mergedBuses.filter(b => b.isRealData).length} real, ${mergedBuses.filter(b => !b.isRealData).length} mock`);
        
        setBuses(mergedBuses);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('❌ [BUS MGMT] Error subscribing to buses:', error);
        console.error('❌ [BUS MGMT] Error details:', error.message);
        // Use mock data on error
        setBuses(mockBuses.map(b => ({ ...b, isRealData: false })));
        setLoading(false);
        setRefreshing(false);
      }
    );

    // Cleanup subscription
    return () => {
      if (unsubscribe) {
        console.log('🛑 [BUS MGMT] Unsubscribing from buses');
        unsubscribe();
      }
    };
  }, []);

  const onRefresh = () => {
    console.log('🔄 [BUS MGMT] Manual refresh triggered');
    setRefreshing(true);
    // Subscription will automatically update
  };

  const handleBusPress = (bus) => {
    navigation.navigate('BusDetails', { bus });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus Management</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading buses...</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{buses.length}</Text>
              <Text style={styles.summaryLabel}>Total Buses</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
                {buses.filter(bus => bus.status === 'Active').length}
              </Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: COLORS.warning }]}>
                {buses.filter(bus => bus.isRealData).length}
              </Text>
              <Text style={styles.summaryLabel}>Live Data</Text>
            </View>
          </View>

          <ScrollView 
            style={styles.busList} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          >
            <Text style={styles.sectionTitle}>All Buses</Text>
            {buses.map((bus) => (
              <TouchableOpacity
                key={bus.id}
                style={styles.busCard}
                onPress={() => handleBusPress(bus)}
                activeOpacity={0.7}
              >
                <View style={styles.busCardHeader}>
                  <View style={styles.busInfo}>
                    <View style={styles.busIconContainer}>
                      <Ionicons 
                        name="bus" 
                        size={30} 
                        color={bus.isRealData ? COLORS.primary : COLORS.gray} 
                      />
                      {bus.isRealData && (
                        <View style={styles.liveDataBadge}>
                          <View style={styles.liveDot} />
                        </View>
                      )}
                    </View>
                    <View style={styles.busDetails}>
                      <View style={styles.busNumberRow}>
                        <Text style={styles.busNumber}>{bus.number}</Text>
                        {bus.isRealData && (
                          <View style={styles.realDataChip}>
                            <Text style={styles.realDataText}>LIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.driverName}>
                        Driver: {bus.driver}
                      </Text>
                      {bus.isRealData && bus.lastUpdate && (
                        <Text style={styles.updateTime}>
                          Updated: {new Date(bus.lastUpdate).toLocaleTimeString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: bus.status === 'Active' ? COLORS.success : COLORS.danger }
                  ]}>
                    <Text style={styles.statusText}>{bus.status}</Text>
                  </View>
                </View>
                
                <View style={styles.busCardFooter}>
                  <View style={styles.studentInfo}>
                    <Ionicons name="people" size={16} color={COLORS.gray} />
                    <Text style={styles.studentCount}>{bus.studentsCount} Students</Text>
                  </View>
                  {bus.isRealData && bus.speed !== undefined && (
                    <View style={styles.speedInfo}>
                      <Ionicons name="speedometer" size={16} color={COLORS.success} />
                      <Text style={styles.speedText}>{(bus.speed * 3.6).toFixed(1)} km/h</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
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
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  placeholder: {
    width: 34,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    justifyContent: 'space-around',
    ...SHADOWS.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  busList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  busCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  busInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  busIconContainer: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  busDetails: {
    flex: 1,
  },
  busNumber: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  driverName: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  busCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentCount: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginLeft: SPACING.xs,
  },
});

export default BusManagement;
