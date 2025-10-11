import React from 'react';
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

const NavigationTestScreen = ({ navigation }) => {
  const testNavigations = [
    { name: 'Login', title: 'Unified Login' },
    { name: 'StudentDashboard', title: 'Student Dashboard' },
    { name: 'DriverDashboard', title: 'Driver Dashboard' },
    { name: 'CoAdminDashboard', title: 'Co-Admin Dashboard' },
    { name: 'ManagementDashboard', title: 'Management Dashboard' },
  ];

  const testNavigation = (screenName, title) => {
    try {
      console.log(`Testing navigation to: ${screenName}`);
      navigation.navigate(screenName);
    } catch (error) {
      console.error(`Navigation error to ${screenName}:`, error);
      Alert.alert(
        'Navigation Error',
        `Failed to navigate to ${title} (${screenName}). Error: ${error.message}`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation Test</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Test All Navigation Routes</Text>
        <Text style={styles.subtitle}>
          Click on any button to test if the navigation route exists and works correctly.
        </Text>

        <View style={styles.buttonContainer}>
          {testNavigations.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.testButton}
              onPress={() => testNavigation(item.name, item.title)}
            >
              <Ionicons name="navigate" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>{item.title}</Text>
              <Text style={styles.routeName}>({item.name})</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            If navigation fails, check the console for error details and verify that the screen 
            name exists in AppNavigator.js
          </Text>
        </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  routeName: {
    color: COLORS.white,
    fontSize: 12,
    opacity: 0.8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    padding: 15,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.gray,
    flex: 1,
    lineHeight: 20,
  },
});

export default NavigationTestScreen;
