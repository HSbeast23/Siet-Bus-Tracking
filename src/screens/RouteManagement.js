import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, BUS_ROUTES } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const RouteManagement = ({ navigation, route }) => {
  const [selectedBus, setSelectedBus] = useState(null);

  // Get params from navigation (for Co-Admin filtering)
  const { busId: filterBusId, role } = route.params || {};
  const isCoAdmin = role === 'coadmin';

  // 🔥 Use centralized BUS_ROUTES from constants.js
  const busRoutes = BUS_ROUTES;

  const getAllBuses = () => {
    let allBuses = Object.keys(busRoutes).map(busNumber => ({
      busNumber,
      ...busRoutes[busNumber]
    }));
    
    // 🔒 Filter for Co-Admin: Show ONLY their assigned bus route
    if (isCoAdmin && filterBusId) {
      allBuses = allBuses.filter(bus => bus.busNumber === filterBusId);
      console.log(`🔒 [ROUTE MGMT] Co-Admin filter: ${allBuses.length} route(s) for ${filterBusId}`);
    }
    
    return allBuses;
  };

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
            <Text style={styles.summaryNumber}>{getAllBuses().length}</Text>
            <Text style={styles.summaryLabel}>Total Routes</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="location" size={24} color={COLORS.success} />
            <Text style={styles.summaryNumber}>
              {getAllBuses().reduce((total, bus) => total + bus.stops.length, 0)}
            </Text>
            <Text style={styles.summaryLabel}>Total Stops</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="time" size={24} color={COLORS.warning} />
            <Text style={styles.summaryNumber}>
              {Math.round(getAllBuses().reduce((total, bus) => 
                total + parseInt(bus.duration), 0) / getAllBuses().length)}
            </Text>
            <Text style={styles.summaryLabel}>Avg Time (min)</Text>
          </View>
        </View>

        {/* Routes List */}
        <View style={styles.routesSection}>
          <Text style={styles.sectionTitle}>All Bus Routes</Text>
          {getAllBuses().map((bus) => (
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
                    <Text style={styles.routeName}>{bus.name}</Text>
                    <View style={styles.routeStats}>
                      <Text style={styles.routeStat}>
                        <Ionicons name="location" size={12} color={COLORS.gray} /> 
                        {bus.stops.length} stops
                      </Text>
                      <Text style={styles.routeStat}>
                        <Ionicons name="speedometer" size={12} color={COLORS.gray} /> 
                        {bus.distance}
                      </Text>
                      <Text style={styles.routeStat}>
                        <Ionicons name="time" size={12} color={COLORS.gray} /> 
                        {bus.duration}
                      </Text>
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
                  <Text style={styles.stopsTitle}>Route Stops</Text>
                  {bus.stops.map((stop, index) => (
                    <View key={index} style={styles.stopItem}>
                      <View style={styles.stopIndicator}>
                        <View style={[
                          styles.stopDot, 
                          { backgroundColor: getStopColor(index, bus.stops.length) }
                        ]}>
                          <Ionicons 
                            name={getStopIcon(index, bus.stops.length)} 
                            size={12} 
                            color={COLORS.white} 
                          />
                        </View>
                        {index < bus.stops.length - 1 && (
                          <View style={styles.stopLine} />
                        )}
                      </View>
                      <View style={styles.stopDetails}>
                        <Text style={styles.stopName}>{stop.name}</Text>
                        <Text style={styles.stopTime}>{stop.time}</Text>
                      </View>
                    </View>
                  ))}
                  
                  {/* Action Buttons */}
                  <View style={styles.routeActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => navigation.navigate('MapScreen', { selectedBus: bus.busNumber })}
                    >
                      <Ionicons name="map" size={16} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>View on Map</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.warning }]}>
                      <Ionicons name="create" size={16} color={COLORS.white} />
                      <Text style={styles.actionButtonText}>Edit Route</Text>
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
