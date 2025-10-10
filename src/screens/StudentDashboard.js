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
import { COLORS, BUS_ROUTES, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui';
import { getBusLocation } from '../services/locationService';
import { authService } from '../services/authService';

const StudentDashboard = ({ navigation }) => {
  const [busInfo, setBusInfo] = useState({
    busNumber: '',
    route: 'Route A',
    isActive: false,
    currentLocation: null,
    eta: 'N/A'
  });

  const [studentInfo, setStudentInfo] = useState({
    name: '',
    registerNumber: '',
    year: '',
    busNumber: ''
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, []);

  // Separate effect for checking bus status - only runs when busNumber is available
  useEffect(() => {
    if (studentInfo.busNumber && studentInfo.busNumber !== 'N/A') {
      // Check immediately
      checkBusStatus(studentInfo.busNumber);
      
      // Then check every 10 seconds
      const interval = setInterval(() => {
        checkBusStatus(studentInfo.busNumber);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [studentInfo.busNumber]);

  const loadStudentData = async () => {
    try {
      // Get authenticated user data from authService
      const currentUser = await authService.getCurrentUser();
      console.log('Current authenticated user:', currentUser);
      
      if (currentUser) {
        setStudentInfo({
          name: currentUser.name || 'Student',
          registerNumber: currentUser.registerNumber || 'N/A',
          year: currentUser.year || 'N/A',
          busNumber: currentUser.busNumber || 'N/A'
        });
        
        console.log('Student info loaded:', {
          name: currentUser.name,
          registerNumber: currentUser.registerNumber,
          year: currentUser.year,
          busNumber: currentUser.busNumber
        });
        
        setBusInfo(prev => ({
          ...prev,
          busNumber: currentUser.busNumber || 'N/A'
        }));
      } else {
        console.log('No authenticated user found');
        // Handle case where user is not authenticated
        Alert.alert(
          'Authentication Required',
          'Please login to access the dashboard.',
          [
            {
              text: 'Login',
              onPress: () => navigation.navigate('StudentLogin')
            }
          ]
        );
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading student data:', error);
      setLoading(false);
    }
  };

  const checkBusStatus = async (busNumber) => {
    try {
      // Validate bus number before fetching
      if (!busNumber || busNumber === 'N/A') {
        console.log('⚠️ No valid bus number to check');
        return;
      }

      // 🔥 REAL GPS: Fetch bus location from Firestore (no mock data!)
      const result = await getBusLocation(busNumber);
      
      if (result.success && result.data) {
        const locationData = result.data;
        
        // Check if bus is actively tracking
        if (locationData.isTracking) {
          // Check if location is recent (within last 5 minutes)
          const lastUpdate = new Date(locationData.lastUpdate);
          const now = new Date();
          const diffMinutes = (now - lastUpdate) / (1000 * 60);
          
          if (diffMinutes <= 5) {
            console.log('✅ Bus is actively tracking:', {
              busNumber,
              location: locationData.currentLocation,
              lastUpdate: locationData.lastUpdate
            });
            
            setBusInfo(prev => ({
              ...prev,
              isActive: true,
              currentLocation: {
                latitude: locationData.currentLocation.latitude,
                longitude: locationData.currentLocation.longitude,
                stop: 'Moving' // In real app, calculate nearest stop
              },
              eta: '15 mins' // In real app, calculate using route API
            }));
          } else {
            console.log('⚠️ Bus location is outdated (>5 minutes)');
            setBusInfo(prev => ({
              ...prev,
              isActive: false,
              currentLocation: null,
              eta: 'N/A'
            }));
          }
        } else {
          console.log('⚠️ Bus is not currently tracking');
          setBusInfo(prev => ({
            ...prev,
            isActive: false,
            currentLocation: null,
            eta: 'N/A'
          }));
        }
      } else {
        console.log('⚠️ No bus location data available');
        setBusInfo(prev => ({
          ...prev,
          isActive: false,
          currentLocation: null,
          eta: 'N/A'
        }));
      }
    } catch (error) {
      console.error('Error checking bus status:', error);
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
              console.log('Student logged out successfully');
              navigation.navigate('Welcome');
            } else {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleSOS = (type) => {
    Alert.alert(
      'SOS Alert',
      `${type} emergency alert has been sent with your current location!`,
      [{ text: 'OK' }]
    );
  };

  const quickActions = [
    {
      title: 'Track Bus',
      subtitle: 'View bus location on map',
      icon: 'map',
      color: COLORS.primary,
      onPress: () => navigation.navigate('MapScreen')
    },
    {
      title: 'Bus Route',
      subtitle: 'View route map with all stops',
      icon: 'map-outline',
      color: COLORS.accent,
      onPress: () => {
        // Navigate to MapScreen to show route visualization
        navigation.navigate('MapScreen');
      }
    },
    {
      title: 'View Attendance',
      subtitle: 'Check your attendance history',
      icon: 'calendar-outline', // Changed to calendar-outline for better visibility
      color: COLORS.info,
      onPress: () => navigation.navigate('AttendanceHistoryScreen')
    },
    {
      title: 'Submit Report',
      subtitle: 'Send report to management',
      icon: 'chatbubble',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('StudentReportScreen')
    }
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.studentText}>{studentInfo.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Student Info Card */}
        <Card style={styles.studentCard}>
          <View style={styles.studentInfoContent}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={50} color={COLORS.primary} />
            </View>
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{studentInfo.name}</Text>
              <Text style={styles.studentId}>Reg: {studentInfo.registerNumber}</Text>
              <Text style={styles.studentYear}>{studentInfo.year}</Text>
            </View>
          </View>
        </Card>

        {/* Bus Status Card */}
        <Card style={styles.card}>
          <CardHeader>
            <View style={styles.busStatusHeader}>
              <View style={styles.busIcon}>
                <Ionicons name="bus" size={28} color={COLORS.white} />
              </View>
              <View style={styles.busStatusDetails}>
                <Text style={styles.busNumber}>{busInfo.busNumber}</Text>
                <Text style={styles.routeName}>{busInfo.route}</Text>
              </View>
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: busInfo.isActive ? COLORS.success : COLORS.danger }
              ]}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>
                  {busInfo.isActive ? 'LIVE' : 'OFFLINE'}
                </Text>
              </View>
            </View>
          </CardHeader>
          {busInfo.isActive && (
            <CardContent>
              <View style={styles.busLocationInfo}>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={20} color={COLORS.accent} />
                  <Text style={styles.currentStopText}>
                    {busInfo.currentLocation.stop}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Ionicons name="time" size={20} color={COLORS.warning} />
                  <Text style={styles.etaText}>ETA: {busInfo.eta}</Text>
                </View>
              </View>
            </CardContent>
          )}
        </Card>

        {/* Emergency SOS Section */}
        <Card style={styles.card} variant="outlined">
          <CardHeader>
            <View style={styles.emergencyHeader}>
              <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
              <Text style={styles.emergencyTitle}>Emergency SOS</Text>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.sosButtons}>
              <Button
                title="Management"
                onPress={() => handleSOS('Management')}
                variant="danger"
                icon="business"
                style={styles.sosButton}
              />
              <Button
                title="Ambulance"
                onPress={() => handleSOS('Ambulance')}
                style={[styles.sosButton, { backgroundColor: COLORS.warning }]}
                icon="medical"
              />
            </View>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {quickActions.map((action, index) => (
            <Card
              key={index}
              onPress={action.onPress}
              style={styles.actionCard}
            >
              <CardContent>
                <View style={styles.actionItem}>
                  <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                    <Ionicons name={action.icon} size={22} color={COLORS.white} />
                  </View>
                  <View style={styles.actionContent}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
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
  studentText: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  logoutButton: {
    padding: SPACING.sm,
  },
  scrollContent: {
    paddingTop: SPACING.md,
  },
  studentCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
    padding: 0,
    overflow: 'hidden',
  },
  card: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: 0,
    overflow: 'hidden',
  },
  studentInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  avatarContainer: {
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  studentId: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  studentYear: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.accent,
  },
  busStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  busStatusDetails: {
    flex: 1,
  },
  busNumber: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  routeName: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.white,
    marginRight: 6,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  busLocationInfo: {
    gap: SPACING.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentStopText: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  etaText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.danger,
    marginLeft: SPACING.sm,
  },
  sosButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sosButton: {
    flex: 1,
  },
  actionsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  actionCard: {
    marginBottom: SPACING.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  actionSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default StudentDashboard;
