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

const StudentSignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    year: '',
    department: '',
    registerNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    busNumber: '',
    phone: ''
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
    if (!formData.year.trim()) newErrors.year = 'Year is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.registerNumber.trim()) newErrors.registerNumber = 'Register number is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.busNumber.trim()) newErrors.busNumber = 'Bus number is required';
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

    setLoading(true);

    try {
      console.log('Starting student registration for:', formData.email.trim());

      const result = await authService.registerStudent({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        registerNumber: formData.registerNumber.trim(),
        year: formData.year.trim(),
        department: formData.department.trim(),
        busNumber: formData.busNumber.trim(),
        phone: formData.phone.trim(),
      });

      setLoading(false);

      if (!result.success) {
        Alert.alert('Registration Failed', result.message || 'Please try again.');
        return;
      }

      Alert.alert(
        'Registration Successful!', 
        'Your account has been created successfully. You can now login with your email and password.',
        [
          {
            text: 'Login Now',
            onPress: () => navigation.navigate('StudentLogin')
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
              <Ionicons name="school" size={60} color={COLORS.white} />
            </View>
            <Text style={styles.title}>Student Registration</Text>
            <Text style={styles.subtitle}>Join SIET Bus Tracking System</Text>
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
              label="Year"
              placeholder="e.g., 1st Year, 2nd Year"
              value={formData.year}
              onChangeText={(value) => handleInputChange('year', value)}
              icon="school-outline"
              error={errors.year}
              editable={!loading}
              autoCapitalize="words"
            />

            <Input
              label="Department"
              placeholder="e.g., CSE, ECE, MECH, CIVIL"
              value={formData.department}
              onChangeText={(value) => handleInputChange('department', value)}
              icon="layers-outline"
              error={errors.department}
              editable={!loading}
              autoCapitalize="characters"
            />

            <Input
              label="Register Number"
              placeholder="Enter register number"
              value={formData.registerNumber}
              onChangeText={(value) => handleInputChange('registerNumber', value)}
              icon="card-outline"
              error={errors.registerNumber}
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
              label="Phone Number (Optional)"
              placeholder="Enter phone number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              icon="call-outline"
              editable={!loading}
              keyboardType="phone-pad"
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
              style={styles.signupButton}
            />

            <View style={styles.loginSection}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Button
                title="Login here"
                onPress={() => navigation.navigate('StudentLogin')}
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
    backgroundColor: COLORS.primary,
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
    textAlign: 'center',
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

export default StudentSignupScreen;
