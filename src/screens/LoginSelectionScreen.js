import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const LoginSelectionScreen = ({ navigation }) => {
  const loginOptions = [
    {
      title: 'Management',
      subtitle: 'Admin Portal',
      icon: 'settings',
      color: COLORS.secondary,
      onPress: () => navigation.navigate('ManagementLogin')
    },
    {
      title: 'Driver',
      subtitle: 'Driver Portal',
      icon: 'car',
      color: COLORS.accent,
      onPress: () => navigation.navigate('DriverLogin')
    },
    {
      title: 'Student',
      subtitle: 'Student Portal',
      icon: 'school',
      color: COLORS.primary,
      onPress: () => navigation.navigate('StudentLogin')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>Select how you want to access the system</Text>
      </View>

      <View style={styles.content}>
        {loginOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.optionCard, { borderLeftColor: option.color }]}
            onPress={option.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                <Ionicons name={option.icon} size={30} color={COLORS.white} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.secondary} />
          <Text style={styles.backText}>Back to Welcome</Text>
        </TouchableOpacity>
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
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  optionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    marginVertical: 10,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 5,
  },
  optionSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backText: {
    fontSize: 16,
    color: COLORS.secondary,
    marginLeft: 5,
  },
});

export default LoginSelectionScreen;
