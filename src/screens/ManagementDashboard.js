import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent } from '../components/ui/Card';
import { registeredUsersStorage } from '../services/registeredUsersStorage';
import { authService } from '../services/authService';
import { subscribeToAllBuses } from '../services/locationService';

const ManagementDashboard = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalBuses: 0,
    activeBuses: 0,
    totalDrivers: 0,
    totalStudents: 0
  });

  const [adminInfo, setAdminInfo] = useState({
    name: 'Administrator',
    role: 'Management'
  });

  useEffect(() => {
    loadAdminInfo();
    loadRealStats();

    const unsubscribe = subscribeToAllBuses(
      (busesData) => {
        try {
          if (!Array.isArray(busesData)) {
            setStats((prev) => ({ ...prev, totalBuses: 0, activeBuses: 0 }));
            return;
          }

          const totalBuses = busesData.length;
          const activeBuses = busesData.filter((bus) => {
            if (bus.isTracking) {
              return true;
            }

            const rawLastUpdate = bus.lastUpdate || bus.lastUpdatedAt || bus.updatedAt;
            if (!rawLastUpdate) {
              return false;
            }

            const lastUpdateTime = new Date(rawLastUpdate).getTime();
            if (Number.isNaN(lastUpdateTime)) {
              return false;
            }

            const diffMinutes = (Date.now() - lastUpdateTime) / (1000 * 60);
            return diffMinutes <= 10;
          }).length;

          setStats((prev) => ({
            ...prev,
            totalBuses,
            activeBuses,
          }));
        } catch (error) {
          console.error('Error processing bus subscription data:', error);
        }
      },
      (error) => {
        console.error('Error subscribing to bus updates:', error);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loadAdminInfo = async () => {
    try {
      // Check if there's an authenticated user
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        const normalizedRole = (currentUser.role || '').toLowerCase();
        const roleLabel = normalizedRole === 'management'
          ? 'Management'
          : normalizedRole === 'driver'
            ? 'Driver Admin'
            : normalizedRole === 'student'
              ? 'Student Admin'
              : 'Administrator';

  const displayName = currentUser.name?.trim() || 'Administrator';

        setAdminInfo({
          name: displayName,
          role: roleLabel
        });
        console.log('Admin user loaded:', currentUser.name);
      }
    } catch (error) {
      console.error('Error loading admin info:', error);
      // Keep default admin info
    }
  };

  const loadRealStats = async () => {
    try {
      const driverStats = await registeredUsersStorage.getDriverStats();
      const studentStats = await registeredUsersStorage.getStudentStats();
      
      setStats(prev => ({ 
        ...prev, 
        totalDrivers: driverStats.total,
        totalStudents: studentStats.total
      }));
    } catch (error) {
      console.error('Error loading real stats:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            navigation.replace('Welcome');
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      title: 'Bus Management',
      description: 'View and manage all buses',
      icon: 'bus',
      color: COLORS.primary,
      onPress: () => navigation.navigate('BusManagement')
    },
    {
      title: 'Co-Admin Management',
      description: 'Monitor co-admin assignments and bus coverage',
      icon: 'shield-checkmark',
      color: COLORS.info,
      onPress: () => navigation.navigate('CoAdminManagement')
    },
    {
      title: 'Driver Management',
      description: 'Manage driver profiles and assignments',
      icon: 'people',
      color: COLORS.success,
      onPress: () => navigation.navigate('DriverManagement')
    },
    {
      title: 'Student Management',
      description: 'Manage student registrations',
      icon: 'school',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('StudentManagement')
    },
    {
      title: 'Live Map View',
      description: 'Track all buses in real-time',
      icon: 'map',
      color: COLORS.danger,
      onPress: () => {
        navigation.navigate('BusManagement', {
          selectMode: true,
          onBusSelect: (bus) => {
            navigation.navigate('MapScreen', {
              busId: bus.number,
              role: 'management'
            });
          }
        });
      }
    },
    {
      title: 'Route Management',
      description: 'Configure bus routes and stops',
      icon: 'location',
      color: COLORS.primary,
      onPress: () => navigation.navigate('RouteManagement')
    },
    {
      title: 'Attendance History',
      description: 'Review daily attendance for every bus',
      icon: 'calendar',
      color: COLORS.accent,
      onPress: () => navigation.navigate('ManagementAttendanceHistory')
    },
    {
      title: 'Reports',
      description: 'Review submitted reports and follow-ups',
      icon: 'document-text',
      color: COLORS.warning,
      onPress: () => navigation.navigate('Reports')
    }
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.adminText}>{adminInfo.name}</Text>
          {adminInfo.role && adminInfo.role.toLowerCase() !== adminInfo.name.toLowerCase() && (
            <Text style={styles.roleText}>{adminInfo.role}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
              <CardContent>
                <View style={styles.statContent}>
                  <Ionicons name="bus" size={32} color={COLORS.white} />
                  <Text style={styles.statNumber}>{stats.totalBuses}</Text>
                  <Text style={styles.statLabel}>Total Buses</Text>
                </View>
              </CardContent>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: COLORS.success }]}>
              <CardContent>
                <View style={styles.statContent}>
                  <Ionicons name="checkmark-circle" size={32} color={COLORS.white} />
                  <Text style={styles.statNumber}>{stats.activeBuses}</Text>
                  <Text style={styles.statLabel}>Active Now</Text>
                </View>
              </CardContent>
            </Card>
          </View>
          <View style={styles.statsRow}>
            <Card style={[styles.statCard, { backgroundColor: COLORS.accent }]}>
              <CardContent>
                <View style={styles.statContent}>
                  <Ionicons name="people" size={32} color={COLORS.white} />
                  <Text style={styles.statNumber}>{stats.totalDrivers}</Text>
                  <Text style={styles.statLabel}>Total Drivers</Text>
                </View>
              </CardContent>
            </Card>
            <Card style={[styles.statCard, { backgroundColor: COLORS.warning }]}>
              <CardContent>
                <View style={styles.statContent}>
                  <Ionicons name="school" size={32} color={COLORS.white} />
                  <Text style={styles.statNumber}>{stats.totalStudents}</Text>
                  <Text style={styles.statLabel}>Total Students</Text>
                </View>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Management Tools</Text>
          {menuItems.map((item, index) => (
            <Card
              key={index}
              onPress={item.onPress}
              style={styles.menuCard}
            >
              <CardContent>
                <View style={styles.menuItem}>
                  <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                    <Ionicons name={item.icon} size={24} color={COLORS.white} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </View>
              </CardContent>
            </Card>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.white,
    ...SHADOWS.sm,
  },
  welcomeText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  adminText: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  roleText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.secondary,
    marginTop: 2,
  },
  logoutButton: {
    padding: SPACING.sm,
    marginTop: -SPACING.sm,
    alignSelf: 'flex-start',
  },
  statsContainer: {
    padding: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  statNumber: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.white,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  menuContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  menuCard: {
    marginBottom: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  menuSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default ManagementDashboard;
