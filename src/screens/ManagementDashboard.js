import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { busStorage } from '../services/storage';
import { registeredUsersStorage } from '../services/registeredUsersStorage';
import { authService } from '../services/authService';

const ManagementDashboard = ({ navigation }) => {
  const [stats, setStats] = useState({
    totalBuses: 22,
    activeBuses: 0,
    totalDrivers: 0,
    totalStudents: 0
  });

  const [adminInfo, setAdminInfo] = useState({
    name: 'Administrator',
    role: 'Admin'
  });

  useEffect(() => {
    loadAdminInfo();
    loadRealStats();
    checkActiveBuses();
    const interval = setInterval(checkActiveBuses, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAdminInfo = async () => {
    try {
      // Check if there's an authenticated user
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setAdminInfo({
          name: currentUser.name || 'Administrator',
          role: currentUser.role === 'driver' ? 'Driver Admin' : 
                currentUser.role === 'student' ? 'Student Admin' : 'Administrator'
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

  const checkActiveBuses = async () => {
    try {
      // In real app, this would check all bus locations from API
      const busLocationData = await busStorage.getLastLocation();
      let activeBusCount = 0;
      
      if (busLocationData) {
        // Check if location is recent (within last 5 minutes)
        const lastUpdate = new Date(busLocationData.timestamp);
        const now = new Date();
        const diffMinutes = (now - lastUpdate) / (1000 * 60);
        
        if (diffMinutes <= 5) {
          activeBusCount = 1; // In real app, count all active buses
        }
      }
      
      setStats(prev => ({ ...prev, activeBuses: activeBusCount }));
    } catch (error) {
      console.error('Error checking active buses:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => navigation.navigate('Welcome')
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
      title: 'Driver Management',
      description: 'Manage driver profiles and assignments',
      icon: 'people',
      color: COLORS.success,
      onPress: () => navigation.navigate('DriverManagement')
    },
    {
      title: 'Reports & Analytics',
      description: 'View performance reports and analytics',
      icon: 'analytics',
      color: COLORS.warning,
      onPress: () => navigation.navigate('ReportsAnalytics')
    },
    {
      title: 'Live Map View',
      description: 'Track all buses in real-time',
      icon: 'map',
      color: COLORS.danger,
      onPress: () => navigation.navigate('MapScreen')
    },
    {
      title: 'Student Management',
      description: 'Manage student registrations',
      icon: 'school',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('StudentManagement')
    },
    {
      title: 'Route Management',
      description: 'Configure bus routes and stops',
      icon: 'location',
      color: COLORS.primary,
      onPress: () => navigation.navigate('RouteManagement')
    },
    {
      title: 'Settings',
      description: 'App settings and configuration',
      icon: 'settings',
      color: COLORS.gray,
      onPress: () => alert('Settings - Coming Soon!')
    },
    {
      title: 'Logout',
      description: 'Sign out from management panel',
      icon: 'log-out',
      color: COLORS.danger,
      onPress: () => {
        userStorage.clearUser();
        navigation.replace('Welcome');
      }
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.adminText}>{adminInfo.name}</Text>
          <Text style={styles.roleText}>{adminInfo.role}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.statNumber}>{stats.totalBuses}</Text>
              <Text style={styles.statLabel}>Total Buses</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: COLORS.accent }]}>
              <Text style={styles.statNumber}>{stats.activeBuses}</Text>
              <Text style={styles.statLabel}>Active Buses</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: COLORS.secondary }]}>
              <Text style={styles.statNumber}>{stats.totalDrivers}</Text>
              <Text style={styles.statLabel}>Total Drivers</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: COLORS.warning }]}>
              <Text style={styles.statNumber}>{stats.totalStudents}</Text>
              <Text style={styles.statLabel}>Total Students</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Management Tools</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={24} color={COLORS.white} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  adminText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  roleText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  logoutButton: {
    padding: 10,
  },
  statsContainer: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 5,
    textAlign: 'center',
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
});

export default ManagementDashboard;
