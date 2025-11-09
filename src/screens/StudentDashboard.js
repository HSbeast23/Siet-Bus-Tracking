import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/authService';
import StudentBottomNav from '../components/StudentBottomNav';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { registerPushTokenAsync } from '../services/pushNotificationService';

const QUICK_ACTIONS = [
  {
    key: 'track',
    title: 'Track Bus',
    subtitle: 'View bus location on map',
    icon: 'navigate',
    badgeColor: '#FFEED6',
    iconColor: '#F59E0B',
    action: (navigation) => navigation.navigate('MapScreen', { role: 'student' }),
  },
  {
    key: 'route',
    title: 'Bus Route',
    subtitle: 'View route map with all stops',
    icon: 'map',
    badgeColor: '#E6F7F0',
    iconColor: '#10B981',
    action: (navigation) => navigation.navigate('MapScreen', { role: 'student' }),
  },
  {
    key: 'report',
    title: 'Submit Report',
    subtitle: 'Send report to management',
    icon: 'chatbubbles',
    badgeColor: '#E0ECFF',
    iconColor: '#2563EB',
    action: (navigation) => navigation.navigate('StudentReportScreen'),
  },
  {
    key: 'history',
    title: 'Report History',
    subtitle: 'View your report responses',
    icon: 'time',
    badgeColor: '#F5E9FF',
    iconColor: '#8B5CF6',
    action: (navigation) => navigation.navigate('StudentReportHistoryScreen'),
  },
];

const StudentDashboard = ({ navigation }) => {
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadStudentData);
    loadStudentData();
    return unsubscribe;
  }, [navigation]);

  const loadStudentData = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        Alert.alert(
          'Authentication Required',
          'Please login to access the dashboard.',
          [{ text: 'Login', onPress: () => navigation.navigate('Login') }]
        );
        setLoading(false);
        return;
      }

      setStudentInfo({
        name: currentUser.name || 'Student',
        registerNumber: currentUser.registerNumber || currentUser.userId,
        department: currentUser.department || 'Department',
        year: currentUser.year || 'Year',
        busNumber: currentUser.busNumber || 'N/A',
      });

      try {
        await registerPushTokenAsync({
          ...currentUser,
          role: currentUser.role || 'student',
        });
      } catch (tokenError) {
        console.warn('Student push token registration failed:', tokenError);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading student data:', error);
      setLoading(false);
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
          onPress: async () => {
            const success = await authService.logout();
            if (success) {
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } else {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderQuickAction = (item) => (
    <TouchableOpacity
      key={item.key}
      style={styles.quickActionCard}
      activeOpacity={0.9}
      onPress={() => item.action(navigation)}
    >
      <View style={[styles.quickActionIconWrap, { backgroundColor: item.badgeColor }]}>
        <Ionicons name={item.icon} size={22} color={item.iconColor} />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{item.title}</Text>
        <Text style={styles.quickActionSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
    </TouchableOpacity>
  );

  const studentMetaLine = [studentInfo?.department, studentInfo?.year].filter(Boolean).join(', ');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Student Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingLabel}>Welcome,</Text>
              <Text style={styles.greetingName}>{studentInfo?.name}</Text>
              {studentMetaLine ? (
                <Text style={styles.greetingMeta}>{studentMetaLine}</Text>
              ) : null}
            </View>

            <View style={styles.quickActionsWrapper}>
              <Text style={styles.quickActionsTitle}>Quick Actions</Text>
              {QUICK_ACTIONS.map(renderQuickAction)}
            </View>
          </ScrollView>
        )}

        <StudentBottomNav activeTab="home" navigation={navigation} />
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONTS.medium,
    color: COLORS.gray,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 24,
    paddingTop: SPACING.lg,
  },
  greetingContainer: {
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
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.black,
    marginTop: 4,
  },
  greetingMeta: {
    fontFamily: FONTS.medium,
    color: COLORS.gray,
    marginTop: 6,
  },
  quickActionsWrapper: {
    gap: 12,
  },
  quickActionsTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.black,
    marginBottom: 4,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...SHADOWS.sm,
  },
  quickActionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.black,
  },
  quickActionSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
});

export default StudentDashboard;
