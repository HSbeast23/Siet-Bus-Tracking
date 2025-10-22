import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const getStatusColor = (status) => (status === 'Active' ? COLORS.success : COLORS.danger);
const getAuthColor = (authenticated) => (authenticated ? COLORS.success : COLORS.warning);

const DriverManagement = ({ navigation, route }) => {
  const [drivers, setDrivers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState({ total: 0, active: 0, authenticated: 0 });
  const [refreshing, setRefreshing] = useState(false);

  // Get params from navigation (for Bus Incharge filtering)
  const { busId: filterBusId, role } = route.params || {};
  const isCoAdmin = role === 'coadmin';

  const loadDriverData = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      const fetchedDrivers = await registeredUsersStorage.getAllDrivers();

      const stats = fetchedDrivers.reduce(
        (acc, driver) => {
          acc.total += 1;
          if ((driver.status || '').toLowerCase() === 'active') {
            acc.active += 1;
          }
          if (driver.authenticated) {
            acc.authenticated += 1;
          }
          return acc;
        },
        { total: 0, active: 0, authenticated: 0 }
      );

      setDrivers(fetchedDrivers);
      setDriverStats(stats);
    } catch (error) {
      console.error('❌ [DRIVER MGMT] Error loading driver data:', error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDriverData();
  }, [loadDriverData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDriverData(false);
  }, [loadDriverData]);

  const filteredDrivers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return drivers.filter((driver) => {
      if (isCoAdmin && filterBusId && driver.busNumber !== filterBusId) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [driver.name, driver.busNumber, driver.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [drivers, searchQuery, isCoAdmin, filterBusId]);

  const handleDriverPress = useCallback(
    (driver) => {
      navigation.navigate('DriverDetails', { driver });
    },
    [navigation]
  );

  const keyExtractor = useCallback((item) => {
    return (
      item.id?.toString() ||
      item.userId?.toString() ||
      item.email ||
      `${item.busNumber || 'bus'}-${item.phone || item.name}`
    );
  }, []);

  const renderDriverItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.driverCard}
        onPress={() => handleDriverPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.driverCardHeader}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.driverAvatarImage} />
              ) : (
                <Ionicons name="person" size={24} color={COLORS.white} />
              )}
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{item.name}</Text>
              <Text style={styles.busNumber}>{item.busNumber}</Text>
              <Text style={styles.phoneNumber}>{item.phone}</Text>
              {item.email ? <Text style={styles.emailText}>{item.email}</Text> : null}
              {item.licenseNumber ? (
                <Text style={styles.licenseText}>License: {item.licenseNumber}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <View style={[styles.authBadge, { backgroundColor: getAuthColor(item.authenticated) }]}>
              <Ionicons
                name={item.authenticated ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={COLORS.white}
              />
              <Text style={styles.authText}>{item.authenticated ? 'Auth' : 'Not Auth'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.driverCardFooter}>
          <View style={styles.lastLoginInfo}>
            <Ionicons name="time" size={14} color={COLORS.gray} />
            <Text style={styles.lastLoginText}>Last Login: {item.lastLogin || 'Never'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
        </View>
      </TouchableOpacity>
    ),
    [handleDriverPress]
  );

  const listHeaderComponent = useMemo(
    () => <Text style={styles.sectionTitle}>All Drivers ({filteredDrivers.length})</Text>,
    [filteredDrivers.length]
  );

  const emptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="people" size={64} color={COLORS.lightGray} />
        <Text style={styles.emptyText}>No drivers found</Text>
        <Text style={styles.emptySubText}>
          {searchQuery ? 'Try adjusting your search criteria' : 'No drivers have been registered yet'}
        </Text>
      </View>
    ),
    [searchQuery]
  );

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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading drivers...</Text>
        </View>
      ) : (
        <FlatList
          style={styles.driversList}
          contentContainerStyle={styles.listContent}
          data={filteredDrivers}
          renderItem={renderDriverItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={emptyComponent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
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
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
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
  driverAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.xl,
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
