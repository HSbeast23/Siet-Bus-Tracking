import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/authService';
import { Button, Input } from '../components/ui';

const DriverLoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await authService.loginDriver(email.trim(), password.trim());
      
      setLoading(false);
      
      if (result.success) {
        Alert.alert(
          'Login Successful!', 
          `Welcome back, ${result.user.name}! You are now authenticated.`,
          [
            {
              text: 'Continue',
              onPress: () => navigation.navigate('DriverDashboard')
            }
          ]
        );
      } else {
        Alert.alert('Login Failed', result.message);
      }
      
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
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
            <Text style={styles.title}>Driver Portal</Text>
            <Text style={styles.subtitle}>Welcome back, driver!</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              icon="mail-outline"
              keyboardType="email-address"
              error={errors.email}
              editable={!loading}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              secureTextEntry={true}
              error={errors.password}
              editable={!loading}
            />

            <Button
              title="Login"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              icon="log-in-outline"
              size="lg"
              style={styles.loginButton}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Create New Account"
              onPress={() => navigation.navigate('DriverSignup')}
              variant="outline"
              fullWidth
              icon="person-add-outline"
              disabled={loading}
            />
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
    paddingBottom: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: COLORS.secondary,
    marginTop: SPACING.lg,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.gray,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  loginButton: {
    marginTop: SPACING.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  dividerText: {
    fontFamily: FONTS.medium,
    marginHorizontal: SPACING.md,
    color: COLORS.gray,
    fontSize: 14,
  },
});

export default DriverLoginScreen;
