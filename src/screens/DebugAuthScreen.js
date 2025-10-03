import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/authService';
import { registeredUsersStorage } from '../services/registeredUsersStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DebugAuthScreen = ({ navigation }) => {
  const [students, setStudents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [testEmail, setTestEmail] = useState('test@student.com');
  const [testPassword, setTestPassword] = useState('123456');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allStudents = await registeredUsersStorage.getAllStudents();
      const allDrivers = await registeredUsersStorage.getAllDrivers();
      const user = await authService.getCurrentUser();
      
      setStudents(allStudents);
      setDrivers(allDrivers);
      setCurrentUser(user);
      
      console.log('Loaded students:', allStudents);
      console.log('Loaded drivers:', allDrivers);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const clearAllData = async () => {
    try {
  await registeredUsersStorage.clearAllData();
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('currentUser');
      
      setStudents([]);
      setDrivers([]);
      setCurrentUser(null);
      
      Alert.alert('Success', 'All data cleared!');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  const createTestStudent = async () => {
    try {
      const result = await authService.registerStudent({
        name: 'Test Student',
        email: testEmail,
        password: testPassword,
        registerNumber: 'CS21001',
        year: '2nd Year',
        busNumber: 'SIET-001',
        phone: '9876543210',
      });

      if (!result.success) {
        Alert.alert('Error', result.message || 'Failed to create test student');
        return;
      }

      await loadData();
      Alert.alert('Success', 'Test student created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create test student: ' + error.message);
    }
  };

  const createTestDriver = async () => {
    try {
      const result = await authService.registerDriver({
        name: 'Test Driver',
        email: 'test@driver.com',
        password: '123456',
        busNumber: 'SIET-002',
        phone: '9876543211',
        licenseNumber: 'DL123456',
      });

      if (!result.success) {
        Alert.alert('Error', result.message || 'Failed to create test driver');
        return;
      }

      await loadData();
      Alert.alert('Success', 'Test driver created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create test driver: ' + error.message);
    }
  };

  const testStudentLogin = async () => {
    try {
      const result = await authService.loginStudent(testEmail, testPassword);
      if (result.success) {
        Alert.alert('Login Success', `Welcome ${result.user.name}!`);
        await loadData();
      } else {
        Alert.alert('Login Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Login test failed: ' + error.message);
    }
  };

  const testDriverLogin = async () => {
    try {
      const result = await authService.loginDriver('test@driver.com', '123456');
      if (result.success) {
        Alert.alert('Login Success', `Welcome ${result.user.name}!`);
        await loadData();
      } else {
        Alert.alert('Login Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Login test failed: ' + error.message);
    }
  };

  const logout = async () => {
    const success = await authService.logout();
    if (success) {
      setCurrentUser(null);
      Alert.alert('Success', 'Logged out!');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Debug Authentication</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Current User */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current User</Text>
          {currentUser ? (
            <View style={styles.userInfo}>
              <Text style={styles.infoText}>Name: {currentUser.name}</Text>
              <Text style={styles.infoText}>Email: {currentUser.email}</Text>
              <Text style={styles.infoText}>Role: {currentUser.role}</Text>
              <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.infoText}>Not logged in</Text>
          )}
        </View>

        {/* Test Login Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={testEmail}
            onChangeText={setTestEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={testPassword}
            onChangeText={setTestPassword}
            secureTextEntry
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.testBtn} onPress={testStudentLogin}>
              <Text style={styles.testBtnText}>Test Student Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testBtn} onPress={testDriverLogin}>
              <Text style={styles.testBtnText}>Test Driver Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={createTestStudent}>
            <Text style={styles.actionBtnText}>Create Test Student</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={createTestDriver}>
            <Text style={styles.actionBtnText}>Create Test Driver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={loadData}>
            <Text style={styles.actionBtnText}>Refresh Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={clearAllData}>
            <Text style={styles.actionBtnText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Registered Students */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registered Students ({students.length})</Text>
          {students.map((student, index) => (
            <View key={index} style={styles.userCard}>
              <Text style={styles.cardTitle}>{student.name}</Text>
              <Text style={styles.cardText}>Email: {student.email}</Text>
              <Text style={styles.cardText}>Register#: {student.registerNumber}</Text>
              <Text style={styles.cardText}>Bus: {student.busNumber}</Text>
            </View>
          ))}
        </View>

        {/* Registered Drivers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registered Drivers ({drivers.length})</Text>
          {drivers.map((driver, index) => (
            <View key={index} style={styles.userCard}>
              <Text style={styles.cardTitle}>{driver.name}</Text>
              <Text style={styles.cardText}>Email: {driver.email}</Text>
              <Text style={styles.cardText}>Bus: {driver.busNumber}</Text>
              <Text style={styles.cardText}>License: {driver.licenseNumber}</Text>
              <Text style={styles.cardText}>Auth: {driver.authenticated ? 'Yes' : 'No'}</Text>
            </View>
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
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 10,
  },
  userInfo: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 10,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.secondary,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 10,
    flex: 0.48,
  },
  testBtnText: {
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  actionBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  dangerBtn: {
    backgroundColor: COLORS.danger,
  },
  actionBtnText: {
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  logoutText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  userCard: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  cardText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 2,
  },
});

export default DebugAuthScreen;
