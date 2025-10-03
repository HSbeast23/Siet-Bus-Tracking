import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { userStorage } from '../services/storage';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const { width } = Dimensions.get('window');

const DriverManagement = ({ navigation }) => {
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState({ total: 0, active: 0, authenticated: 0 });

  useEffect(() => {
    loadDriverData();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [searchQuery]);

  const loadDriverData = async () => {
    try {
      setLoading(true);
      const allDrivers = await registeredUsersStorage.getAllDrivers();
      const stats = await registeredUsersStorage.getDriverStats();
      
      setDrivers(allDrivers);
      setDriverStats(stats);
      setLoading(false);
    } catch (error) {
      console.error('Error loading driver data:', error);
      setLoading(false);
    }
  };

  const filterDrivers = async () => {
    try {
      const allDrivers = await registeredUsersStorage.getAllDrivers();
      const filtered = allDrivers.filter(driver => 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setDrivers(filtered);
    } catch (error) {
      console.error('Error filtering drivers:', error);
    }
  };

  const handleDriverPress = (driver) => {
    navigation.navigate('DriverDetails', { driver });
  };

  const getStatusColor = (status) => {
    return status === 'Active' ? COLORS.success : COLORS.danger;
  };

  const getAuthColor = (authenticated) => {
    return authenticated ? COLORS.success : COLORS.warning;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Management</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{driverStats.total}</Text>
          <Text style={styles.summaryLabel}>Total Drivers</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
            {driverStats.authenticated}
          </Text>
          <Text style={styles.summaryLabel}>Authenticated</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: COLORS.success }]}>
            {driverStats.active}
          </Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search drivers or bus numbers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.gray}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Drivers List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading drivers...</Text>
        </View>
      ) : (
        <ScrollView style={styles.driversList} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>All Drivers ({drivers.length})</Text>
          {drivers.length > 0 ? (
            drivers.map((driver) => (
              <TouchableOpacity
                key={driver.id}
                style={styles.driverCard}
                onPress={() => handleDriverPress(driver)}
                activeOpacity={0.7}
              >
                <View style={styles.driverCardHeader}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <Ionicons name="person" size={24} color={COLORS.white} />
                    </View>
                    <View style={styles.driverDetails}>
                      <Text style={styles.driverName}>{driver.name}</Text>
                      <Text style={styles.busNumber}>{driver.busNumber}</Text>
                      <Text style={styles.phoneNumber}>{driver.phone}</Text>
                      {driver.email && (
                        <Text style={styles.emailText}>{driver.email}</Text>
                      )}
                      {driver.licenseNumber && (
                        <Text style={styles.licenseText}>License: {driver.licenseNumber}</Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driver.status) }]}>
                      <Text style={styles.statusText}>{driver.status}</Text>
                    </View>
                    <View style={[styles.authBadge, { backgroundColor: getAuthColor(driver.authenticated) }]}>
                      <Ionicons 
                        name={driver.authenticated ? "checkmark-circle" : "alert-circle"} 
                        size={16} 
                        color={COLORS.white} 
                      />
                      <Text style={styles.authText}>
                        {driver.authenticated ? "Auth" : "Not Auth"}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.driverCardFooter}>
                  <View style={styles.lastLoginInfo}>
                    <Ionicons name="time" size={14} color={COLORS.gray} />
                    <Text style={styles.lastLoginText}>
                      Last Login: {driver.lastLogin || 'Never'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={64} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No drivers found</Text>
              <Text style={styles.emptySubText}>
                {searchQuery ? 'Try adjusting your search criteria' : 'No drivers have been registered yet'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Driver Button */}
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={24} color={COLORS.white} />
        <Text style={styles.addButtonText}>Add New Driver</Text>
      </TouchableOpacity>
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'space-around',
  },
  summaryCard: {
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
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.secondary,
    marginLeft: 10,
  },
  driversList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  driverCard: {
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
  driverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  busNumber: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  phoneNumber: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 1,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 5,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  authText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  driverCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  lastLoginInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastLoginText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    margin: 20,
    borderRadius: 12,
    paddingVertical: 15,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.gray,
    marginTop: 15,
    fontWeight: 'bold',
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.lightGray,
    marginTop: 5,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 1,
  },
  licenseText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 1,
  },
});

export default DriverManagement;
