import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToAllBuses, normalizeBusNumber } from '../services/locationService';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const { width } = Dimensions.get('window');

const RouteManagement = ({ navigation, route }) => {
  const [selectedBus, setSelectedBus] = useState(null);
  const [rawBuses, setRawBuses] = useState([]);
  const [activeStudentCounts, setActiveStudentCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // Get params from navigation (for Co-Admin filtering)
  const { busId: filterBusId, role } = route.params || {};
  const isCoAdmin = role === 'coadmin';
  const normalizedFilterBusId = filterBusId ? normalizeBusNumber(filterBusId) : null;

  useEffect(() => {
    const unsubscribe = subscribeToAllBuses(
      (busesData) => {
        try {
          if (!Array.isArray(busesData)) {
            setRawBuses([]);
            setLoading(false);
            return;
          }

          const byBus = new Map();
          busesData.forEach((busDoc) => {
            const normalized = normalizeBusNumber(busDoc.busNumber || busDoc.id);
            if (!normalized) {
              return;
            }

            if (isCoAdmin && normalizedFilterBusId && normalized !== normalizedFilterBusId) {
              return;
            }

            const current = byBus.get(normalized);
            const routeStops = Array.isArray(busDoc.routeStops) ? busDoc.routeStops : [];

            if (!current || routeStops.length > current.routeStops.length) {
              byBus.set(normalized, {
                id: normalized,
                busNumber: normalized,
                displayName: busDoc.displayName || normalized,
                routeStops,
                studentsCount: busDoc.studentsCount || busDoc.studentCount || 0,
                updatedAt: busDoc.updatedAt || busDoc.lastUpdate || null,
                driverName: busDoc.driverName || busDoc.driver || 'Not Assigned',
              });
            }
          });

          setRawBuses(Array.from(byBus.values()));
          setLoading(false);
        } catch (error) {
          console.error('❌ [ROUTE MGMT] Failed to process buses:', error);
          setRawBuses([]);
          setLoading(false);
        }
      },
      (error) => {
        console.error('❌ [ROUTE MGMT] Subscription error:', error);
        setRawBuses([]);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isCoAdmin, normalizedFilterBusId]);

  useEffect(() => {
    const refreshCounts = async () => {
      try {
        const counts = await registeredUsersStorage.getActiveStudentCountsByBus();
        setActiveStudentCounts(counts);
      } catch (error) {
        console.error('❌ [ROUTE MGMT] Failed to load student counts:', error);
      }
    };

    refreshCounts();
  }, []);

  const CAMPUS_KEYWORDS = useMemo(() => ['SIET', 'SRI SHAKTHI', 'MAIN CAMPUS'], []);

  const formatRouteStops = (stops = []) => {
    const uniqueStops = [];
    const seen = new Set();

    stops.forEach((stopRaw) => {
      if (!stopRaw) {
        return;
      }
      const label = stopRaw.toString().replace(/\s+/g, ' ').trim();
      const key = label.toUpperCase();
      if (!label || seen.has(key)) {
        return;
      }
      seen.add(key);
      uniqueStops.push({ label });
    });

    if (!uniqueStops.length) {
      return [{ label: 'SIET Main Campus' }];
    }

    const campusIndex = uniqueStops.findIndex(({ label }) =>
      CAMPUS_KEYWORDS.some((keyword) => label.toUpperCase().includes(keyword))
    );

    if (campusIndex === -1) {
      return [{ label: 'SIET Main Campus' }, ...uniqueStops];
    }

    const [campusStop] = uniqueStops.splice(campusIndex, 1);
    return [campusStop, ...uniqueStops];
  };

  const buses = useMemo(() => {
    if (!rawBuses.length) {
      return [];
    }

    const activeBusNumbers = new Set(Object.keys(activeStudentCounts || {}));
    const includeFilterBus = isCoAdmin && normalizedFilterBusId;

    return rawBuses
      .filter((bus) =>
        activeBusNumbers.has(bus.busNumber) || (includeFilterBus && bus.busNumber === normalizedFilterBusId)
      )
      .map((bus) => {
        const formattedStops = formatRouteStops(bus.routeStops);
        return {
          ...bus,
          routeStops: formattedStops,
          totalStops: formattedStops.length,
          activeStudents: activeStudentCounts[bus.busNumber] || 0,
        };
      })
      .sort((a, b) => a.busNumber.localeCompare(b.busNumber, undefined, { numeric: true }));
  }, [rawBuses, activeStudentCounts, isCoAdmin, normalizedFilterBusId]);

  const handleBusPress = (busNumber) => {
    setSelectedBus(selectedBus === busNumber ? null : busNumber);
  };

  const getStopIcon = (index, totalStops) => {
    if (index === 0) return 'flag'; // Start
    if (index === totalStops - 1) return 'checkmark-circle'; // End
    return 'location'; // Middle stops
  };

  const getStopColor = (index, totalStops) => {
    if (index === 0) return COLORS.success; // Start
    if (index === totalStops - 1) return COLORS.danger; // End
    return COLORS.primary; // Middle stops
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isCoAdmin ? `Route Management - ${filterBusId}` : 'Route Management'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Ionicons name="bus" size={24} color={COLORS.primary} />
            <Text style={styles.summaryNumber}>{buses.length}</Text>
            <Text style={styles.summaryLabel}>Total Routes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="location" size={24} color={COLORS.success} />
            <Text style={styles.summaryNumber}>
              {buses.reduce((total, bus) => total + (bus.totalStops || 0), 0)}
            </Text>
            <Text style={styles.summaryLabel}>Total Stops</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="time" size={24} color={COLORS.warning} />
            <Text style={styles.summaryNumber}>
              {buses.length ? Math.max(...buses.map((bus) => bus.activeStudents || 0)) : 0}
            </Text>
            <Text style={styles.summaryLabel}>Max Students</Text>
          </View>
        </View>

        {/* Routes List */}
        <View style={styles.routesSection}>
          <Text style={styles.sectionTitle}>All Bus Routes</Text>
          {loading && (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
          )}
          {!loading && buses.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="bus-outline" size={64} color={COLORS.gray} />
              <Text style={styles.emptyStateTitle}>No authenticated routes</Text>
              <Text style={styles.emptyStateSubtitle}>
                Import a CSV to register bus boarding points and try again.
              </Text>
            </View>
          )}
          {buses.map((bus) => (
            <View key={bus.busNumber} style={styles.routeCard}>
              <TouchableOpacity
                style={styles.routeHeader}
                onPress={() => handleBusPress(bus.busNumber)}
                activeOpacity={0.7}
              >
                <View style={styles.routeInfo}>
                  <View style={styles.busIconContainer}>
                    <Ionicons name="bus" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.routeDetails}>
                    <Text style={styles.busNumber}>{bus.busNumber}</Text>
                    <Text style={styles.routeName}>
                      {bus.displayName} • {bus.activeStudents} students
                    </Text>
                    <View style={styles.routeStats}>
                      <Text style={styles.routeStat}>
                        <Ionicons name="location" size={12} color={COLORS.gray} /> 
                        {bus.totalStops} stops
                      </Text>
                      {bus.updatedAt && (
                        <Text style={styles.routeStat}>
                          <Ionicons name="time" size={12} color={COLORS.gray} /> 
                          Updated {new Date(bus.updatedAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <Ionicons 
                  name={selectedBus === bus.busNumber ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={COLORS.gray} 
                />
              </TouchableOpacity>

              {selectedBus === bus.busNumber && (
                <View style={styles.routeStopsContainer}>
                  <Text style={styles.stopsTitle}>Route Boarding Points</Text>
                  {bus.routeStops.map((stop, index) => (
                    <View key={index} style={styles.stopItem}>
                      <View style={styles.stopIndicator}>
                        <View style={[
                          styles.stopDot, 
                          { backgroundColor: getStopColor(index, bus.totalStops) }
                        ]}>
                          <Ionicons 
                            name={getStopIcon(index, bus.totalStops)} 
                            size={12} 
                            color={COLORS.white} 
                          />
                        </View>
                        {index < bus.totalStops - 1 && (
                          <View style={styles.stopLine} />
                        )}
                      </View>
                      <View style={styles.stopDetails}>
                        <Text style={styles.stopName}>{stop.label}</Text>
                        <Text style={styles.stopTime}>
                          {index === 0 ? 'Start • SIET Main Campus' : `Boarding Point ${index}`}
                        </Text>
                      </View>
                    </View>
                  ))}
                  
                  {/* Action Buttons */}
                  <View style={styles.routeActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => navigation.navigate('MapScreen', {
                        busId: bus.busNumber,
                        routeStops: bus.routeStops,
                        busDisplayName: bus.displayName,
                      })}
                    >
                      <Ionicons name="map" size={16} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>View on Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
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
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    justifyContent: 'space-around',
    ...SHADOWS.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
    marginTop: SPACING.md,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  routesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  routeCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  routeInfo: {
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
  routeDetails: {
    flex: 1,
  },
  busNumber: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  routeName: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 2,
  },
  routeStats: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  routeStat: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginRight: SPACING.md,
  },
  routeStopsContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  stopsTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginVertical: SPACING.sm,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stopIndicator: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stopDot: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.lightGray,
    marginTop: SPACING.xs,
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
  },
  stopTime: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 2,
  },
  routeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    marginLeft: SPACING.xs,
  },
});

export default RouteManagement;
