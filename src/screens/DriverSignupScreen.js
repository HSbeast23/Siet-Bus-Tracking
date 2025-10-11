import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '../components/ui';
import { authService } from '../services/authService';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const DriverSignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    busNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    licenseNumber: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.busNumber.trim()) newErrors.busNumber = 'Bus number is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      const busNumberUpper = formData.busNumber.trim().toUpperCase();

      const existingDriver = await registeredUsersStorage.getDriverByBusNumber(busNumberUpper);
      if (existingDriver) {
        Alert.alert('Error', 'This bus number is already assigned to another driver. Please contact administration.');
        setLoading(false);
        return;
      }

      const result = await authService.registerDriver({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        busNumber: busNumberUpper,
        phone: formData.phone.trim(),
        licenseNumber: formData.licenseNumber.trim(),
      });

      setLoading(false);

      if (!result.success) {
        Alert.alert('Registration Failed', result.message || 'Please try again.');
        return;
      }

      Alert.alert(
        'Registration Successful!', 
        'Your driver account has been created successfully. You can now login with your email and password.',
        [
          {
            text: 'Login Now',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );

    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Registration failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="car" size={60} color={COLORS.white} />
            </View>
            <Text style={styles.title}>Driver Registration</Text>
            <Text style={styles.subtitle}>Join our driver community</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              icon="person-outline"
              error={errors.name}
              editable={!loading}
              autoCapitalize="words"
            />

            <Input
              label="Bus Number"
              placeholder="e.g., SIET-001"
              value={formData.busNumber}
              onChangeText={(value) => handleInputChange('busNumber', value)}
              icon="bus-outline"
              error={errors.busNumber}
              editable={!loading}
              autoCapitalize="characters"
            />

            <Input
              label="Email Address"
              placeholder="your.email@example.com"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              icon="mail-outline"
              error={errors.email}
              editable={!loading}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Input
              label="Phone Number (Optional)"
              placeholder="Enter phone number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              icon="call-outline"
              editable={!loading}
              keyboardType="phone-pad"
            />

            <Input
              label="License Number (Optional)"
              placeholder="Enter license number"
              value={formData.licenseNumber}
              onChangeText={(value) => handleInputChange('licenseNumber', value)}
              icon="card-outline"
              editable={!loading}
              autoCapitalize="characters"
            />

            <Input
              label="Password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              icon="lock-closed-outline"
              secureTextEntry={true}
              error={errors.password}
              editable={!loading}
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              icon="lock-closed-outline"
              secureTextEntry={true}
              error={errors.confirmPassword}
              editable={!loading}
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              fullWidth
              icon="checkmark-circle-outline"
              size="lg"
              variant="secondary"
              style={styles.signupButton}
            />

            <View style={styles.loginSection}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Button
                title="Login here"
                onPress={() => navigation.navigate('Login')}
                variant="outline"
                size="sm"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  form: {
    flex: 1,
    gap: SPACING.md,
  },
  signupButton: {
    marginTop: SPACING.md,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  loginText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
});

export default DriverSignupScreen;
