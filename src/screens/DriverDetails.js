import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const DriverDetails = ({ route, navigation }) => {
  const { driver } = route.params;

  const getStatusColor = (status) => {
    return status === 'Active' ? COLORS.success : COLORS.danger;
  };

  const getAuthColor = (authenticated) => {
    return authenticated ? COLORS.success : COLORS.warning;
  };

  const renderOptionalInfo = (label, value, fallback = null) => {
    if (!value && fallback === null) {
      return null;
    }

    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || fallback}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Driver Info Card */}
        <View style={styles.driverInfoCard}>
          <View style={styles.driverHeader}>
            <View style={styles.driverAvatar}>
              {driver?.avatar ? (
                <Image source={{ uri: driver.avatar }} style={styles.driverAvatarImage} />
              ) : (
                <Ionicons name="person" size={40} color={COLORS.white} />
              )}
            </View>
            <View style={styles.driverMainInfo}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <Text style={styles.busNumber}>Bus: {driver.busNumber}</Text>
              <Text style={styles.phoneNumber}>Phone: {driver.phone}</Text>
              <View style={styles.badgeContainer}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driver.status) }]}>
                  <Text style={styles.statusText}>{driver.status}</Text>
                </View>
                <View style={[styles.authBadge, { backgroundColor: getAuthColor(driver.authenticated) }]}>
                  <Text style={styles.authText}>
                    {driver.authenticated ? "Authenticated" : "Not Authenticated"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Driver Details</Text>
          {renderOptionalInfo('Email', driver.email)}
          {renderOptionalInfo('License Number', driver.licenseNumber)}
          {renderOptionalInfo('Address', driver.address)}
          {renderOptionalInfo('Emergency Contact', driver.emergencyContact)}
          {renderOptionalInfo('Last Login', driver.lastLogin, 'Never')}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="call" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Call Driver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: COLORS.warning }]}>
            <Ionicons name="create" size={20} color={COLORS.white} />
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
  driverInfoCard: {
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
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  driverAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  driverMainInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  busNumber: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 3,
  },
  phoneNumber: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 10,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  authBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  authText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  infoLabel: {
    fontSize: 16,
    color: COLORS.gray,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginLeft: 16,
    flexShrink: 1,
    textAlign: 'right',
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

export default DriverDetails;
