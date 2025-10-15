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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { normalizeBusNumber } from '../services/locationService';

const CoAdminDashboard = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    busStatus: 'Inactive'
  });

  useEffect(() => {
    loadUserData();
    loadBusStats();
  }, []);

  const loadUserData = async () => {
    const currentUser = await authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  };

  const loadBusStats = async () => {
    try {
      setLoading(true);
      
      // 🔥 Get busId from logged-in user (NOT HARDCODED)
      const currentUser = await authService.getCurrentUser();
      if (!currentUser || !currentUser.busId) {
        console.error('❌ [CO-ADMIN] No busId found in user profile');
        Alert.alert('Error', 'Bus information not found. Please contact management.');
        setLoading(false);
        return;
      }
      
      const busId = normalizeBusNumber(currentUser.busId || currentUser.busNumber || '');
      console.log(`🔥 [CO-ADMIN] Loading stats for bus: ${busId}`);

      // Get students count for this specific bus only
      const usersRef = collection(db, 'users');
      let studentsSnapshot = await getDocs(query(usersRef, where('busNumber', '==', busId)));

      if (studentsSnapshot.empty) {
        studentsSnapshot = await getDocs(query(usersRef, where('busNo', '==', busId)));
      }

      const totalStudents = studentsSnapshot.docs.filter((docSnap) => {
        const data = docSnap.data();
        const role = (data.role || '').toLowerCase();
        const status = (data.status || '').toLowerCase();
        return role === 'student' && status !== 'inactive';
      }).length;

      console.log(`✅ [CO-ADMIN] Found ${totalStudents} students for bus ${busId}`);

      setStats({
        totalStudents,
        presentToday: 0, // Will be updated with today's attendance
        busStatus: 'Inactive'
      });
    } catch (error) {
      console.error('Error loading bus stats:', error);
      Alert.alert('Error', 'Failed to load bus statistics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await loadBusStats();
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
          <TouchableOpacity style={styles.profileIcon}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.white} />
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
            <ActivityIndicator size="large" color="#8B4513" />
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

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="bus" size={24} color="#8B4513" />
              <Text style={styles.statValue}>{user?.busId || 'N/A'}</Text>
              <Text style={styles.statLabel}>Assigned Bus</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color={COLORS.secondary} />
              <Text style={styles.statValue}>{stats.totalStudents}</Text>
              <Text style={styles.statLabel}>Active Students</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              <Text style={styles.statValue}>{stats.presentToday}</Text>
              <Text style={styles.statLabel}>Present Today</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#8B4513" />
          <Text style={styles.infoText}>
            You have access to manage Bus {user?.busId || 'N/A'} only. All management features are restricted to your assigned bus.
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

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
    backgroundColor: '#8B4513',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...SHADOWS.lg,
  },
  welcomeText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.white + 'CC',
  },
  userName: {
    fontSize: 22,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  userRole: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.white + 'EE',
    marginTop: SPACING.xs,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#8B451315',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#666',
    marginLeft: SPACING.sm,
    lineHeight: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    ...SHADOWS.sm,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.error,
    marginLeft: SPACING.sm,
  },
});

export default CoAdminDashboard;
