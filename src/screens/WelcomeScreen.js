import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bus" size={80} color={COLORS.secondary} />
        <Text style={styles.title}>SIET Bus Tracker</Text>
        <Text style={styles.subtitle}>Track Your College Bus in Real-Time</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.featureCard}>
          <Ionicons name="location" size={40} color={COLORS.secondary} />
          <Text style={styles.featureTitle}>Live Tracking</Text>
          <Text style={styles.featureText}>Track your bus location in real-time</Text>
        </View>

        <View style={styles.featureCard}>
          <Ionicons name="time" size={40} color={COLORS.secondary} />
          <Text style={styles.featureTitle}>ETA Updates</Text>
          <Text style={styles.featureText}>Get estimated arrival times</Text>
        </View>

        <View style={styles.featureCard}>
          <Ionicons name="shield-checkmark" size={40} color={COLORS.secondary} />
          <Text style={styles.featureTitle}>Emergency SOS</Text>
          <Text style={styles.featureText}>Quick emergency assistance</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
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
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  content: {
    flex: 0.4,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
  },
  featureCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginVertical: 5,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: 10,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 5,
  },
  footer: {
    flex: 0.2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  getStartedButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 20,
  },
});

export default WelcomeScreen;
