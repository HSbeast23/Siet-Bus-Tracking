import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { COLORS, SAMPLE_STOPS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { busStorage } from '../services/storage';
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
    const interval = setInterval(checkBusStatus, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, []);

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
        
        // Check initial bus status
        checkBusStatus(currentUser.busNumber);
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

  const checkBusStatus = async (busNumber = studentInfo.busNumber) => {
    try {
      const busLocationData = await busStorage.getLastLocation();
      
      if (busLocationData && busLocationData.busNumber === busNumber) {
        // Check if location is recent (within last 5 minutes)
        const lastUpdate = new Date(busLocationData.timestamp);
        const now = new Date();
        const diffMinutes = (now - lastUpdate) / (1000 * 60);
        
        if (diffMinutes <= 5) {
          setBusInfo(prev => ({
            ...prev,
            isActive: true,
            currentLocation: {
              latitude: busLocationData.latitude,
              longitude: busLocationData.longitude,
              stop: 'Moving' // In real app, calculate nearest stop
            },
            eta: '15 mins' // In real app, calculate using Bing Maps API
          }));
        } else {
          setBusInfo(prev => ({
            ...prev,
            isActive: false,
            currentLocation: null,
            eta: 'N/A'
          }));
        }
      } else {
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
      subtitle: 'View all stops',
      icon: 'list',
      color: COLORS.accent,
      onPress: () => {
        const stopsList = SAMPLE_STOPS.map((stop, index) => `${index + 1}. ${stop.name}`).join('\n');
        Alert.alert('Route Stops', stopsList);
      }
    },
    {
      title: 'Submit Feedback',
      subtitle: 'Rate your experience',
      icon: 'chatbubble',
      color: COLORS.secondary,
      onPress: () => Alert.alert('Feedback', 'Feedback feature coming soon!')
    },
    {
      title: 'Notifications',
      subtitle: 'View alerts and updates',
      icon: 'notifications',
      color: COLORS.warning,
      onPress: () => Alert.alert('Notifications', 'No new notifications')
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.studentText}>{studentInfo.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out" size={24} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Student Info Card */}
        <View style={styles.studentInfoCard}>
          <View style={styles.studentInfoContent}>
            <Ionicons name="person-circle" size={50} color={COLORS.secondary} />
            <View style={styles.studentDetails}>
              <Text style={styles.studentName}>{studentInfo.name}</Text>
              <Text style={styles.studentId}>{studentInfo.registerNumber}</Text>
              <Text style={styles.studentYear}>{studentInfo.year}</Text>
            </View>
          </View>
        </View>

        {/* Bus Status Card */}
        <View style={styles.busStatusCard}>
          <View style={styles.busStatusHeader}>
            <Ionicons name="bus" size={30} color={COLORS.primary} />
            <View style={styles.busStatusDetails}>
              <Text style={styles.busNumber}>{busInfo.busNumber}</Text>
              <Text style={styles.routeName}>{busInfo.route}</Text>
            </View>
            <View style={[
              styles.statusIndicator, 
              { backgroundColor: busInfo.isActive ? COLORS.success : COLORS.danger }
            ]}>
              <Text style={styles.statusText}>
                {busInfo.isActive ? 'ACTIVE' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          {busInfo.isActive && (
            <View style={styles.busLocationInfo}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={20} color={COLORS.accent} />
                <Text style={styles.currentStopText}>
                  Current: {busInfo.currentLocation.stop}
                </Text>
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="time" size={20} color={COLORS.warning} />
                <Text style={styles.etaText}>ETA: {busInfo.eta}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Emergency SOS Section */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencyTitle}>Emergency SOS</Text>
          <View style={styles.sosButtons}>
            <TouchableOpacity
              style={[styles.sosButton, { backgroundColor: COLORS.danger }]}
              onPress={() => handleSOS('Management')}
            >
              <Ionicons name="business" size={24} color={COLORS.white} />
              <Text style={styles.sosButtonText}>Management</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sosButton, { backgroundColor: COLORS.warning }]}
              onPress={() => handleSOS('Ambulance')}
            >
              <Ionicons name="medical" size={24} color={COLORS.white} />
              <Text style={styles.sosButtonText}>Ambulance</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionItem}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={20} color={COLORS.white} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
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
  studentText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  logoutButton: {
    padding: 10,
  },
  studentInfoCard: {
    backgroundColor: COLORS.white,
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  studentInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentDetails: {
    flex: 1,
    marginLeft: 15,
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  studentId: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 2,
  },
  studentYear: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 2,
  },
  busStatusCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  busStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busStatusDetails: {
    flex: 1,
    marginLeft: 15,
  },
  busNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  routeName: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  busLocationInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentStopText: {
    fontSize: 16,
    color: COLORS.black,
    marginLeft: 10,
  },
  etaText: {
    fontSize: 16,
    color: COLORS.black,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  emergencySection: {
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginBottom: 15,
    textAlign: 'center',
  },
  sosButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  sosButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  actionItem: {
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
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
});

export default StudentDashboard;
