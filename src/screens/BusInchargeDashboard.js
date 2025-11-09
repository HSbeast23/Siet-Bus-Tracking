import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { authService } from '../services/authService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { normalizeBusNumber } from '../services/locationService';
import BusInchargeBottomNav from '../components/BusInchargeBottomNav';
import { registerPushTokenAsync } from '../services/pushNotificationService';

const BusInchargeDashboard = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalStudents: 0 });

  const loadDashboardData = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) {
        setLoading(true);
      }

      try {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          Alert.alert('Session Expired', 'Please login again to continue.', [
            {
              text: 'Login',
              onPress: () =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                }),
            },
          ]);
          setUser(null);
          setStats({ totalStudents: 0 });
          return;
        }

        setUser(currentUser);

        try {
          await registerPushTokenAsync({
            ...currentUser,
            role: currentUser.role || 'coadmin',
          });
        } catch (tokenError) {
          console.warn('Bus incharge push token registration failed:', tokenError);
        }

        const resolvedBusId = normalizeBusNumber(
          currentUser.busId || currentUser.busNumber || ''
        );

        if (!resolvedBusId) {
          setStats({ totalStudents: 0 });
          return;
        }

        const usersRef = collection(db, 'users');
        let studentsSnapshot = await getDocs(
          query(usersRef, where('busNumber', '==', resolvedBusId))
        );

        if (studentsSnapshot.empty) {
          studentsSnapshot = await getDocs(
            query(usersRef, where('busNo', '==', resolvedBusId))
          );
        }

        const totalStudents = studentsSnapshot.docs.filter((docSnap) => {
          const data = docSnap.data();
          const role = (data.role || '').toLowerCase();
          const status = (data.status || '').toLowerCase();
          return role === 'student' && status !== 'inactive';
        }).length;

        setStats({ totalStudents });
      } catch (error) {
  console.error('Error loading bus incharge dashboard:', error);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [navigation]
  );

  useEffect(() => {
    loadDashboardData(true);
    const unsubscribe = navigation.addListener('focus', () => loadDashboardData(false));
    return unsubscribe;
  }, [navigation, loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData(false);
    setRefreshing(false);
  }, [loadDashboardData]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);
  }, [navigation]);

  const coordinatorTools = useMemo(() => {
    const userBusId = normalizeBusNumber(user?.busId || user?.busNumber || '');

    return [
      {
        key: 'bus',
        title: 'Bus Management',
        subtitle: userBusId
          ? `View and manage ${userBusId}`
          : 'View assigned bus',
        icon: 'bus',
        color: '#8B4513',
        onPress: () =>
          navigation.navigate('BusManagement', { busId: userBusId, role: 'coadmin' }),
      },
      {
        key: 'driver',
        title: 'Driver Management',
        subtitle: userBusId
          ? `View ${userBusId} driver`
          : 'View assigned driver',
        icon: 'person-circle',
        color: COLORS.success,
        onPress: () =>
          navigation.navigate('DriverManagement', { busId: userBusId, role: 'coadmin' }),
      },
      {
        key: 'students',
        title: 'Student Management',
        subtitle: userBusId
          ? `Manage ${userBusId} students`
          : 'Manage assigned students',
        icon: 'school',
        color: COLORS.secondary,
        onPress: () =>
          navigation.navigate('StudentManagement', { busId: userBusId, role: 'coadmin' }),
      },
      {
        key: 'attendance',
        title: 'Attendance',
        subtitle: 'Mark daily attendance',
        icon: 'checkmark-done-circle',
        color: COLORS.info,
        onPress: () => navigation.navigate('AttendanceView', { busId: userBusId }),
      },
      {
        key: 'reports',
        title: 'Reports',
        subtitle: 'View student reports',
        icon: 'document-text',
        color: COLORS.warning,
        onPress: () =>
          navigation.navigate('BusInchargeReportScreen', { busId: userBusId }),
      },
      {
        key: 'map',
        title: 'Route Map',
        subtitle: userBusId ? `Track ${userBusId}` : 'Track assigned bus',
        icon: 'map',
        color: COLORS.danger,
        onPress: () =>
          navigation.navigate('MapScreen', { busId: userBusId, role: 'coadmin' }),
      },
    ];
  }, [navigation, user]);

  const normalizedBusId = normalizeBusNumber(user?.busId || user?.busNumber || '');
  const greetingMeta = useMemo(() => {
    const parts = [
      normalizedBusId ? `Bus ${normalizedBusId}` : null,
      stats.totalStudents ? `${stats.totalStudents} active students` : null,
    ].filter(Boolean);

    return parts.length ? parts.join(' • ') : 'Manage your assigned operations';
  }, [normalizedBusId, stats.totalStudents]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Bus Incharge Dashboard</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderLabel}>Loading your dashboard…</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
          >
            <View style={styles.greetingCard}>
              <Text style={styles.greetingLabel}>Welcome,</Text>
              <Text style={styles.greetingName}>{user?.name || 'Bus Incharge'}</Text>
              <Text style={styles.greetingMeta}>{greetingMeta}</Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Coordinator Tools</Text>
              <Text style={styles.sectionSubtitle}>
                Manage {normalizedBusId || 'your assigned'} bus operations
              </Text>
            </View>

            <View style={styles.toolsContainer}>
              {coordinatorTools.map((tool) => (
                <TouchableOpacity
                  key={tool.key}
                  style={styles.toolCard}
                  onPress={tool.onPress}
                  activeOpacity={0.85}
                >
                  <View style={[styles.toolIcon, { backgroundColor: tool.color }]}>
                    <Ionicons name={tool.icon} size={22} color={COLORS.white} />
                  </View>
                  <View style={styles.toolContent}>
                    <Text style={styles.toolTitle}>{tool.title}</Text>
                    <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <BusInchargeBottomNav
          activeTab="home"
          navigation={navigation}
          busId={normalizedBusId}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  headerButton: {
    marginLeft: 12,
    padding: 6,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderLabel: {
    marginTop: 12,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.lg,
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
  greetingMeta: {
    marginTop: 6,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
  sectionHeader: {
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.black,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.gray,
  },
  toolsContainer: {
    gap: 12,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...SHADOWS.sm,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.black,
  },
  toolSubtitle: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.gray,
  },
});

export default BusInchargeDashboard;
