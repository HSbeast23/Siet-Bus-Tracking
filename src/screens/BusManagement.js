import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToAllBuses, normalizeBusNumber } from '../services/locationService';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const BusManagement = ({ navigation, route }) => {
  const [rawBuses, setRawBuses] = useState([]);
  const [buses, setBuses] = useState([]);
  const [activeStudentCounts, setActiveStudentCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { busId: filterBusId, role, selectMode } = route.params || {};
  const isCoAdmin = role === 'coadmin';
  const isSelectMode = selectMode === true;
  const normalizedFilterBusId = filterBusId ? normalizeBusNumber(filterBusId) : null;

  const resolveBusStatus = useCallback((busDoc) => {
    if (busDoc.isTracking) {
      return 'Active';
    }
    if (busDoc.lastUpdate) {
      const lastUpdateTime = new Date(busDoc.lastUpdate).getTime();
      if (!Number.isNaN(lastUpdateTime)) {
        const diffMinutes = (Date.now() - lastUpdateTime) / (1000 * 60);
        if (diffMinutes <= 10) {
          return 'Recently Active';
        }
      }
    }
    return 'Inactive';
  }, []);

  const refreshStudentCounts = useCallback(async () => {
    try {
      const counts = await registeredUsersStorage.getActiveStudentCountsByBus();
      setActiveStudentCounts(counts);
    } catch (error) {
      console.error('❌ [BUS MGMT] Failed to refresh student counts:', error);
    }
  }, []);

  useEffect(() => {
    console.log('🔥 [BUS MGMT] Subscribing to buses. Role:', role, 'Filter:', normalizedFilterBusId);

    const unsubscribe = subscribeToAllBuses(
      (busesData) => {
        try {
          if (!Array.isArray(busesData)) {
            console.warn('⚠️ [BUS MGMT] busesData is not an array:', typeof busesData);
            setRawBuses([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }

          let filtered = busesData;
          if (isCoAdmin && normalizedFilterBusId) {
            filtered = busesData.filter((bus) => normalizeBusNumber(bus.busNumber || bus.id) === normalizedFilterBusId);
            console.log(`🔒 [BUS MGMT] Co-Admin filter applied: ${filtered.length} bus(es)`);
          }

          setRawBuses(filtered);
          setLoading(false);
          setRefreshing(false);
        } catch (error) {
          console.error('❌ [BUS MGMT] Error processing bus data:', error);
          setRawBuses([]);
          setLoading(false);
          setRefreshing(false);
        }
      },
      (error) => {
        console.error('❌ [BUS MGMT] Error subscribing to buses:', error);
        setRawBuses([]);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isCoAdmin, normalizedFilterBusId, role]);

  useEffect(() => {
    refreshStudentCounts();
  }, [refreshStudentCounts]);

  useEffect(() => {
    if (!rawBuses.length) {
      setBuses([]);
      return;
    }

    const mapped = rawBuses.map((bus) => {
      const normalizedBus = normalizeBusNumber(bus.busNumber || bus.id);
      return {
        id: normalizedBus,
        number: normalizedBus,
        displayName: bus.displayName || normalizedBus,
        driver: bus.driverName || bus.driver || 'Not Assigned',
        status: resolveBusStatus(bus),
        studentsCount: activeStudentCounts[normalizedBus] ?? bus.studentsCount ?? bus.studentCount ?? 0,
        isRealData: true,
        lastUpdate: bus.lastUpdate || null,
        speed: bus.speed ?? null,
      };
    });

    setBuses(mapped);
  }, [rawBuses, activeStudentCounts, resolveBusStatus]);

  useEffect(() => {
    if (!rawBuses.length) {
      return;
    }
    refreshStudentCounts();
  }, [rawBuses.length, refreshStudentCounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshStudentCounts();
    } catch (error) {
      console.error('❌ [BUS MGMT] Manual refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshStudentCounts]);

  const handleBusPress = (bus) => {
    if (isSelectMode) {
      navigation.navigate('MapScreen', {
        busId: bus.number,
        role: 'management',
      });
      return;
    }
    navigation.navigate('BusDetails', { bus });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isSelectMode
            ? 'Select Bus to Track'
            : isCoAdmin
            ? `Bus Management - ${normalizedFilterBusId}`
            : 'Bus Management'}
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
            {isCoAdmin ? 'No bus data found for your assignment' : 'No buses registered yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {isCoAdmin ? 'Contact management to register your bus' : 'Add buses to start tracking'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{buses.length}</Text>
              <Text style={styles.summaryLabel}>{isCoAdmin ? 'Your Bus' : 'Total Buses'}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
                {buses.filter((bus) => bus.status === 'Active').length}
              </Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: COLORS.info }]}>
                {buses.reduce((sum, bus) => sum + (bus.studentsCount || 0), 0)}
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
              {isSelectMode ? 'Tap on a bus to track' : isCoAdmin ? 'Your Bus' : 'All Buses'}
            </Text>

            {buses.map((bus) => (
              <TouchableOpacity
                key={bus.id}
                style={[styles.busCard, isSelectMode && styles.busCardSelect]}
                onPress={() => handleBusPress(bus)}
                activeOpacity={0.75}
              >
                <View style={styles.busCardHeader}>
                  <View style={styles.busInfo}>
                    <View style={styles.busIconContainer}>
                      <Ionicons name="bus" size={30} color={COLORS.primary} />
                    </View>
                    <View style={styles.busDetails}>
                      <Text style={styles.busNumber}>{bus.displayName || bus.number}</Text>
                      <Text style={styles.driverName}>Driver: {bus.driver}</Text>
                      {bus.lastUpdate && (
                        <Text style={styles.updateTime}>
                          LastUpdated {new Date(bus.lastUpdate).toLocaleTimeString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: bus.status === 'Active' ? COLORS.success : COLORS.danger },
                    ]}
                  >
                    <Text style={styles.statusText}>{bus.status}</Text>
                  </View>
                </View>

                <View style={styles.busCardFooter}>
                  <View style={styles.studentInfo}>
                    <Ionicons name="people" size={16} color={COLORS.gray} />
                    <Text style={styles.studentCount}>{bus.studentsCount || 0} Students</Text>
                  </View>
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
  refreshButton: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.gray,
    fontFamily: FONTS.regular,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: 100,
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
  updateTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
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
