import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent } from '../components/ui/Card';
import { authService } from '../services/authService';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../utils/constants';

const ManagementDashboard = ({ navigation }) => {
  const [adminInfo, setAdminInfo] = useState({
    name: 'Administrator',
    role: 'Management',
  });

  const loadAdminInfo = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        return;
      }

      const normalizedRole = (currentUser.role || '').toLowerCase();
      const roleLabel =
        normalizedRole === 'management'
          ? 'Management'
          : normalizedRole === 'driver'
            ? 'Driver Admin'
            : normalizedRole === 'student'
              ? 'Student Admin'
              : 'Administrator';

      const displayName = currentUser.name?.trim() || 'Administrator';

      setAdminInfo({
        name: displayName,
        role: roleLabel,
      });
    } catch (error) {
      console.error('Error loading admin info:', error);
    }
  }, []);

  useEffect(() => {
    loadAdminInfo();
  }, [loadAdminInfo]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          navigation.replace('Welcome');
        },
      },
    ]);
  };

  const menuItems = [
    {
      title: 'Bus Management',
      description: 'View and manage all buses',
      icon: 'bus',
      color: COLORS.primary,
      onPress: () => navigation.navigate('BusManagement'),
    },
    {
      title: 'Bus Incharge Management',
      description: 'Monitor bus incharge assignments and bus coverage',
      icon: 'shield-checkmark',
      color: COLORS.info,
      onPress: () => navigation.navigate('CoAdminManagement'),
    },
    {
      title: 'Driver Management',
      description: 'Manage driver profiles and assignments',
      icon: 'people',
      color: COLORS.success,
      onPress: () => navigation.navigate('DriverManagement'),
    },
    {
      title: 'Student Management',
      description: 'Manage student registrations',
      icon: 'school',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('StudentManagement'),
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
              role: 'management',
            });
          },
        });
      },
    },
    {
      title: 'Route Management',
      description: 'Configure bus routes and stops',
      icon: 'location',
      color: COLORS.primary,
      onPress: () => navigation.navigate('RouteManagement'),
    },
    {
      title: 'Reports',
      description: 'Review submitted reports and follow-ups',
      icon: 'document-text',
      color: COLORS.warning,
      onPress: () => navigation.navigate('Reports'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Management Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.greetingCard}>
            <Text style={styles.greetingLabel}>Welcome,</Text>
            <Text style={styles.greetingName}>{adminInfo.name}</Text>
            {adminInfo.role && <Text style={styles.greetingRole}>{adminInfo.role}</Text>}
          </View>

          <View style={styles.menuContainer}>
            <Text style={styles.sectionTitle}>Management Tools</Text>
            {menuItems.map((item) => (
              <Card key={item.title} onPress={item.onPress} style={styles.menuCard}>
                <CardContent>
                  <View style={styles.menuItem}>
                    <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                      <Ionicons name={item.icon} size={22} color={COLORS.white} />
                    </View>
                    <View style={styles.menuContent}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      <Text style={styles.menuSubtitle}>{item.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  greetingCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  greetingLabel: {
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    fontSize: 14,
  },
  greetingName: {
    marginTop: 4,
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.black,
  },
  greetingRole: {
    marginTop: 6,
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.secondary,
  },
  menuContainer: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  menuCard: {
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.black,
  },
  menuSubtitle: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.gray,
  },
});

export default ManagementDashboard;
