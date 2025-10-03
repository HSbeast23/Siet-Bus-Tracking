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
import { COLORS, SAMPLE_STOPS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BusManagement = ({ navigation }) => {
  // Mock data for 22 buses
  const [buses] = useState([
    { id: 1, number: 'SIET-001', driver: 'Rajesh Kumar', status: 'Active', studentsCount: 45 },
    { id: 2, number: 'SIET-002', driver: 'Suresh Babu', status: 'Inactive', studentsCount: 38 },
    { id: 3, number: 'SIET-003', driver: 'Ramesh Chandra', status: 'Active', studentsCount: 42 },
    { id: 4, number: 'SIET-004', driver: 'Ganesh Patel', status: 'Inactive', studentsCount: 35 },
    { id: 5, number: 'SIET-005', driver: 'Mahesh Singh', status: 'Active', studentsCount: 40 },
    { id: 6, number: 'SIET-006', driver: 'Naresh Gupta', status: 'Inactive', studentsCount: 33 },
    { id: 7, number: 'SIET-007', driver: 'Dinesh Sharma', status: 'Active', studentsCount: 48 },
    { id: 8, number: 'SIET-008', driver: 'Ritesh Jain', status: 'Inactive', studentsCount: 30 },
    { id: 9, number: 'SIET-009', driver: 'Lokesh Agarwal', status: 'Active', studentsCount: 44 },
    { id: 10, number: 'SIET-010', driver: 'Mukesh Verma', status: 'Inactive', studentsCount: 36 },
    { id: 11, number: 'SIET-011', driver: 'Hitesh Yadav', status: 'Active', studentsCount: 41 },
    { id: 12, number: 'SIET-012', driver: 'Jitesh Mishra', status: 'Inactive', studentsCount: 34 },
    { id: 13, number: 'SIET-013', driver: 'Kailash Tiwari', status: 'Active', studentsCount: 43 },
    { id: 14, number: 'SIET-014', driver: 'Nilesh Pandey', status: 'Inactive', studentsCount: 37 },
    { id: 15, number: 'SIET-015', driver: 'Paresh Dubey', status: 'Active', studentsCount: 46 },
    { id: 16, number: 'SIET-016', driver: 'Umesh Saxena', status: 'Inactive', studentsCount: 32 },
    { id: 17, number: 'SIET-017', driver: 'Yogesh Srivastava', status: 'Active', studentsCount: 39 },
    { id: 18, number: 'SIET-018', driver: 'Ashok Tripathi', status: 'Inactive', studentsCount: 31 },
    { id: 19, number: 'SIET-019', driver: 'Vinod Shukla', status: 'Active', studentsCount: 47 },
    { id: 20, number: 'SIET-020', driver: 'Pramod Dwivedi', status: 'Inactive', studentsCount: 29 },
    { id: 21, number: 'SIET-021', driver: 'Amod Ojha', status: 'Active', studentsCount: 45 },
    { id: 22, number: 'SIET-022', driver: 'Subodh Bhatt', status: 'Inactive', studentsCount: 38 }
  ]);

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
        <View style={styles.placeholder} />
      </View>

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
          <Text style={[styles.summaryNumber, { color: COLORS.danger }]}>
            {buses.filter(bus => bus.status === 'Inactive').length}
          </Text>
          <Text style={styles.summaryLabel}>Inactive</Text>
        </View>
      </View>

      <ScrollView style={styles.busList} showsVerticalScrollIndicator={false}>
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
                  <Ionicons name="bus" size={30} color={COLORS.primary} />
                </View>
                <View style={styles.busDetails}>
                  <Text style={styles.busNumber}>{bus.number}</Text>
                  <Text style={styles.driverName}>Driver: {bus.driver}</Text>
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
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </View>
          </TouchableOpacity>
        ))}
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
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    margin: 20,
    padding: 20,
    borderRadius: 15,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
  },
  busList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  busCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  busInfo: {
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
  busDetails: {
    flex: 1,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  driverName: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  busCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentCount: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 5,
  },
});

export default BusManagement;
