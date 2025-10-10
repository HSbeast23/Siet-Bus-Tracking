import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToAllBuses } from '../services/locationService';

const { width } = Dimensions.get('window');

const BusManagement = ({ navigation, route }) => {
  // Real-time data from Firestore - NO MOCK DATA
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Get params from navigation (for Co-Admin filtering or Management bus selection)
  const { busId: filterBusId, role, selectMode } = route.params || {};
  const isCoAdmin = role === 'coadmin';
  const isSelectMode = selectMode === true; // Management selecting bus to track

  // 🔥 Subscribe to real-time bus data from Firestore (NO MOCK DATA)
  useEffect(() => {
    console.log('🔥 [BUS MGMT] Setting up real-time subscription to buses');
    console.log('🔥 [BUS MGMT] Role:', role, 'Filter Bus ID:', filterBusId);
    
    const unsubscribe = subscribeToAllBuses(
      (busesData) => {
        try {
          console.log('📦 [BUS MGMT] Received buses data:', busesData?.length || 0, 'buses');
          
          // Safety check: Ensure busesData is an array
          if (!Array.isArray(busesData)) {
            console.warn('⚠️ [BUS MGMT] busesData is not an array:', typeof busesData);
            setBuses([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }
          
          // Filter for Co-Admin: Show ONLY their assigned bus
          let filteredBuses = busesData;
          if (isCoAdmin && filterBusId) {
            filteredBuses = busesData.filter(bus => 
              bus.busNumber === filterBusId
            );
            console.log(`🔒 [BUS MGMT] Co-Admin filter applied: ${filteredBuses.length} bus(es) for ${filterBusId}`);
          }
          
          // Safety check: Ensure filteredBuses is an array before mapping
          if (!Array.isArray(filteredBuses)) {
            console.warn('⚠️ [BUS MGMT] filteredBuses is not an array after filtering:', typeof filteredBuses);
            setBuses([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }
          
          // Map real data with student count from Firebase
          const busesWithCounts = filteredBuses.map(bus => ({
            id: bus.busNumber, // Use bus number as ID
            number: bus.busNumber,
            driver: bus.driverName || 'Not Assigned',
            status: bus.isTracking ? 'Active' : 'Inactive',
            studentsCount: bus.studentsCount || 0, // From Firebase
            isRealData: true,
            lastUpdate: bus.lastUpdate,
            currentLocation: bus.currentLocation,
            speed: bus.speed,
            accuracy: bus.accuracy
          }));
        
        console.log(`✅ [BUS MGMT] Loaded ${busesWithCounts.length} authenticated buses (NO MOCK DATA)`);
        
        setBuses(busesWithCounts);
        setLoading(false);
        setRefreshing(false);
        } catch (mappingError) {
          console.error('❌ [BUS MGMT] Error mapping bus data:', mappingError);
          Alert.alert('Error', 'Failed to process bus data');
          setBuses([]);
          setLoading(false);
          setRefreshing(false);
        }
      },
      (error) => {
        console.error('❌ [BUS MGMT] Error subscribing to buses:', error);
        Alert.alert('Error', 'Failed to load bus data from Firebase');
        setBuses([]);
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
  }, [filterBusId, isCoAdmin]);

  const onRefresh = () => {
    console.log('🔄 [BUS MGMT] Manual refresh triggered');
    setRefreshing(true);
    // Subscription will automatically update
  };

  const handleBusPress = (bus) => {
    // If in select mode (Management selecting bus to track)
    if (isSelectMode) {
      console.log(`🗺️ [BUS MGMT] Management selected bus ${bus.number} for tracking`);
      navigation.navigate('MapScreen', { 
        busId: bus.number, 
        role: 'management' 
      });
    } else {
      // Normal mode - show bus details
      navigation.navigate('BusDetails', { bus });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSelectMode ? 'Select Bus to Track' : isCoAdmin ? `Bus Management - ${filterBusId}` : 'Bus Management'}
        </Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading buses...</Text>
        </View>
      ) : buses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bus-outline" size={80} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            {isCoAdmin 
              ? `No bus data found for ${filterBusId}` 
              : 'No buses registered yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {isCoAdmin 
              ? 'Contact management to register your bus' 
              : 'Add buses to start tracking'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{buses.length}</Text>
              <Text style={styles.summaryLabel}>
                {isCoAdmin ? 'Your Bus' : 'Total Buses'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
                {buses.filter(bus => bus.status === 'Active').length}
              </Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: COLORS.info }]}>
                {buses.reduce((sum, bus) => sum + bus.studentsCount, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Students</Text>
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
            <Text style={styles.sectionTitle}>
              {isSelectMode ? 'Tap on a bus to track' : isCoAdmin ? 'Your Bus Details' : 'All Buses'}
            </Text>
            {buses && buses.length > 0 ? buses.map((bus) => (
              <TouchableOpacity
                key={bus.id}
                style={[styles.busCard, isSelectMode && styles.busCardSelect]}
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
            )) : (
              <View style={styles.emptyState}>
                <Ionicons name="bus-outline" size={64} color={COLORS.gray} />
                <Text style={styles.emptyStateText}>No buses available</Text>
                <Text style={styles.emptyStateSubtext}>
                  {isCoAdmin ? 'Your bus data will appear here' : 'Add buses to get started'}
                </Text>
              </View>
            )}
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
  busCardSelect: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});

export default BusManagement;
