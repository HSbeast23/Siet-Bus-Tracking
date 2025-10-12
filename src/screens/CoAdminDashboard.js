import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';

const CoAdminDashboard = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('❌ [CO-ADMIN] Failed to load user profile:', error);
      Alert.alert('Error', 'Unable to load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
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
          onPress: async () => {
            await authService.logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Welcome' }],
            });
          },
        },
      ]
    );
  };

  // 🔥 Dynamic navigation tools based on user's assigned bus (NOT HARDCODED)
  const getNavigationTools = () => {
    const userBusId = user?.busId || 'Unknown';
    
    return [
      {
        title: 'Bus Management',
        subtitle: `View and manage ${userBusId} bus only`,
        icon: 'bus',
        color: '#8B4513',
        screen: 'BusManagement',
        params: { busId: userBusId, role: 'coadmin' }
      },
      {
        title: 'Driver Management',
        subtitle: `View ${userBusId} driver only`,
        icon: 'person-circle',
        color: '#2E7D32',
        screen: 'DriverManagement',
        params: { busId: userBusId, role: 'coadmin' }
      },
      {
        title: 'Student Management',
        subtitle: `Manage ${userBusId} students only`,
        icon: 'school',
        color: COLORS.secondary,
        screen: 'StudentManagement',
        params: { busId: userBusId, role: 'coadmin' }
      },
      {
        title: 'Attendance View',
        subtitle: 'Mark daily attendance',
        icon: 'checkmark-done-circle',
        color: COLORS.success,
        screen: 'AttendanceView',
        params: { busId: userBusId }
      },
      {
        title: 'Attendance History',
        subtitle: 'View attendance records',
        icon: 'calendar',
        color: COLORS.info,
        screen: 'CoAdminAttendanceHistory',
        params: { busId: userBusId }
      },
      {
        title: 'Reports',
        subtitle: 'View student reports',
        icon: 'document-text',
        color: COLORS.warning,
        screen: 'CoAdminReportScreen',
        params: { busId: userBusId }
      },
      {
        title: 'Bus Route Map',
        subtitle: `View ${userBusId} route`,
        icon: 'map',
        color: COLORS.danger,
        screen: 'MapScreen',
        params: { busId: userBusId }
      },
    ];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B4513']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome</Text>
            <Text style={styles.userName}>{user?.name || 'Co-Admin'}</Text>
            <Text style={styles.userRole}>
              {user?.userId || 'Coadmin'} • Bus: {user?.busId || 'N/A'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* Co-Admin Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coordinator Tools</Text>
          <Text style={styles.sectionSubtitle}>
            Manage {user?.busId || 'your assigned'} bus operations
          </Text>
        </View>

        {/* Navigation Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.toolsContainer}>
            {getNavigationTools().map((tool, index) => (
              <TouchableOpacity
                key={index}
                style={styles.toolCard}
                onPress={() => navigation.navigate(tool.screen, tool.params)}
                activeOpacity={0.8}
              >
                <View style={[styles.toolIconContainer, { backgroundColor: tool.color }]}>
                  <Ionicons name={tool.icon} size={28} color={COLORS.white} />
                </View>
                <View style={styles.toolTextContainer}>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
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
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    ...SHADOWS.sm,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  userRole: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.secondary,
    marginTop: SPACING.xs,
  },
  logoutButton: {
    padding: SPACING.sm,
    marginTop: -SPACING.sm,
    alignSelf: 'flex-start',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  toolsContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  toolCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  toolIconContainer: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  toolTextContainer: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  toolSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
});

export default CoAdminDashboard;
