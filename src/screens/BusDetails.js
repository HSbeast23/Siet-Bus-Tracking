import React from 'react';
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

const BusDetails = ({ route, navigation }) => {
  const { bus } = route.params;

  // Real Coimbatore routes starting from Main Campus
  const getRouteStops = (busNumber) => {
    const routes = {
      'SIET-001': [
        'Main Campus',
        'Saravanampatti',
        'Chinnapalayam',
        'Ramanathapuram',
        'Vadavalli',
        'Thudiyalur'
      ],
      'SIET-002': [
        'Main Campus',
        'Gandhipuram',
        'Sungam',
        'RS Puram',
        'Peelamedu',
        'Hopes College'
      ],
      'SIET-003': [
        'Main Campus',
        'Kalapatti',
        'Sulur',
        'Neelambur',
        'Coimbatore North',
        'Singanallur'
      ],
      'SIET-004': [
        'Main Campus',
        'Ondipudur',
        'Sarkar Periyapalayam',
        'Kuniamuthur',
        'Thaneerpandal',
        'Pollachi Road'
      ],
      'SIET-005': [
        'Main Campus',
        'Uppilipalayam',
        'Podanur',
        'Pothanur',
        'Madukkarai',
        'Kinathukadavu'
      ],
      'SIET-006': [
        'Main Campus',
        'Ganapathy',
        'Kavundampalayam',
        'Lakshmi Mills',
        'Town Hall',
        'Central Bus Stand'
      ],
      'SIET-007': [
        'Main Campus',
        'Karamadai',
        'Mettupalayam Road',
        'Avinashi Road',
        'Neelambur',
        'IT Park Kalapatti'
      ],
      'SIET-008': [
        'Main Campus',
        'Vadavalli',
        'Marudhamalai',
        'Thondamuthur',
        'Thadagam Road',
        'Anaikatti'
      ],
      'SIET-009': [
        'Main Campus',
        'Siddhapudur',
        'Ram Nagar',
        'Ramanathapuram',
        'Selvapuram',
        'Ukkadam'
      ],
      'SIET-010': [
        'Main Campus',
        'Peelamedu',
        'Brookefields Mall',
        'Avinashi Road',
        'Goldwins',
        'Prozone Mall'
      ],
      'SIET-011': [
        'Main Campus',
        'Kovaipudur',
        'Saibaba Colony',
        'Race Course',
        'Gandhipuram',
        'TNSTC Bus Stand'
      ],
      'SIET-012': [
        'Main Campus',
        'Kuniyamuthur',
        'Thudiyalur',
        'Sarkar Periyapalayam',
        'Vadavalli',
        'Marudhamalai'
      ],
      'SIET-013': [
        'Main Campus',
        'Kurumbapalayam',
        'Vilankurichi',
        'Coimbatore Medical College',
        'Variety Hall Road',
        'Big Bazaar'
      ],
      'SIET-014': [
        'Main Campus',
        'Tidel Park',
        'IT Park',
        'Kalapatti',
        'Fun Mall',
        'Codissia'
      ],
      'SIET-015': [
        'Main Campus',
        'Singanallur',
        'Hopes College',
        'Peelamedu',
        'Brookefields',
        'Avinashi Road'
      ],
      'SIET-016': [
        'Main Campus',
        'Selvapuram',
        'Siddhapudur',
        'Gandhipuram',
        'Cross Cut Road',
        'Oppanakara Street'
      ],
      'SIET-017': [
        'Main Campus',
        'Vadavalli',
        'Chinnapalayam',
        'Marudhamalai Road',
        'Thondamuthur',
        'Siruvani'
      ],
      'SIET-018': [
        'Main Campus',
        'Karamadai',
        'Mettupalayam',
        'Coimbatore Junction',
        'Railway Station',
        'Central Bus Stand'
      ],
      'SIET-019': [
        'Main Campus',
        'Ramanathapuram',
        'Saravanampatti',
        'Thudiyalur',
        'Vadavalli',
        'IT Park'
      ],
      'SIET-020': [
        'Main Campus',
        'Kovaipudur',
        'Saibaba Colony',
        'PSG Tech',
        'Peelamedu',
        'Hopes College'
      ],
      'SIET-021': [
        'Main Campus',
        'Sulur',
        'Neelambur',
        'Kalapatti',
        'IT Park',
        'Codissia Trade Fair'
      ],
      'SIET-022': [
        'Main Campus',
        'Podanur',
        'Pothanur',
        'Madukkarai',
        'Pollachi Road',
        'Kinathukadavu'
      ]
    };
    
    return routes[busNumber] || [
      'Main Campus',
      'General Route Stop 1',
      'General Route Stop 2',
      'General Route Stop 3',
      'General Route Stop 4',
      'General Route Stop 5'
    ];
  };

  const route_stops = getRouteStops(bus.number);

  const students = [
    { id: 1, name: 'Aadhya Sharma', rollNo: 'SIET2021001', pickup: 'City Center' },
    { id: 2, name: 'Arjun Patel', rollNo: 'SIET2021002', pickup: 'Railway Station' },
    { id: 3, name: 'Bhavya Singh', rollNo: 'SIET2021003', pickup: 'Bus Terminal' },
    { id: 4, name: 'Chaitanya Verma', rollNo: 'SIET2021004', pickup: 'City Center' },
    { id: 5, name: 'Diya Agarwal', rollNo: 'SIET2021005', pickup: 'Railway Station' },
    { id: 6, name: 'Eshaan Gupta', rollNo: 'SIET2021006', pickup: 'Bus Terminal' },
    { id: 7, name: 'Falguni Joshi', rollNo: 'SIET2021007', pickup: 'City Center' },
    { id: 8, name: 'Gaurav Kumar', rollNo: 'SIET2021008', pickup: 'Railway Station' },
    { id: 9, name: 'Harshita Yadav', rollNo: 'SIET2021009', pickup: 'Bus Terminal' },
    { id: 10, name: 'Ishaan Mishra', rollNo: 'SIET2021010', pickup: 'City Center' },
  ].slice(0, Math.min(bus.studentsCount, 10)); // Show first 10 students

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
            <Text style={styles.statNumber}>{bus.studentsCount}</Text>
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
            <Text style={styles.sectionTitle}>Students ({bus.studentsCount})</Text>
            {students.length < bus.studentsCount && (
              <Text style={styles.viewAllText}>Showing {students.length} of {bus.studentsCount}</Text>
            )}
          </View>
          {students.map((student) => (
            <View key={student.id} style={styles.studentItem}>
              <View style={styles.studentAvatar}>
                <Ionicons name="person" size={20} color={COLORS.white} />
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentRoll}>{student.rollNo}</Text>
              </View>
              <View style={styles.pickupInfo}>
                <Ionicons name="location-outline" size={16} color={COLORS.gray} />
                <Text style={styles.pickupText}>{student.pickup}</Text>
              </View>
            </View>
          ))}
          {students.length < bus.studentsCount && (
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllButtonText}>View All Students</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('BusLiveTracking', { bus: bus })}
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
