import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const RouteManagement = ({ navigation }) => {
  const [selectedBus, setSelectedBus] = useState(null);

  // Real Coimbatore routes for all buses
  const busRoutes = {
    'SIET-001': {
      name: 'Chinnapalayam Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Saravanampatti', time: '7:15 AM', coordinates: [11.0770, 76.9739] },
        { name: 'Chinnapalayam', time: '7:30 AM', coordinates: [11.0805, 76.9821] },
        { name: 'Ramanathapuram', time: '7:45 AM', coordinates: [11.0726, 76.9345] },
        { name: 'Vadavalli', time: '8:00 AM', coordinates: [11.0264, 76.9148] },
        { name: 'Thudiyalur', time: '8:15 AM', coordinates: [11.0435, 76.8926] }
      ],
      distance: '25.5 km',
      duration: '75 min'
    },
    'SIET-002': {
      name: 'Gandhipuram Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Gandhipuram', time: '7:20 AM', coordinates: [11.0178, 76.9674] },
        { name: 'Sungam', time: '7:35 AM', coordinates: [11.0098, 76.9725] },
        { name: 'RS Puram', time: '7:50 AM', coordinates: [11.0041, 76.9618] },
        { name: 'Peelamedu', time: '8:05 AM', coordinates: [11.0261, 76.9676] },
        { name: 'Hopes College', time: '8:20 AM', coordinates: [11.0310, 76.9721] }
      ],
      distance: '22.8 km',
      duration: '80 min'
    },
    'SIET-003': {
      name: 'Kalapatti Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Kalapatti', time: '7:18 AM', coordinates: [11.0353, 76.9647] },
        { name: 'Sulur', time: '7:35 AM', coordinates: [11.0248, 76.8984] },
        { name: 'Neelambur', time: '7:52 AM', coordinates: [11.0178, 76.9125] },
        { name: 'Coimbatore North', time: '8:08 AM', coordinates: [11.0378, 76.9274] },
        { name: 'Singanallur', time: '8:25 AM', coordinates: [11.0394, 76.9765] }
      ],
      distance: '28.2 km',
      duration: '85 min'
    },
    'SIET-004': {
      name: 'Ondipudur Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Ondipudur', time: '7:22 AM', coordinates: [10.9965, 76.9677] },
        { name: 'Sarkar Periyapalayam', time: '7:38 AM', coordinates: [10.9824, 76.9543] },
        { name: 'Kuniamuthur', time: '7:55 AM', coordinates: [10.9698, 76.9321] },
        { name: 'Thaneerpandal', time: '8:12 AM', coordinates: [10.9587, 76.9456] },
        { name: 'Pollachi Road', time: '8:28 AM', coordinates: [10.9456, 76.9234] }
      ],
      distance: '31.7 km',
      duration: '88 min'
    },
    'SIET-005': {
      name: 'Uppilipalayam Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Uppilipalayam', time: '7:25 AM', coordinates: [11.0103, 76.9440] },
        { name: 'Podanur', time: '7:42 AM', coordinates: [10.9987, 76.9234] },
        { name: 'Pothanur', time: '7:58 AM', coordinates: [10.9876, 76.9012] },
        { name: 'Madukkarai', time: '8:15 AM', coordinates: [10.9654, 76.8876] },
        { name: 'Kinathukadavu', time: '8:32 AM', coordinates: [10.9432, 76.8543] }
      ],
      distance: '35.4 km',
      duration: '92 min'
    },
    'SIET-006': {
      name: 'Ganapathy Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Ganapathy', time: '7:17 AM', coordinates: [11.0041, 76.9618] },
        { name: 'Kavundampalayam', time: '7:33 AM', coordinates: [11.0087, 76.9456] },
        { name: 'Lakshmi Mills', time: '7:48 AM', coordinates: [11.0156, 76.9689] },
        { name: 'Town Hall', time: '8:03 AM', coordinates: [11.0089, 76.9723] },
        { name: 'Central Bus Stand', time: '8:18 AM', coordinates: [11.0066, 76.9633] }
      ],
      distance: '19.6 km',
      duration: '78 min'
    },
    'SIET-007': {
      name: 'Karamadai Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Karamadai', time: '7:28 AM', coordinates: [11.0246, 76.9314] },
        { name: 'Mettupalayam Road', time: '7:45 AM', coordinates: [11.0324, 76.9187] },
        { name: 'Avinashi Road', time: '8:02 AM', coordinates: [11.0287, 76.9267] },
        { name: 'Neelambur', time: '8:18 AM', coordinates: [11.0178, 76.9125] },
        { name: 'IT Park Kalapatti', time: '8:35 AM', coordinates: [11.0353, 76.9647] }
      ],
      distance: '33.1 km',
      duration: '95 min'
    },
    'SIET-008': {
      name: 'Vadavalli Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Vadavalli', time: '7:19 AM', coordinates: [11.0264, 76.9148] },
        { name: 'Marudhamalai', time: '7:36 AM', coordinates: [10.9926, 76.9610] },
        { name: 'Thondamuthur', time: '7:53 AM', coordinates: [10.9876, 76.9234] },
        { name: 'Thadagam Road', time: '8:09 AM', coordinates: [10.9745, 76.9345] },
        { name: 'Anaikatti', time: '8:26 AM', coordinates: [10.9543, 76.9123] }
      ],
      distance: '29.8 km',
      duration: '86 min'
    },
    'SIET-009': {
      name: 'Siddhapudur Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Siddhapudur', time: '7:21 AM', coordinates: [11.0194, 76.9712] },
        { name: 'Ram Nagar', time: '7:37 AM', coordinates: [11.0234, 76.9834] },
        { name: 'Ramanathapuram', time: '7:52 AM', coordinates: [11.0726, 76.9345] },
        { name: 'Selvapuram', time: '8:08 AM', coordinates: [11.0145, 76.9567] },
        { name: 'Ukkadam', time: '8:24 AM', coordinates: [11.0098, 76.9489] }
      ],
      distance: '26.4 km',
      duration: '84 min'
    },
    'SIET-010': {
      name: 'Peelamedu Route',
      stops: [
        { name: 'Main Campus', time: '7:00 AM', coordinates: [11.0168, 76.9558] },
        { name: 'Peelamedu', time: '7:16 AM', coordinates: [11.0261, 76.9676] },
        { name: 'Brookefields Mall', time: '7:31 AM', coordinates: [11.0113, 76.9720] },
        { name: 'Avinashi Road', time: '7:46 AM', coordinates: [11.0287, 76.9267] },
        { name: 'Goldwins', time: '8:01 AM', coordinates: [11.0201, 76.9601] },
        { name: 'Prozone Mall', time: '8:17 AM', coordinates: [11.0156, 76.9689] }
      ],
      distance: '21.3 km',
      duration: '77 min'
    }
  };

  const getAllBuses = () => {
    return Object.keys(busRoutes).map(busNumber => ({
      busNumber,
      ...busRoutes[busNumber]
    }));
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
        <Text style={styles.headerTitle}>Route Management</Text>
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginVertical: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  routesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  routeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  busIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeDetails: {
    flex: 1,
  },
  busNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  routeName: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  routeStats: {
    flexDirection: 'row',
    marginTop: 5,
  },
  routeStat: {
    fontSize: 11,
    color: COLORS.gray,
    marginRight: 12,
  },
  routeStopsContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginVertical: 10,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stopIndicator: {
    alignItems: 'center',
    marginRight: 15,
  },
  stopDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.lightGray,
    marginTop: 5,
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  stopTime: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  routeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default RouteManagement;
