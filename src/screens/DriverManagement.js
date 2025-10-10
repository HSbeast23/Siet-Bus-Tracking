import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const { width } = Dimensions.get('window');

const DriverManagement = ({ navigation, route }) => {
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState({ total: 0, active: 0, authenticated: 0 });

  // Get params from navigation (for Co-Admin filtering)
  const { busId: filterBusId, role } = route.params || {};
  const isCoAdmin = role === 'coadmin';

  useEffect(() => {
    loadDriverData();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [searchQuery]);

  const loadDriverData = async () => {
    try {
      setLoading(true);
      console.log(`🔍 [DRIVER MGMT] Loading drivers... Role: ${role}, Filter Bus ID: ${filterBusId}, Is Co-Admin: ${isCoAdmin}`);
      
      let allDrivers = await registeredUsersStorage.getAllDrivers();
      console.log(`📦 [DRIVER MGMT] Total drivers from Firebase: ${allDrivers.length}`);
      
      // Log all driver bus numbers to debug
      if (allDrivers.length > 0) {
        console.log(`� [DRIVER MGMT] Driver bus numbers:`, allDrivers.map(d => d.busNumber));
      }
      
      // �🔒 Filter for Co-Admin: Show ONLY their assigned bus driver
      if (isCoAdmin && filterBusId) {
        console.log(`🔒 [DRIVER MGMT] Applying Co-Admin filter for bus: ${filterBusId}`);
        allDrivers = allDrivers.filter(driver => {
          const match = driver.busNumber === filterBusId;
          if (!match) {
            console.log(`   ❌ Driver ${driver.name} (${driver.busNumber}) doesn't match ${filterBusId}`);
          } else {
            console.log(`   ✅ Driver ${driver.name} (${driver.busNumber}) matches ${filterBusId}`);
          }
          return match;
        });
        console.log(`✅ [DRIVER MGMT] Co-Admin filter result: ${allDrivers.length} driver(s) for ${filterBusId}`);
      }
      
      const stats = await registeredUsersStorage.getDriverStats();
      
      setDrivers(allDrivers);
      setDriverStats(stats);
      setLoading(false);
    } catch (error) {
      console.error('❌ [DRIVER MGMT] Error loading driver data:', error);
      setLoading(false);
    }
  };

  const filterDrivers = async () => {
    try {
      let allDrivers = await registeredUsersStorage.getAllDrivers();
      
      // 🔒 Filter for Co-Admin: Show ONLY their assigned bus driver
      if (isCoAdmin && filterBusId) {
        allDrivers = allDrivers.filter(driver => driver.busNumber === filterBusId);
      }
      
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
        <Text style={styles.headerTitle}>
          {isCoAdmin ? `Driver Management - ${filterBusId}` : 'Driver Management'}
        </Text>
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    justifyContent: 'space-around',
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.xs,
    ...SHADOWS.sm,
  },
  summaryNumber: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.secondary,
    marginLeft: SPACING.sm,
  },
  driversList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  driverCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  driverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  busNumber: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 2,
  },
  phoneNumber: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 1,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: SPACING.sm,
  },
  authText: {
    color: COLORS.white,
    fontSize: 9,
    fontFamily: FONTS.semiBold,
    marginLeft: 2,
  },
  driverCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  lastLoginInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastLoginText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginLeft: SPACING.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    margin: SPACING.lg,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    marginLeft: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: SPACING.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.gray,
    marginTop: SPACING.md,
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.lightGray,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 1,
  },
  licenseText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginTop: 1,
  },
});

export default DriverManagement;
