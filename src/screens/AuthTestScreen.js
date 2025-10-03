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
import { authService } from '../services/authService';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const AuthTestScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState({ students: [], drivers: [] });

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    const user = await authService.getCurrentUser();
    const students = await registeredUsersStorage.getAllStudents();
    const drivers = await registeredUsersStorage.getAllDrivers();
    
    setCurrentUser(user);
    setRegisteredUsers({ students, drivers });
  };

  const handleLogout = async () => {
    const success = await authService.logout();
    if (success) {
      Alert.alert('Success', 'Logged out successfully!');
      setCurrentUser(null);
      navigation.navigate('Welcome');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Authentication Test</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Current User Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Authentication Status</Text>
          {currentUser ? (
            <View style={styles.userCard}>
              <Text style={styles.userName}>Logged in as: {currentUser.name}</Text>
              <Text style={styles.userRole}>Role: {currentUser.role}</Text>
              <Text style={styles.userEmail}>Email: {currentUser.email}</Text>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.notLoggedIn}>Not logged in</Text>
          )}
        </View>

        {/* Registered Students */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registered Students ({registeredUsers.students.length})</Text>
          {registeredUsers.students.map((student, index) => (
            <View key={index} style={styles.userItem}>
              <Text style={styles.itemName}>{student.name}</Text>
              <Text style={styles.itemEmail}>{student.email}</Text>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => Alert.alert('Student Details', `${student.name}\n${student.email}\nBus: ${student.busNumber}`)}
              >
                <Text style={styles.testButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          ))}
          {registeredUsers.students.length === 0 && (
            <Text style={styles.emptyText}>No students registered yet</Text>
          )}
        </View>

        {/* Registered Drivers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registered Drivers ({registeredUsers.drivers.length})</Text>
          {registeredUsers.drivers.map((driver, index) => (
            <View key={index} style={styles.userItem}>
              <Text style={styles.itemName}>{driver.name}</Text>
              <Text style={styles.itemEmail}>{driver.email}</Text>
              <Text style={styles.itemBus}>Bus: {driver.busNumber}</Text>
              <Text style={styles.itemStatus}>
                Status: {driver.authenticated ? 'Authenticated' : 'Not Authenticated'}
              </Text>
              <TouchableOpacity 
                style={styles.testButton}
                onPress={() => Alert.alert('Driver Details', `${driver.name}\n${driver.email}\nBus: ${driver.busNumber}`)}
              >
                <Text style={styles.testButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          ))}
          {registeredUsers.drivers.length === 0 && (
            <Text style={styles.emptyText}>No drivers registered yet</Text>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Test Authentication</Text>
            <Text style={styles.instructionText}>
              1. Register as a student or driver using the signup screens{'\n'}
              2. Login with the registered credentials from the login screens{'\n'}
              3. Use the detail cards above to confirm profile data synced from Firebase
            </Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 15,
  },
  userCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 5,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  notLoggedIn: {
    fontSize: 16,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  userItem: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  itemEmail: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 2,
  },
  itemBus: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 2,
  },
  itemStatus: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  testButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  testButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
});

export default AuthTestScreen;
