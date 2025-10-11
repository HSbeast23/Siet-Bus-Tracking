import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/authService';

const AuthenticatedUserDisplay = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await authService.getCurrentUser();
      const authenticated = await authService.isAuthenticated();
      
      setCurrentUser(user);
      setIsAuthenticated(authenticated);
      
      console.log('Current authenticated user:', user);
      console.log('Is authenticated:', authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const navigateToDashboard = () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please login first');
      return;
    }

    if (currentUser.role === 'student') {
      navigation.navigate('StudentDashboard');
    } else if (currentUser.role === 'driver') {
      navigation.navigate('DriverDashboard');
    } else {
      navigation.navigate('ManagementDashboard');
    }
  };

  const handleLogout = async () => {
    const success = await authService.logout();
    if (success) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      Alert.alert('Success', 'Logged out successfully!');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Authentication Status</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Authentication Status</Text>
          
          {isAuthenticated && currentUser ? (
            <View style={styles.userInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{currentUser.name}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{currentUser.email}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Role:</Text>
                <Text style={[styles.value, styles.roleValue]}>{currentUser.role.toUpperCase()}</Text>
              </View>
              
              {currentUser.role === 'student' && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Register Number:</Text>
                    <Text style={styles.value}>{currentUser.registerNumber}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Year:</Text>
                    <Text style={styles.value}>{currentUser.year}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Bus Number:</Text>
                    <Text style={styles.value}>{currentUser.busNumber}</Text>
                  </View>
                </>
              )}
              
              {currentUser.role === 'driver' && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Bus Number:</Text>
                    <Text style={styles.value}>{currentUser.busNumber}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>License:</Text>
                    <Text style={styles.value}>{currentUser.licenseNumber}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>Phone:</Text>
                    <Text style={styles.value}>{currentUser.phone}</Text>
                  </View>
                </>
              )}
              
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.statusText}>Authenticated</Text>
              </View>
            </View>
          ) : (
            <View style={styles.notAuthenticated}>
              <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
              <Text style={styles.notAuthText}>Not Authenticated</Text>
              <Text style={styles.notAuthSubText}>Please login to view user information</Text>
            </View>
          )}
        </View>

        {isAuthenticated && currentUser && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.dashboardButton} onPress={navigateToDashboard}>
              <Ionicons name="dashboard" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Go to Dashboard</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isAuthenticated && (
          <View style={styles.loginButtons}>
            <TouchableOpacity 
              style={styles.loginButton} 
                onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Student Login</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.loginButton} 
                onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Driver Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
    textAlign: 'center',
  },
  userInfo: {
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  roleValue: {
    color: COLORS.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.success,
    fontWeight: 'bold',
  },
  notAuthenticated: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  notAuthText: {
    fontSize: 18,
    color: COLORS.danger,
    fontWeight: 'bold',
    marginTop: 10,
  },
  notAuthSubText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 0.48,
    justifyContent: 'center',
  },
  loginButtons: {
    gap: 15,
  },
  loginButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default AuthenticatedUserDisplay;
